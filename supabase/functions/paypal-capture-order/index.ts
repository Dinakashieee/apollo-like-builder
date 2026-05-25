import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { addMonths, getPayPalAccessToken, getPayPalBase, getPayPalEnv, getPayPalPlan } from '../_shared/paypal.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== 'string') {
      return new Response(JSON.stringify({ error: 'orderId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = await getPayPalAccessToken();
    const r = await fetch(`${getPayPalBase()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('PayPal capture error:', data);
      const issue = data?.details?.[0]?.issue ?? data?.name ?? 'PAYMENT_FAILED';
      const message = issue === 'INSTRUMENT_DECLINED'
        ? 'Your card was declined by PayPal. Please use another card or PayPal account and try again.'
        : issue === 'PAYER_ACTION_REQUIRED'
          ? 'PayPal needs you to confirm extra information before this payment can be completed.'
          : 'Payment could not be completed by PayPal. Please try again or use another payment method.';
      return new Response(JSON.stringify({
        ok: false,
        issue,
        message,
        recoverable: issue === 'INSTRUMENT_DECLINED',
        error: data,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // SECURITY: derive plan ONLY from the order's custom_id set at create time.
    let plan;
    let custom: { userId?: string; planId?: string; workspaceId?: string; quantity?: number } = {};
    try {
      const customRaw = data?.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id
        ?? data?.purchase_units?.[0]?.custom_id
        ?? '{}';
      custom = JSON.parse(customRaw);
      if (custom.userId && custom.userId !== u.user.id) {
        return new Response(JSON.stringify({ error: 'Order does not belong to this user' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      plan = getPayPalPlan(custom.planId);
    } catch {
      return new Response(JSON.stringify({ error: 'Could not resolve plan from order' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const capturedAt = new Date();
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const payerId = data?.payer?.payer_id ?? 'paypal';
    const payerEmail = data?.payer?.email_address ?? u.user.email ?? 'paypal-buyer';

    if (plan.isAddon) {
      const workspaceId = custom.workspaceId;
      if (!workspaceId) {
        return new Response(JSON.stringify({ error: 'workspaceId missing in order' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Verify caller owns the workspace
      const { data: ws } = await admin
        .from('workspaces')
        .select('id, owner_id')
        .eq('id', workspaceId)
        .maybeSingle();
      if (!ws || ws.owner_id !== u.user.id) {
        return new Response(JSON.stringify({ error: 'Not authorized for this workspace' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const qty = Math.max(1, Math.min(99, Number(custom.quantity ?? 1) || 1));
      const { error: addonErr } = await admin.from('workspace_addons').upsert({
        workspace_id: workspaceId,
        user_id: u.user.id,
        paddle_subscription_id: `paypal:${orderId}`,
        paddle_customer_id: `paypal:${payerId}:${payerEmail}`,
        product_id: plan.productId,
        price_id: plan.priceId,
        quantity: qty,
        status: 'active',
        current_period_start: capturedAt.toISOString(),
        current_period_end: addMonths(capturedAt, plan.intervalMonths).toISOString(),
        environment: getPayPalEnv(),
        updated_at: capturedAt.toISOString(),
      }, { onConflict: 'paddle_subscription_id' });
      if (addonErr) throw addonErr;

      return new Response(JSON.stringify({ ok: true, planId: plan.priceId, addon: true, ...data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: dbError } = await admin.from('subscriptions').upsert({
      user_id: u.user.id,
      paddle_subscription_id: `paypal:${orderId}`,
      paddle_customer_id: `paypal:${payerId}:${payerEmail}`,
      product_id: plan.productId,
      price_id: plan.priceId,
      status: 'active',
      current_period_start: capturedAt.toISOString(),
      current_period_end: addMonths(capturedAt, plan.intervalMonths).toISOString(),
      environment: getPayPalEnv(),
      updated_at: capturedAt.toISOString(),
    }, { onConflict: 'paddle_subscription_id' });
    if (dbError) throw dbError;

    return new Response(JSON.stringify({ ok: true, planId: plan.priceId, ...data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('capture-order error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
