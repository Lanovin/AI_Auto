import Link from 'next/link';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { isStripeConfigured } from '@/lib/stripe/config';
import PricingPlans from '@/components/pricing-plans';

export const metadata = { title: 'Ceník — tokeny' };
export const dynamic = 'force-dynamic';

interface ProfileRow {
  stripe_customer_id?: string | null;
  tokens_balance?: number | null;
}

export default async function CenikPage() {
  const stripeReady = isStripeConfigured();

  let isAuthenticated = false;
  let profile: ProfileRow | null = null;

  if (hasSupabaseEnv()) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        isAuthenticated = true;
        const { data } = await supabase
          .from('profiles')
          .select('stripe_customer_id, tokens_balance')
          .eq('id', user.id)
          .maybeSingle();
        profile = (data as ProfileRow | null) ?? null;
      }
    } catch {
      // Supabase down — render unauthenticated
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-paper" id="main">
        {/* Karty tokenů — centrované */}
        <section className="px-5.5 pt-14 pb-20 md:px-8 md:pt-20">
          <div className="mx-auto max-w-200 text-center">
            <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-brass">
              Ceník
            </span>
            <h1 className="cargent-h1 mx-auto mt-5 max-w-[16ch] text-[36px] md:text-[50px]">
              Kupte tokeny a <i>oceňujte</i>
            </h1>

            {isAuthenticated && profile?.tokens_balance != null ? (
              <p className="mt-5 text-[14px] text-dim">
                Váš aktuální zůstatek:{' '}
                <span className="cargent-mono font-medium text-ink">
                  {profile.tokens_balance} tokenů
                </span>
              </p>
            ) : !isAuthenticated ? (
              <p className="mt-5 text-[14px] text-dim">
                <Link href="/prihlaseni?next=/cenik" className="cargent-link font-medium text-brass">
                  Přihlaste se
                </Link>{' '}
                nebo{' '}
                <Link href="/registrace" className="cargent-link font-medium text-brass">
                  zaregistrujte
                </Link>{' '}
                a kupujte tokeny přímo.
              </p>
            ) : null}

            <div className="mx-auto mt-10 max-w-130 text-left">
              <PricingPlans
                isAuthenticated={isAuthenticated}
                stripeReady={stripeReady}
                activeSubscriptions={{ dealer: false, monitoring: false }}
                hasStripeCustomer={Boolean(profile?.stripe_customer_id)}
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5.5 py-20 text-center md:px-8">
          <div className="mx-auto max-w-310">
            <h2 className="cargent-h2 text-[28px]">Připraveni oceňovat?</h2>
            <p className="mt-3 text-[15px] text-ink-soft">
              Registrace zdarma, tokeny připsány okamžitě po platbě přes Stripe.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href={isAuthenticated ? '/odhad-ceny' : '/registrace'}
                className="rounded-md bg-brass px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {isAuthenticated ? 'Spustit odhad ceny' : 'Začít zdarma'}
              </Link>
              <Link
                href="/kontakt"
                className="rounded-md border border-line-2 bg-surface px-7 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                Kontaktovat nás
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
