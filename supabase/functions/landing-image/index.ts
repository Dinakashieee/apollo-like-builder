import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { generateImage, GatewayError } from 'npm:@lovable.dev/ai-gateway@0.1.10';
import type {} from '../_shared/generated/models.d.ts';
import { z } from 'npm:zod@3.25.76';

const schema = z.object({ workspace_id: z.string().uuid(), prompt: z.string().trim().min(5).max(2000), size: z.enum(['1536x1024', '1024x1024']).default('1536x1024') });
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !anon || !key) return reply({ error: 'Image creation is unavailable.' }, 503);
    const client = createClient(url, anon, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return reply({ error: 'Sign in to create an image.' }, 401);
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return reply({ error: 'Enter a description between 5 and 2,000 characters.' }, 400);
    const admin = createClient(url, key);
    const { workspace_id, prompt, size } = parsed.data;
    const { data: member, error: memberError } = await admin.from('workspace_members').select('id').eq('workspace_id', workspace_id).eq('user_id', user.id).maybeSingle();
    if (memberError || !member) return reply({ error: 'Workspace access required.' }, 403);
    const { data: reserved, error: quotaError } = await admin.rpc('reserve_landing_image_credit', { _workspace_id: workspace_id });
    if (quotaError) return reply({ error: 'Unable to check your AI allowance.' }, 503);
    if (!reserved) return reply({ error: 'Your monthly AI allowance is used up. View plans for more.' }, 429);
    const image = await generateImage({ model: 'openai/gpt-image-2.5-sunburst', prompt, size, n: 1, quality: 'medium', output_format: 'jpeg' });
    const encoded = image.data?.[0]?.b64_json;
    if (!encoded) return reply({ error: 'No image was returned. Your description is preserved.' }, 502);
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    const path = `${workspace_id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await admin.storage.from('landing-assets').upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) return reply({ error: 'Your image could not be saved.' }, 500);
    const { data: signed, error: signedError } = await admin.storage.from('landing-assets').createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signedError || !signed) return reply({ error: 'Your image link could not be created.' }, 500);
    return reply({ url: signed.signedUrl });
  } catch (error) {
    const status = error instanceof GatewayError && error.httpStatus === 402 ? 402 : 500;
    return reply({ error: status === 402 ? 'Image creation credits are currently unavailable.' : 'Image creation failed. Your description is preserved; please try later.' }, status);
  }
});