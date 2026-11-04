import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.25.76';

// Public intake for ad-platform lead forms (via Zapier/Make/webhooks). Authorised only by an unguessable token.
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const PLATFORMS = ['linkedin', 'facebook', 'tiktok', 'google', 'other'] as const;
const str = (max: number) => z.preprocess((v) => (v == null || v === '' ? undefined : String(v).trim().slice(0, max)), z.string().optional());

const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of Object.keys(o)) if (keys.includes(k.toLowerCase().replace(/[\s-]/g, '_'))) { const v = o[k]; if (v != null && v !== '') return v; }
  return undefined;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Use POST' }, 405);
  try {
    const url = new URL(req.url);
    const text = await req.text();
    if (text.length > 20000) return respond({ error: 'Payload too large' }, 413);
    let body: Record<string, unknown> = {};
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('application/x-www-form-urlencoded')) body = Object.fromEntries(new URLSearchParams(text));
    else if (text) { try { const j = JSON.parse(text); if (j && typeof j === 'object' && !Array.isArray(j)) body = j; } catch { return respond({ error: 'Invalid JSON' }, 400); } }

    const token = z.string().regex(/^[a-f0-9]{36}$/).safeParse(url.searchParams.get('token') ?? body.token);
    if (!token.success) return respond({ error: 'Missing or invalid token' }, 401);

    const first = pick(body, ['first_name', 'firstname']); const last = pick(body, ['last_name', 'lastname']);
    const lead = z.object({ full_name: str(200), email: str(320).refine((e) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e), 'Invalid email'), phone: str(40), company: str(200), message: str(4000) }).safeParse({
      full_name: pick(body, ['full_name', 'name', 'fullname']) ?? ([first, last].filter(Boolean).join(' ') || undefined),
      email: pick(body, ['email', 'email_address', 'work_email']),
      phone: pick(body, ['phone', 'phone_number', 'mobile']),
      company: pick(body, ['company', 'company_name', 'organization']),
      message: pick(body, ['message', 'notes', 'comments']),
    });
    if (!lead.success) return respond({ error: lead.error.flatten().fieldErrors }, 400);
    if (!lead.data.email && !lead.data.phone && !lead.data.full_name) return respond({ error: 'Send at least a name, email or phone' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    let campaign: { id: string; workspace_id: string } | null = null;
    const { data: byCampaign } = await admin.from('ad_campaigns').select('id, workspace_id').eq('intake_token', token.data).maybeSingle();
    if (byCampaign) campaign = byCampaign;
    else {
      const { data: ws } = await admin.from('workspace_lead_intake').select('workspace_id').eq('token', token.data).maybeSingle();
      if (!ws) return respond({ error: 'Unknown token' }, 401);
      const platformRaw = String(pick(body, ['platform', 'source']) ?? 'other').toLowerCase();
      const platform = (PLATFORMS as readonly string[]).includes(platformRaw) ? platformRaw : 'other';
      const name = String(pick(body, ['campaign', 'campaign_name', 'form_name']) ?? 'Untitled campaign').trim().slice(0, 200) || 'Untitled campaign';
      const { data: existing } = await admin.from('ad_campaigns').select('id, workspace_id, name').eq('workspace_id', ws.workspace_id).eq('platform', platform).ilike('name', name.replace(/[%_\\]/g, '\\$&'));
      campaign = existing?.[0] ?? null;
      if (!campaign) {
        const { data: created, error } = await admin.from('ad_campaigns').insert({ workspace_id: ws.workspace_id, name, platform, auto_created: true }).select('id, workspace_id').single();
        if (error) {
          const { data: retry } = await admin.from('ad_campaigns').select('id, workspace_id').eq('workspace_id', ws.workspace_id).eq('platform', platform).ilike('name', name.replace(/[%_\\]/g, '\\$&'));
          campaign = retry?.[0] ?? null;
          if (!campaign) throw error;
        } else campaign = created;
      }
    }
    const { data: row, error } = await admin.from('ad_campaign_leads').insert({ ...lead.data, workspace_id: campaign.workspace_id, campaign_id: campaign.id, raw: body }).select('id').single();
    if (error) throw error;
    return respond({ ok: true, id: row.id });
  } catch (e) {
    console.error('campaign-lead-intake', e);
    return respond({ error: 'Could not save lead' }, 500);
  }
});
