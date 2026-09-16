import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { PLANS, isPlanKey, type PlanKey } from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  // Fallback na konfiguraci plánu — kdyby metadata chyběla / byla poškozená.
  const bonusTokens =
    Number.isFinite(bonusTokensRaw) && bonusTokensRaw > 0
      ? bonusTokensRaw
      : planKey ? PLANS[planKey].bonusTokens : 0;
  return { supabaseUserId, planKey, bonusTokens };
}

/**
 * Idempotence: vloží event_id. Vrací true, když už byl event zpracován.
 * Při chybě handleru se řádek zase smaže (viz unmarkEvent), aby Stripe retry
 * mohlo proběhnout — jinak by se tokeny při dočasném výpadku DB nikdy nepřipsaly.
 */
async function markEventProcessed(eventId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  try {
    const { error } = await admin.from('stripe_webhook_events').insert({ event_id: eventId });
    if (error) {
      if (error.code === '23505') return true; // duplicate
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

async function unmarkEvent(eventId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from('stripe_webhook_events').delete().eq('event_id', eventId);
}

async function grantTokens(userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase admin not configured — cannot grant tokens.');
  const { error } = await admin.rpc('add_tokens', { p_user_id: userId, p_amount: amount });
  if (error) throw new Error(`add_tokens RPC failed: ${error.message}`);
}

/** Uloží stav předplatného na profil (sloupce dealer_subscription_* z migrace 0001_stripe). */
async function updateSubscriptionRow(userId: string, subscription: Stripe.Subscription): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const periodEnd =
    typeof subscription.current_period_end === 'number'
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  const { error } = await admin
    .from('profiles')
    .update({
      dealer_subscription_id: subscription.id,
      dealer_subscription_status: subscription.status,
      dealer_subscription_until: periodEnd,
    })
    .eq('id', userId);
  if (error) throw new Error(`profiles update failed: ${error.message}`);
}

async function resolveUserIdByCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data } = await admin.from('profiles').select('id').eq('stripe_customer_id', customerId).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
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

  const alreadyProcessed = await markEventProcessed(event.id);
  if (alreadyProcessed) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      // async_payment_succeeded: platební metody s odloženým zúčtováním
      // (bankovní převod apod.) — session.completed přijde s payment_status
      // 'unpaid' a tokeny se připíší až tady. Idempotence hlídá stripe_webhook_events.
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = readMetadata(session.metadata);
        const userId = meta.supabaseUserId
          ?? await resolveUserIdByCustomer(typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null);

        if (!userId || !meta.planKey) {
          console.error('[stripe/webhook] checkout.session.completed missing metadata', session.id);
          break;
        }

        if (session.mode === 'subscription' && session.subscription) {
          // U předplatného připisuje tokeny invoice.payment_succeeded (první i další cykly)
          // — tady jen uložíme stav, ať se nepřipíše dvakrát.
          const stripe = getStripe();
          const subscriptionId =
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await updateSubscriptionRow(userId, subscription);
          break;
        }

        if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
          await grantTokens(userId, meta.bonusTokens);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        if (!invoice.subscription) break;

        const stripe = getStripe();
        const subscriptionId =
          typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription.id;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const meta = readMetadata(subscription.metadata);
        const userId = meta.supabaseUserId
          ?? await resolveUserIdByCustomer(typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id ?? null);

        if (!userId) {
          console.error('[stripe/webhook] invoice.payment_succeeded: user not resolved', subscription.id);
          break;
        }

        await grantTokens(userId, meta.bonusTokens || PLANS.predplatne.bonusTokens);
        await updateSubscriptionRow(userId, subscription);
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const meta = readMetadata(subscription.metadata);
        const userId = meta.supabaseUserId
          ?? await resolveUserIdByCustomer(typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id ?? null);
        if (!userId) break;
        await updateSubscriptionRow(userId, subscription);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error('[stripe/webhook] handler error (event will be retried):', err);
    await unmarkEvent(event.id);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
