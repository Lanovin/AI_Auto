import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { getStripe } from '@/lib/stripe/server';
import {
  PLANS,
  getAppOrigin,
  getPriceId,
  isStripeConfigured,
  type PlanKey,
} from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidPlanKey(value: unknown): value is PlanKey {
  return value === 'balicek_1000' || value === 'balicek_2000' || value === 'balicek_5000';
}

/**
 * POST /api/stripe/checkout
 * Body: { plan: 'balicek_1000' | 'balicek_2000' | 'balicek_5000' }
 *
 * Creates a Stripe Checkout session and returns its URL. The client redirects
 * the user there. After payment, Stripe redirects back to /predplatne?status=...
 * and the webhook is the authoritative source for granting access.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: 'Pro nákup je nutné se nejdřív přihlásit. Supabase auth není nastavena.' },
      { status: 503 },
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe není nastaven. Doplňte STRIPE_SECRET_KEY a STRIPE_PRICE_BALICEK_* do .env.local.' },
      { status: 503 },
    );
  }

  let body: { plan?: unknown };
  try {
    body = (await request.json()) as { plan?: unknown };
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 });
  }

  if (!isValidPlanKey(body.plan)) {
    return NextResponse.json({ error: 'Neznámý plán.' }, { status: 400 });
  }

  const plan = PLANS[body.plan];
  const priceId = getPriceId(plan.key);
  if (!priceId) {
    return NextResponse.json(
      { error: `Pro plán "${plan.label}" chybí Stripe Price ID.` },
      { status: 503 },
    );
  }

  // Require Supabase user — we tie the Stripe customer to the auth.users.id
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Pro nákup se musíte přihlásit.' },
      { status: 401 },
    );
  }

  const stripe = getStripe();
  const origin = getAppOrigin();

  // Reuse existing Stripe customer if we have one on the profile row.
  // The webhook keeps stripe_customer_id in sync.
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('stripe_customer_id, full_name, company_name')
    .eq('id', user.id)
    .maybeSingle();

  const profile = profileRow as
    | { stripe_customer_id?: string | null; full_name?: string | null; company_name?: string | null }
    | null;

  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.company_name || profile?.full_name || undefined,
      metadata: {
        supabase_user_id: user.id,
      },
    });
    customerId = customer.id;

    // Best-effort persist — never block checkout if this fails
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
  }

  const successUrl = `${origin}/predplatne?status=success&plan=${plan.key}`;
  const cancelUrl = `${origin}/predplatne?status=cancelled`;

  const grantMeta = {
    supabase_user_id: user.id,
    plan_key: plan.key,
    bonus_tokens: String(plan.bonusTokens),
  };

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: plan.mode,
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: 'cs',
    metadata: grantMeta,
    ...(plan.mode === 'subscription'
      ? { subscription_data: { metadata: grantMeta } }
      : { payment_intent_data: { metadata: grantMeta } }),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    return NextResponse.json(
      { error: 'Stripe nevrátil URL na checkout. Zkuste to znovu.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ url: session.url });
}
