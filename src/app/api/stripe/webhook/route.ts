import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { type PlanKey } from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Stripe sends raw bodies — we MUST read the request as text (not JSON) so the
// signature verification can rebuild the same byte sequence Stripe signed.

function isPlanKey(value: unknown): value is PlanKey {
  return value === 'dealer' || value === 'monitoring' || value === 'tokens_test';
}

interface ChargeMetadata {
  supabaseUserId: string | null;
  planKey: PlanKey | null;
  bonusTokens: number;
}

function readMetadata(meta: Stripe.Metadata | null | undefined): ChargeMetadata {
  const raw = meta ?? {};
  const supabaseUserId =
    typeof raw.supabase_user_id === 'string' && raw.supabase_user_id ? raw.supabase_user_id : null;
  const planKey = isPlanKey(raw.plan_key) ? raw.plan_key : null;
  const bonusTokensRaw = Number(raw.bonus_tokens);
  const bonusTokens = Number.isFinite(bonusTokensRaw) && bonusTokensRaw > 0 ? bonusTokensRaw : 0;

  return { supabaseUserId, planKey, bonusTokens };
}

/**
 * Adds tokens to a user's profile via the add_tokens RPC.
 * The RPC is defined in supabase/migrations/0001_stripe_integration.sql.
 */
async function grantTokens(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;

  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[stripe/webhook] Supabase admin not configured — cannot grant tokens.');
    return;
  }

  const { error } = await admin.rpc('add_tokens', { p_user_id: userId, p_amount: amount });
  if (error) {
    console.error('[stripe/webhook] add_tokens RPC failed:', error.message);
  }
}

/**
 * Updates the subscription tracking fields on profiles for a given plan.
 * For one-time `tokens_test` purchases, no subscription fields are touched.
 */
async function updateSubscriptionRow(
  userId: string,
  planKey: PlanKey,
  subscription: Stripe.Subscription,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[stripe/webhook] Supabase admin not configured — cannot update profile.');
    return;
  }

  const periodEnd =
    typeof subscription.current_period_end === 'number'
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  const update: Record<string, unknown> = {};
  if (planKey === 'dealer') {
    update.dealer_subscription_id = subscription.id;
    update.dealer_subscription_status = subscription.status;
    update.dealer_subscription_until = periodEnd;
  } else if (planKey === 'monitoring') {
    update.monitoring_subscription_id = subscription.id;
    update.monitoring_subscription_status = subscription.status;
    update.monitoring_subscription_until = periodEnd;
  } else {
    return; // tokens_test → not a subscription
  }

  const { error } = await admin.from('profiles').update(update).eq('id', userId);
  if (error) {
    console.error('[stripe/webhook] profiles update failed:', error.message);
  }
}

/**
 * Marks a subscription as cancelled on the profile. Tokens already granted stay.
 */
async function markSubscriptionCanceled(
  userId: string,
  planKey: PlanKey,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const update: Record<string, unknown> = {};
  if (planKey === 'dealer') update.dealer_subscription_status = 'canceled';
  else if (planKey === 'monitoring') update.monitoring_subscription_status = 'canceled';
  else return;

  const { error } = await admin.from('profiles').update(update).eq('id', userId);
  if (error) {
    console.error('[stripe/webhook] cancel update failed:', error.message);
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook není nakonfigurován (chybí STRIPE_WEBHOOK_SECRET nebo podpis).' },
      { status: 400 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[stripe/webhook] signature verification failed:', message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Initial payment success — grants tokens immediately for both
        // subscription and one-time payments. For subscriptions, we additionally
        // wire up the subscription row.
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = readMetadata(session.metadata);

        if (!meta.supabaseUserId || !meta.planKey) {
          console.error('[stripe/webhook] checkout.session.completed missing metadata', session.id);
          break;
        }

        // Grant initial tokens
        await grantTokens(meta.supabaseUserId, meta.bonusTokens);

        // If subscription, also pull the subscription object to set status/period
        if (session.mode === 'subscription' && session.subscription) {
          const stripe = getStripe();
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await updateSubscriptionRow(meta.supabaseUserId, meta.planKey, subscription);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        // Recurring renewal — add monthly bonus tokens. Skip the first invoice
        // because checkout.session.completed already handled it (billing_reason
        // is 'subscription_create' for first, 'subscription_cycle' for renewals).
        const invoice = event.data.object as Stripe.Invoice;

        if (invoice.billing_reason !== 'subscription_cycle') break;
        if (!invoice.subscription) break;

        const stripe = getStripe();
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const meta = readMetadata(subscription.metadata);

        if (!meta.supabaseUserId || !meta.planKey) {
          console.error('[stripe/webhook] renewal missing metadata', subscription.id);
          break;
        }

        await grantTokens(meta.supabaseUserId, meta.bonusTokens);
        await updateSubscriptionRow(meta.supabaseUserId, meta.planKey, subscription);
        break;
      }

      case 'customer.subscription.updated': {
        // Status change (paused, past_due, ...). Keep our profile row in sync.
        const subscription = event.data.object as Stripe.Subscription;
        const meta = readMetadata(subscription.metadata);
        if (!meta.supabaseUserId || !meta.planKey) break;
        await updateSubscriptionRow(meta.supabaseUserId, meta.planKey, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const meta = readMetadata(subscription.metadata);
        if (!meta.supabaseUserId || !meta.planKey) break;
        await markSubscriptionCanceled(meta.supabaseUserId, meta.planKey);
        break;
      }

      default:
        // No-op: Stripe sends many event types; we only react to the four above.
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err);
    // Return 500 so Stripe retries — but only for our own bugs, not validation.
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
