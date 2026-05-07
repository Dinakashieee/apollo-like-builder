import { getPayPalEnv } from '../_shared/paypal.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve((req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? '';
  return new Response(JSON.stringify({ clientId, environment: getPayPalEnv() }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
