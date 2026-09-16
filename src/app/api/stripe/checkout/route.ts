import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { getStripe } from '@/lib/stripe/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  PLANS,
  getAppOrigin,
  getPriceId,
  isPlanKey,
  isStripeConfigured,
} from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/checkout
 * Body: { plan: PlanKey }
 *
 * Creates a Stripe Checkout session and returns its URL. After payment Stripe
 * redirects back to /cenik?status=... and the webhook grants the tokens.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'Přihlášení není nastavené (Supabase).' }, { status: 503 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Platby zatím nejsou nastavené. Zkuste to později.' }, { status: 503 });
  }

  let body: { plan?: unknown };
  try {
    body = (await request.json()) as { plan?: unknown };
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 });
  }

  if (!isPlanKey(body.plan)) {
    return NextResponse.json({ error: 'Neznámý plán.' }, { status: 400 });
  }

  const plan = PLANS[body.plan];
  const priceId = getPriceId(plan.key);
  if (!priceId) {
    return NextResponse.json({ error: `Plán „${plan.label}“ zatím není k dispozici.` }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Pro nákup se musíte přihlásit.', code: 'unauthenticated' }, { status: 401 });
  }

  const stripe = getStripe();
  const origin = getAppOrigin(request);

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('stripe_customer_id, full_name, company_name, dealer_subscription_status')
    .eq('id', user.id)
    .maybeSingle();

  const profile = profileRow as
    | {
        stripe_customer_id?: string | null;
        full_name?: string | null;
        company_name?: string | null;
        dealer_subscription_status?: string | null;
      }
    | null;

  if (plan.mode === 'subscription' && (profile?.dealer_subscription_status === 'active' || profile?.dealer_subscription_status === 'trialing')) {
    return NextResponse.json(
      { error: 'Předplatné už máte aktivní. Spravovat ho můžete v zákaznickém portálu.' },
      { status: 409 },
    );
  }

  let customerId = profile?.stripe_customer_id ?? null;

  if (customerId) {
    // Zákazník mohl být smazán ve Stripe (test → live) — ověř, jinak založ nového.
    try {
      const existing = await stripe.customers.retrieve(customerId);
      if ((existing as { deleted?: boolean }).deleted) customerId = null;
    } catch {
      customerId = null;
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: profile?.company_name || profile?.full_name || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    // stripe_customer_id smí zapisovat jen server (migrace 0010 odebrala
    // uživatelům právo měnit tento sloupec) → service-role klient.
    const admin = getSupabaseAdmin();
    const writer = admin ?? supabase;
    const { error: linkError } = await writer
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', user.id);
    if (linkError) {
      console.error('[stripe/checkout] nepodařilo se uložit stripe_customer_id:', linkError.message);
    }
  }

  const successUrl = `${origin}/cenik?status=success&plan=${plan.key}`;
  const cancelUrl = `${origin}/cenik?status=cancelled`;

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
    allow_promotion_codes: true,
    ...(plan.mode === 'subscription'
      ? { subscription_data: { metadata: grantMeta } }
      : { payment_intent_data: { metadata: grantMeta, description: `Cargent — ${plan.label} (${plan.bonusTokens} tokenů)` } }),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    return NextResponse.json({ error: 'Stripe nevrátil URL na checkout. Zkuste to znovu.' }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
