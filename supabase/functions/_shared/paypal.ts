// Shared PayPal helpers for edge functions.
// Reads credentials and environment from secure backend env vars.
// Supports sandbox/live switching via PAYPAL_ENV.

export type PayPalEnv = 'sandbox' | 'live';

export function getPayPalEnv(): PayPalEnv {
  const raw = (Deno.env.get('PAYPAL_ENV') ?? 'live').toLowerCase().trim();
  return raw === 'sandbox' ? 'sandbox' : 'live';
}

export function getPayPalBase(): string {
  return getPayPalEnv() === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
}

export function getPayPalCredentials() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  // Prefer the new secret name, fall back to legacy PAYPAL_SECRET.
  const clientSecret =
    Deno.env.get('PAYPAL_CLIENT_SECRET') ?? Deno.env.get('PAYPAL_SECRET');
  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }
  return { clientId, clientSecret };
}

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getPayPalCredentials();
  const auth = btoa(`${clientId}:${clientSecret}`);
  const r = await fetch(`${getPayPalBase()}/v1/oauth2/token`, {
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
