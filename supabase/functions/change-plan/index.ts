import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function resolvePaddlePriceId(externalId: string, env: PaddleEnv): Promise<string> {
  const r = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(externalId)}`);
  const json = await r.json();
  if (!json.data?.length) throw new Error(`Price not found: ${externalId}`);
  return json.data[0].id;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { newPriceId, environment, action } = await req.json();
    const env = (environment || 'sandbox') as PaddleEnv;

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userData.user.id)
      .eq('environment', env)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return new Response(JSON.stringify({ error: 'No subscription found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paddle = getPaddleClient(env);

    if (action === 'cancel') {
      // Cancel at end of period (effective_from defaults to next_billing_period)
      await paddle.subscriptions.cancel(sub.paddle_subscription_id, { effectiveFrom: 'next_billing_period' });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'change' && newPriceId) {
      const paddlePriceId = await resolvePaddlePriceId(newPriceId, env);
      await paddle.subscriptions.update(sub.paddle_subscription_id, {
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        prorationBillingMode: 'prorated_immediately',
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('change-plan error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
