import Link from 'next/link';
import Header from '@/components/landing/Header';
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

const TOKEN_COSTS = [
  { action: 'Rychlá cena', tokens: 1, desc: 'Orientační cena vozidla ze 3 zdrojů' },
  { action: 'Standardní analýza', tokens: 3, desc: 'Cena + doporučení + srovnání trhu' },
  { action: 'Detailní posudek', tokens: 8, desc: 'Hloubková analýza, rizika, faktory' },
  { action: 'Expertní posudek', tokens: 15, desc: 'Maximální detail, kompletní strategie' },
];

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

      <main className="min-h-screen bg-paper">
        {/* Hero */}
        <section className="bg-[linear-gradient(180deg,#F4F8FD_0%,#FFFFFF_60%)] px-5.5 pb-16 pt-16 md:px-8">
          <div className="mx-auto max-w-310 text-center">
            <span className="inline-flex rounded-full border border-brass/20 bg-brass/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-widest text-brass">
              Ceník
            </span>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-ink md:text-[52px]">
              100 tokenů každý měsíc,<br className="hidden sm:block" /> bez překvapení
            </h1>
            <p className="mx-auto mt-5 max-w-[52ch] text-[17px] leading-relaxed text-ink/60">
              Měsíční předplatné za 1 000 Kč. Každý měsíc dostanete 100 tokenů —
              nevyčerpané se převádějí, platnost bez omezení.
            </p>

            {isAuthenticated && profile?.tokens_balance != null ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-brass/20 bg-brass/10 px-5 py-2.5 text-[14px] font-medium text-brass">
                Váš aktuální zůstatek: <strong>{profile.tokens_balance} tokenů</strong>
              </div>
            ) : !isAuthenticated ? (
              <div className="mt-6 flex items-center justify-center gap-3 text-[14px] text-ink/60">
                <Link href="/prihlaseni?next=/cenik" className="font-medium text-brass underline underline-offset-2 hover:text-brass-2">
                  Přihlaste se
                </Link>
                {' '}nebo{' '}
                <Link href="/registrace" className="font-medium text-brass underline underline-offset-2 hover:text-brass-2">
                  zaregistrujte
                </Link>
                {' '}a kupujte tokeny přímo.
              </div>
            ) : null}
          </div>
        </section>

        {/* Balíček + spotřeba */}
        <section className="px-5.5 pb-20 md:px-8">
          <div className="mx-auto max-w-310">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">

              {/* Balíček tokenů */}
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-brass">Předplatné</p>
                <h2 className="mt-2 text-[26px] font-bold tracking-tight text-ink">Aktivujte přístup</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink/60">
                  100 tokenů měsíčně za 1 000 Kč. Tokeny připsány okamžitě po první platbě přes Stripe.
                </p>

                <div className="mt-6">
                  <PricingPlans
                    isAuthenticated={isAuthenticated}
                    stripeReady={stripeReady}
                    activeSubscriptions={{ dealer: false, monitoring: false }}
                    hasStripeCustomer={Boolean(profile?.stripe_customer_id)}
                  />
                </div>
              </div>

              {/* Kolik stojí co */}
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-brass">Spotřeba</p>
                <h2 className="mt-2 text-[26px] font-bold tracking-tight text-ink">Kolik stojí každá akce</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ink/60">
                  Tokeny se odečítají podle hloubky analýzy. Jednoduché ocenění vyjde na 1 token,
                  expertní posudek na 15.
                </p>

                <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
                  {TOKEN_COSTS.map((item, i) => (
                    <div
                      key={item.action}
                      className={`flex items-center justify-between gap-4 px-5 py-4 ${
                        i < TOKEN_COSTS.length - 1 ? 'border-b border-line' : ''
                      }`}
                    >
                      <div>
                        <p className="text-[15px] font-medium text-ink">{item.action}</p>
                        <p className="mt-0.5 text-[13px] text-ink/50">{item.desc}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 rounded-full bg-brass/10 px-3 py-1 text-[13px] font-semibold text-brass">
                          {item.tokens} {item.tokens === 1 ? 'token' : 'tokenů'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl border border-emerald/20 bg-emerald/5 px-5 py-4">
                  <p className="text-[13px] leading-relaxed text-ink/70">
                    <strong className="text-ink">Příklad:</strong> Za 100 tokenů (1 000 Kč/měs) zvládnete
                    100× rychlou cenu, nebo 12× detailní posudek, nebo 6× expertní analýzu —
                    nebo libovolnou kombinaci.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-line bg-surface px-5.5 py-16 md:px-8">
          <div className="mx-auto max-w-310">
            <p className="text-[12px] font-semibold uppercase tracking-widest text-brass">Časté otázky</p>
            <h2 className="mt-2 text-[28px] font-bold tracking-tight text-ink">Máte otázky?</h2>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {[
                {
                  q: 'Expirují tokeny?',
                  a: 'Ne. Zakoupené tokeny platí bez časového omezení — použijete je, až budete potřebovat.',
                },
                {
                  q: 'Jak probíhá platba?',
                  a: 'Přes zabezpečený Stripe checkout. Akceptujeme všechny běžné karty. Cargent nevidí číslo vaší karty.',
                },
                {
                  q: 'Dostanu fakturu?',
                  a: 'Ano. Po nákupu vám přijde potvrzení od Stripe. Faktury si stáhnete kdykoli v zákaznickém portálu.',
                },
                {
                  q: 'Co když mám technický problém?',
                  a: 'Napište nám na stránce Kontakt. Odpovídáme do 24 hodin v pracovní dny.',
                },
              ].map(({ q, a }) => (
                <div key={q} className="rounded-2xl border border-line bg-white p-5">
                  <p className="text-[15px] font-semibold text-ink">{q}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink/60">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5.5 py-16 text-center md:px-8">
          <div className="mx-auto max-w-310">
            <h2 className="text-[28px] font-bold tracking-tight text-ink">Připraveni oceňovat?</h2>
            <p className="mt-3 text-[15px] text-ink/60">
              Registrace zdarma, první tokeny obdržíte ihned po aktivaci předplatného.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={isAuthenticated ? '/odhad-ceny' : '/registrace'}
                className="rounded-full bg-brass px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2"
              >
                {isAuthenticated ? 'Spustit odhad ceny' : 'Začít zdarma'}
              </Link>
              <Link
                href="/kontakt"
                className="rounded-full border border-line px-7 py-3.5 text-[15px] font-medium text-ink/70 transition-colors hover:border-ink/20 hover:text-ink"
              >
                Kontaktovat nás
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
