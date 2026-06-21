import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { type PlanKey } from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isPlanKey(value: unknown): value is PlanKey {
  return (
    value === 'balicek_500' ||
    value === 'balicek_1000' ||
    value === 'balicek_2000' ||
    value === 'balicek_5000'
  );
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
 * Returns true if this event was already processed (idempotency guard).
 * Inserts the event ID on first call; returns false if table doesn't exist yet
 * so the webhook still works before the migration is run.
 */
async function markEventProcessed(eventId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  try {
    const { error } = await admin
      .from('stripe_webhook_events')
      .insert({ event_id: eventId });

    if (error) {
      // Unique constraint violation = duplicate event
      if (error.code === '23505') return true;
      // Table doesn't exist yet (migration not run) — log and continue
      if (error.code === '42P01') {
        console.warn('[stripe/webhook] stripe_webhook_events table missing — run migration 0007');
        return false;
      }
      console.error('[stripe/webhook] idempotency insert error:', error.message);
    }
    return false;
  } catch {
    return false;
  }
}

async function grantTokens(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[stripe/webhook] Supabase admin not configured — cannot grant tokens.');
    return;
  }
  const { error } = await admin.rpc('add_tokens', { p_user_id: userId, p_amount: amount });
  if (error) console.error('[stripe/webhook] add_tokens RPC failed:', error.message);
}

async function updateSubscriptionRow(
  userId: string,
  planKey: PlanKey,
  subscription: Stripe.Subscription,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const periodEnd =
    typeof subscription.current_period_end === 'number'
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  const update: Record<string, unknown> = {};
  if (planKey === 'dealer' as string) {
    update.dealer_subscription_id = subscription.id;
    update.dealer_subscription_status = subscription.status;
    update.dealer_subscription_until = periodEnd;
  } else if (planKey === 'monitoring' as string) {
    update.monitoring_subscription_id = subscription.id;
    update.monitoring_subscription_status = subscription.status;
    update.monitoring_subscription_until = periodEnd;
  } else {
    return;
  }

  const { error } = await admin.from('profiles').update(update).eq('id', userId);
  if (error) console.error('[stripe/webhook] profiles update failed:', error.message);
}

async function markSubscriptionCanceled(userId: string, planKey: PlanKey): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const update: Record<string, unknown> = {};
  if (planKey === 'dealer' as string) update.dealer_subscription_status = 'canceled';
  else if (planKey === 'monitoring' as string) update.monitoring_subscription_status = 'canceled';
  else return;

  const { error } = await admin.from('profiles').update(update).eq('id', userId);
  if (error) console.error('[stripe/webhook] cancel update failed:', error.message);
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

  // Idempotency: skip already-processed events (Stripe can retry on 5xx)
  const alreadyProcessed = await markEventProcessed(event.id);
  if (alreadyProcessed) {
    console.log('[stripe/webhook] duplicate event skipped:', event.id);
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = readMetadata(session.metadata);

        if (!meta.supabaseUserId || !meta.planKey) {
          console.error('[stripe/webhook] checkout.session.completed missing metadata', session.id);
          break;
        }

        await grantTokens(meta.supabaseUserId, meta.bonusTokens);

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
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', err);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
