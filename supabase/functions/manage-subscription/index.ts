import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, gatewayFetch, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, environment } = await req.json();
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

    if (action === 'resume') {
      // Reverse a scheduled cancellation by clearing scheduled_change.
      // Paddle SDK exposes this via update with scheduledChange: null.
      const r = await gatewayFetch(env, `/subscriptions/${sub.paddle_subscription_id}`, {
        method: 'PATCH',
        body: JSON.stringify({ scheduled_change: null }),
      });
      if (!r.ok) {
        const err = await r.text();
        return new Response(JSON.stringify({ error: 'Could not resume', detail: err }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'portal') {
      // Create a customer portal session for managing payment methods.
      const portal = await paddle.customerPortalSessions.create(
        sub.paddle_customer_id,
        [sub.paddle_subscription_id]
      );
      const subEntry = portal.urls.subscriptions?.find(
        (s: any) => s.id === sub.paddle_subscription_id
      );
      return new Response(JSON.stringify({
        general: portal.urls.general.overview,
        updatePayment: subEntry?.updatePaymentMethod ?? portal.urls.general.overview,
        cancel: subEntry?.cancelSubscription ?? portal.urls.general.overview,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('manage-subscription error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
