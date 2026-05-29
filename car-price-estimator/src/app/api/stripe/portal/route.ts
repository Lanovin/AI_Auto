import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { getStripe } from '@/lib/stripe/server';
import { getAppOrigin, isStripeConfigured } from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/portal
 *
 * Generates a Stripe Customer Portal session for the current user so they can
 * update payment method, cancel subscription, view invoices. Requires a
 * previously created Stripe customer (stripe_customer_id on profiles).
 */
export async function POST() {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { error: 'Supabase auth není nastavena.' },
      { status: 503 },
    );
  }
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe není nastaven (chybí STRIPE_SECRET_KEY nebo Price IDs).' },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nejste přihlášeni.' }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const profile = profileRow as { stripe_customer_id?: string | null } | null;
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Nemáte zatím žádné placené předplatné. Nejdřív si pořiďte plán.' },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getAppOrigin()}/dashboard`,
    locale: 'cs',
  });

  return NextResponse.json({ url: session.url });
}
