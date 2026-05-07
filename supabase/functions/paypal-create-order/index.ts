import { getPayPalAccessToken, getPayPalBase } from '../_shared/paypal.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const description: string = body.description ?? 'EngageIQ Plan';
    const amount: string = String(body.amount ?? '1.00');
    const currency: string = (body.currency ?? 'USD').toUpperCase();

    if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = await getPayPalAccessToken();
    const r = await fetch(`${getPayPalBase()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        application_context: {
          brand_name: 'EngageIQ',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'PAY_NOW',
        },
        purchase_units: [{
          amount: { currency_code: currency, value: amount },
          description,
        }],
      }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('PayPal create order error:', data);
      return new Response(JSON.stringify({ error: data }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('create-order error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
