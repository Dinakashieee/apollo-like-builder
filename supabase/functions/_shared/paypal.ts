// Shared PayPal helpers for edge functions.
// Reads credentials and environment from secure backend env vars.
// Supports sandbox/live switching via PAYPAL_ENV.

export type PayPalEnv = 'sandbox' | 'live';
export type PayPalPlanId =
  | 'starter_monthly'
  | 'starter_yearly'
  | 'growth_monthly'
  | 'growth_yearly'
  | 'scale_monthly'
  | 'scale_yearly'
  | 'addon_seat_monthly'
  | 'addon_credits_1k_monthly'
  | 'addon_credits_5k_monthly'
  | 'addon_leads_100_monthly';

const PAYPAL_PLANS: Record<PayPalPlanId, {
  amount: string;
  currency: 'USD';
  description: string;
  productId: string;
  priceId: string;
  intervalMonths: number;
  isAddon?: boolean;
}> = {
  starter_monthly: { amount: '19.00', currency: 'USD', description: 'EngageIQ Starter Plan - monthly', productId: 'starter_plan', priceId: 'starter_monthly', intervalMonths: 1 },
  starter_yearly: { amount: '182.40', currency: 'USD', description: 'EngageIQ Starter Plan - yearly', productId: 'starter_plan', priceId: 'starter_yearly', intervalMonths: 12 },
  growth_monthly: { amount: '39.00', currency: 'USD', description: 'EngageIQ Growth Plan - monthly', productId: 'growth_plan', priceId: 'growth_monthly', intervalMonths: 1 },
  growth_yearly: { amount: '374.40', currency: 'USD', description: 'EngageIQ Growth Plan - yearly', productId: 'growth_plan', priceId: 'growth_yearly', intervalMonths: 12 },
  scale_monthly: { amount: '79.00', currency: 'USD', description: 'EngageIQ Scale Plan - monthly', productId: 'scale_plan', priceId: 'scale_monthly', intervalMonths: 1 },
  scale_yearly: { amount: '758.40', currency: 'USD', description: 'EngageIQ Scale Plan - yearly', productId: 'scale_plan', priceId: 'scale_yearly', intervalMonths: 12 },
  addon_leads_100_monthly: { amount: '8.00', currency: 'USD', description: 'EngageIQ Add-on: +100 Leads / month', productId: 'addon_leads_100', priceId: 'addon_leads_100_monthly', intervalMonths: 1, isAddon: true },
  addon_seat_monthly: { amount: '8.00', currency: 'USD', description: 'EngageIQ Add-on: Extra User Seat / month', productId: 'addon_seat', priceId: 'addon_seat_monthly', intervalMonths: 1, isAddon: true },
  addon_credits_1k_monthly: { amount: '15.00', currency: 'USD', description: 'EngageIQ Add-on: +1,000 AI Credits / month', productId: 'addon_credits_1k', priceId: 'addon_credits_1k_monthly', intervalMonths: 1, isAddon: true },
  addon_credits_5k_monthly: { amount: '59.00', currency: 'USD', description: 'EngageIQ Add-on: +5,000 AI Credits / month', productId: 'addon_credits_5k', priceId: 'addon_credits_5k_monthly', intervalMonths: 1, isAddon: true },
};

export function getPayPalPlan(planId: unknown) {
  if (typeof planId !== 'string' || !(planId in PAYPAL_PLANS)) {
    throw new Error('Invalid PayPal plan');
  }
  return PAYPAL_PLANS[planId as PayPalPlanId];
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

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
