import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return _supabase;
}

async function sendWelcomeEmail(userId: string, planName: string) {
  try {
    const { data: userRes } = await getSupabase().auth.admin.getUserById(userId);
    const email = userRes?.user?.email;
    if (!email) return;
    // Best-effort: log so we have an audit trail. A real provider can be wired later.
    console.log('Welcome email queued:', { userId, email, planName });
  } catch (e) {
    console.error('sendWelcomeEmail failed:', e);
  }
}

const ADDON_PRODUCT_IDS = new Set(['addon_seat', 'addon_credits_1k', 'addon_credits_5k']);

async function upsertAddonSubscription(
  data: any,
  env: PaddleEnv,
  userId: string,
  productId: string,
  priceId: string,
  quantity: number,
) {
  // Find a workspace owned by this user (add-ons attach to the owner's workspace)
  const { data: ws } = await getSupabase()
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .limit(1)
    .maybeSingle();
  if (!ws?.id) {
    console.warn('No workspace for addon purchase', { userId });
    return;
  }
  const { id, customerId, status, currentBillingPeriod, scheduledChange } = data;
  await getSupabase().from('workspace_addons').upsert({
    workspace_id: ws.id,
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    quantity: quantity || 1,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === 'cancel',
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'paddle_subscription_id' });
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;

  const userId = customData?.userId;
  if (!userId) {
    console.error('No userId in customData');
    return;
  }

  const item = items[0];
  const priceId = item.price.importMeta?.externalId;
  const productId = item.product.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn('Skipping subscription: missing importMeta.externalId', {
      rawPriceId: item.price.id,
      rawProductId: item.product.id,
    });
    return;
  }

  // Route add-on purchases to workspace_addons; main plans go to subscriptions.
  if (ADDON_PRODUCT_IDS.has(productId)) {
    await upsertAddonSubscription(data, env, userId, productId, priceId, item.quantity ?? 1);
    return;
  }

  await getSupabase().from('subscriptions').upsert({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status: status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    environment: env,
    updated_at: new Date().toISOString(),
  }, {
    onConflict: 'paddle_subscription_id',
  });

  // Welcome email on first activation
  await sendWelcomeEmail(userId, productId);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;

  const item = items?.[0];
  const priceId = item?.price?.importMeta?.externalId;
  const productId = item?.product?.importMeta?.externalId;

  // Add-on update path
  if (productId && ADDON_PRODUCT_IDS.has(productId)) {
    const update: Record<string, unknown> = {
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === 'cancel',
      updated_at: new Date().toISOString(),
    };
    if (typeof item?.quantity === 'number') update.quantity = item.quantity;
    if (priceId) update.price_id = priceId;
    if (productId) update.product_id = productId;
    await getSupabase().from('workspace_addons')
      .update(update)
      .eq('paddle_subscription_id', id)
      .eq('environment', env);
    return;
  }

  const update: Record<string, unknown> = {
    status: status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    cancel_at_period_end: scheduledChange?.action === 'cancel',
    updated_at: new Date().toISOString(),
  };
  if (priceId) update.price_id = priceId;
  if (productId) update.product_id = productId;

  await getSupabase().from('subscriptions')
    .update(update)
    .eq('paddle_subscription_id', id)
    .eq('environment', env);
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  // Try add-ons first; if no row matches, fall through to main subscriptions.
  const addonRes = await getSupabase().from('workspace_addons')
    .update({
      status: 'canceled',
      current_period_end: data.currentBillingPeriod?.endsAt ?? data.canceledAt,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env)
    .select('id');
  if (addonRes.data && addonRes.data.length > 0) return;

  await getSupabase().from('subscriptions')
    .update({
      status: 'canceled',
      current_period_end: data.currentBillingPeriod?.endsAt ?? data.canceledAt,
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);
}

async function notifyTransaction(data: any, env: PaddleEnv, kind: 'success' | 'failed') {
  try {
    const userId = data?.customData?.userId;
    if (!userId) return;

    // Find any workspace the user belongs to so the notification is visible.
    const { data: ws } = await getSupabase()
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (!ws?.workspace_id) return;

    const isSuccess = kind === 'success';
    await getSupabase().from('notifications').insert({
      workspace_id: ws.workspace_id,
      user_id: userId,
      title: isSuccess ? 'Payment received' : 'Payment failed',
      body: isSuccess
        ? 'Your subscription payment was processed successfully.'
        : 'We could not charge your card. Please update your payment method to avoid losing access.',
      link: '/app/settings',
    });
  } catch (e) {
    console.error('notifyTransaction failed:', e);
  }
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env);
      break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionCompleted:
      await notifyTransaction(event.data, env, 'success');
      break;
    case EventName.TransactionPaymentFailed:
      await notifyTransaction(event.data, env, 'failed');
      break;
    default:
      console.log('Unhandled event:', event.eventType);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
