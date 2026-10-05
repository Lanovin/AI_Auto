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

type ClaimResult = 'claimed' | 'duplicate' | 'untracked';

/**
 * Idempotency guard: claims the event ID before processing. If processing
 * then fails, releaseEvent() removes the claim so Stripe's retry is handled
 * again (instead of being skipped as a duplicate and losing the tokens).
 * Returns 'untracked' when the table is unavailable — the event is still
 * processed, just without duplicate protection.
 */
async function claimEvent(eventId: string): Promise<ClaimResult> {
  const admin = getSupabaseAdmin();
  if (!admin) return 'untracked';

  try {
    const { error } = await admin
      .from('stripe_webhook_events')
      .insert({ event_id: eventId });

    if (!error) return 'claimed';
    // Unique constraint violation = duplicate event
    if (error.code === '23505') return 'duplicate';
    if (error.code === '42P01') {
      console.warn('[stripe/webhook] stripe_webhook_events table missing — run migration 0007');
    } else {
      console.error('[stripe/webhook] idempotency insert error:', error.message);
    }
    return 'untracked';
  } catch (err) {
    console.error('[stripe/webhook] idempotency insert threw:', err);
    return 'untracked';
  }
}

async function releaseEvent(eventId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  const { error } = await admin.from('stripe_webhook_events').delete().eq('event_id', eventId);
  if (error) console.error('[stripe/webhook] releasing event claim failed:', eventId, error.message);
}

/** Credits purchased tokens. Throws on failure → 500 → Stripe retries the event. */
async function grantTokens(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase admin not configured — cannot grant tokens.');
  const { error } = await admin.rpc('add_tokens', { p_user_id: userId, p_amount: amount });
  if (error) throw new Error(`add_tokens RPC failed for ${userId}: ${error.message}`);
}

/** Grants the tokens of a paid one-time checkout (sync or async payment). */
async function fulfillCheckout(session: Stripe.Checkout.Session): Promise<void> {
  const meta = readMetadata(session.metadata);
  if (!meta.supabaseUserId || !meta.planKey) {
    console.error('[stripe/webhook] checkout session missing metadata', session.id);
    return;
  }
  // Async methods (bank transfer…) complete the session as 'unpaid' and send
  // checkout.session.async_payment_succeeded once the money arrives.
  if (session.payment_status !== 'paid') {
    console.log('[stripe/webhook] checkout not paid yet, waiting:', session.id, session.payment_status);
    return;
  }
  await grantTokens(meta.supabaseUserId, meta.bonusTokens);
}

/**
 * Takes back tokens of a refunded / disputed token pack. `returnedFraction` is the
 * cumulative share of the payment that was returned (0–1). Already revoked
 * tokens are tracked in the PaymentIntent metadata (`tokens_revoked`), so
 * repeated partial refunds only revoke the difference. Balance never goes
 * below 0 (revoke_tokens, migration 0009) — spent tokens can't be returned.
 */
async function revokeTokensForPayment(paymentIntentId: string, returnedFraction: number): Promise<void> {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase admin not configured — cannot revoke tokens.');

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const meta = readMetadata(paymentIntent.metadata);
  if (!meta.supabaseUserId || meta.bonusTokens <= 0) {
    console.warn('[stripe/webhook] refund/dispute for payment without token metadata:', paymentIntentId);
    return;
  }

  const fraction = Math.min(Math.max(returnedFraction, 0), 1);
  const target = Math.round(meta.bonusTokens * fraction);
  const alreadyRevoked = Number(paymentIntent.metadata?.tokens_revoked) || 0;
  const toRevoke = target - alreadyRevoked;
  if (toRevoke <= 0) return;

  // Metadata first: if the revoke then fails we under-revoke (logged, fixable
  // by admin) rather than risk revoking twice on a retry.
  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: { tokens_revoked: String(target) },
  });

  const { error } = await admin.rpc('revoke_tokens', {
    p_user_id: meta.supabaseUserId,
    p_amount: toRevoke,
  });
  if (error) {
    console.error(
      '[stripe/webhook] MANUAL FIX NEEDED — revoke_tokens failed:',
      { userId: meta.supabaseUserId, toRevoke, paymentIntentId, error: error.message },
    );
    return;
  }
  console.log('[stripe/webhook] revoked', toRevoke, 'tokens from', meta.supabaseUserId, 'for', paymentIntentId);
}

function paymentIntentId(value: string | Stripe.PaymentIntent | null): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
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
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }

  // Idempotency: skip already-processed events (Stripe can retry on 5xx)
  const claim = await claimEvent(event.id);
  if (claim === 'duplicate') {
    console.log('[stripe/webhook] duplicate event skipped:', event.id);
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        await fulfillCheckout(session);

        const meta = readMetadata(session.metadata);
        if (
          event.type === 'checkout.session.completed' &&
          meta.supabaseUserId && meta.planKey &&
          session.mode === 'subscription' && session.subscription
        ) {
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

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const piId = paymentIntentId(charge.payment_intent);
        if (!piId || charge.amount <= 0) break;
        await revokeTokensForPayment(piId, charge.amount_refunded / charge.amount);
        break;
      }

      case 'charge.dispute.created': {
        // Chargeback: peníze jsou zadržené, tokeny odebereme celé.
        const dispute = event.data.object as Stripe.Dispute;
        const piId = paymentIntentId(dispute.payment_intent);
        if (!piId) break;
        await revokeTokensForPayment(piId, 1);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error:', event.type, event.id, err);
    if (claim === 'claimed') await releaseEvent(event.id);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
