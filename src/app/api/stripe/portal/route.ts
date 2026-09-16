import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { getStripe } from '@/lib/stripe/server';
import { getAppOrigin } from '@/lib/stripe/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/stripe/portal
 * Zákaznický portál Stripe — faktury, platební metoda, zrušení předplatného.
 */
export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'Přihlášení není nastavené (Supabase).' }, { status: 503 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Platby zatím nejsou nastavené.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nejste přihlášeni.', code: 'unauthenticated' }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const profile = profileRow as { stripe_customer_id?: string | null } | null;
  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Zatím jste nic nekoupili — portál se otevře po první platbě.' },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${getAppOrigin(request)}/dashboard`,
    locale: 'cs',
  });

  return NextResponse.json({ url: session.url });
}
