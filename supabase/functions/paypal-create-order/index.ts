const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAYPAL_BASE = 'https://api-m.paypal.com';

async function getAccessToken() {
  const id = Deno.env.get('PAYPAL_CLIENT_ID');
  const secret = Deno.env.get('PAYPAL_SECRET');
  if (!id || !secret) throw new Error('PayPal credentials not configured');
  const auth = btoa(`${id}:${secret}`);
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const d = await r.json();
  if (!r.ok) throw new Error(`PayPal auth failed: ${JSON.stringify(d)}`);
  return d.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { description = 'EngageIQ Starter Plan (monthly)' } = await req.json().catch(() => ({}));
    const amount = '4.00';
    const token = await getAccessToken();
    const r = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
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
          amount: { currency_code: 'USD', value: amount },
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
