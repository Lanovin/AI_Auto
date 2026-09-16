import Link from 'next/link';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import PricingPlans from '@/components/pricing-plans';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { getAvailablePlanKeys, isPlanKey, isStripeConfigured, type PlanKey } from '@/lib/stripe/config';
import { getTokenPricing } from '@/lib/tokens-server';
import { ESTIMATOR_TIERS, TOKEN_COST_LABELS, TOKEN_VALUE_CZK, formatTokens, type TokenFeature } from '@/lib/tokens';

export const metadata = {
  title: 'Ceník',
  description: 'Kolik stojí ocenění vozu: úrovně ocenění v tokenech a balíčky tokenů od 500 Kč.',
};
export const dynamic = 'force-dynamic';

interface ProfileRow {
  stripe_customer_id?: string | null;
  tokens_balance?: number | null;
  dealer_subscription_status?: string | null;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const DEALER_FEATURES: TokenFeature[] = ['popisky:generate', 'monitor:scan', 'scout:search'];

export default async function CenikPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const statusRaw = Array.isArray(params.status) ? params.status[0] : params.status;
  const initialStatus = statusRaw === 'success' || statusRaw === 'cancelled' ? statusRaw : null;
  const planRaw = Array.isArray(params.plan) ? params.plan[0] : params.plan;
  const initialStatusPlan: PlanKey | null = isPlanKey(planRaw) ? planRaw : null;

  const stripeReady = isStripeConfigured();
  const availablePlans = getAvailablePlanKeys();
  const pricing = await getTokenPricing();

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
          .select('stripe_customer_id, tokens_balance, dealer_subscription_status')
          .eq('id', user.id)
          .maybeSingle();
        profile = (data as ProfileRow | null) ?? null;
      }
    } catch {
      // Supabase down — render unauthenticated
    }
  }

  const subscriptionActive = profile?.dealer_subscription_status === 'active' || profile?.dealer_subscription_status === 'trialing';

  return (
    <>
      <Header />

      <main className="min-h-screen bg-paper" id="main">
        <section className="px-5.5 pt-12 pb-10 md:px-8 md:pt-16">
          <div className="mx-auto max-w-275">
            <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-brass">Ceník</span>
            <h1 className="cargent-h1 mt-4 max-w-[18ch] text-[34px] md:text-[46px]">
              Platíte za ocenění, <i>ne za měsíce.</i>
            </h1>
            <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink-soft">
              Kredit kupujete v tokenech (1 token ≈ {TOKEN_VALUE_CZK} Kč). Každé ocenění má pevnou cenu podle úrovně. Bez závazků, tokeny nevyprší.
            </p>
            {isAuthenticated && profile?.tokens_balance != null ? (
              <p className="mt-4 text-[14px] text-dim">
                Váš zůstatek: <span className="cargent-mono font-medium text-ink">{formatTokens(profile.tokens_balance)}</span>
              </p>
            ) : null}
          </div>
        </section>

        {/* ── Co za tokeny dostanete ──────────────────────────────── */}
        <section className="px-5.5 pb-14 md:px-8">
          <div className="mx-auto max-w-275">
            <h2 className="text-[20px] font-bold tracking-tight text-ink">Co stojí ocenění</h2>
            <p className="mt-1 text-[14px] text-dim">Čtyři úrovně podle toho, kolik detailu potřebujete.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {ESTIMATOR_TIERS.map((tier) => {
                const cost = pricing[tier.feature];
                return (
                  <article key={tier.key} className="flex flex-col rounded-lg border border-line p-5">
                    <h3 className="text-[17px] font-bold text-ink">{tier.label}</h3>
                    <p className="mt-0.5 text-[13px] text-dim">{tier.tagline}</p>
                    <p className="cargent-mono mt-4 text-[26px] font-medium leading-none text-ink">
                      {cost === 0 ? 'Zdarma' : formatTokens(cost)}
                    </p>
                    {cost > 0 ? <p className="mt-1 text-[13px] text-dim">≈ {(cost * TOKEN_VALUE_CZK).toLocaleString('cs-CZ')} Kč · ~{tier.durationSec >= 60 ? `${Math.round(tier.durationSec / 60)} min` : `${tier.durationSec} s`}</p> : null}
                    <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-[13.5px] text-ink-soft">
                      {tier.includes.map((inc) => <li key={inc}>· {inc}</li>)}
                    </ul>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 grid gap-x-8 gap-y-2 border-t border-line pt-5 sm:grid-cols-3">
              {DEALER_FEATURES.map((f) => (
                <div key={f} className="flex items-baseline justify-between gap-3 text-[14px]">
                  <span className="text-ink-soft">{TOKEN_COST_LABELS[f]}</span>
                  <span className="cargent-mono shrink-0 text-ink">{pricing[f] === 0 ? 'zdarma' : formatTokens(pricing[f])}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[12.5px] text-faint">Nástroje pro autobazary (popisky, monitoring, skaut) čerpají ze stejného kreditu.</p>
          </div>
        </section>

        {/* ── Balíčky ─────────────────────────────────────────────── */}
        <section className="border-t border-line px-5.5 py-14 md:px-8">
          <div className="mx-auto max-w-275">
            <PricingPlans
              isAuthenticated={isAuthenticated}
              stripeReady={stripeReady}
              availablePlans={availablePlans}
              hasStripeCustomer={Boolean(profile?.stripe_customer_id)}
              subscriptionActive={subscriptionActive}
              initialStatus={initialStatus}
              initialStatusPlan={initialStatusPlan}
            />
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────── */}
        <section className="border-t border-line px-5.5 py-14 md:px-8">
          <div className="mx-auto grid max-w-275 gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
            <h2 className="text-[20px] font-bold tracking-tight text-ink">Časté otázky</h2>
            <dl className="divide-y divide-line">
              {[
                ['Co když ocenění selže?', 'Tokeny se odečítají před spuštěním, ale při chybě nebo přerušení se automaticky vrátí. Platíte jen za dokončené ocenění.'],
                ['Vyprší tokeny?', 'Ne. Jednorázově koupené tokeny i nevyčerpané tokeny z předplatného zůstávají na účtu.'],
                ['Dostanu fakturu?', 'Ano, po platbě ji najdete v zákaznickém portálu Stripe (odkaz v účtu i tady na stránce).'],
                ['Potřebuji účet?', 'Ano — kredit se váže k účtu. Registrace je zdarma, přihlásit se jde e-mailem nebo přes Google.'],
                ['Máme větší provoz. Jde to jinak?', 'Napište nám, pro autobazary s větším objemem připravíme individuální podmínky.'],
              ].map(([q, a]) => (
                <div key={q} className="py-4">
                  <dt className="text-[15px] font-semibold text-ink">{q}</dt>
                  <dd className="mt-1 text-[14px] leading-relaxed text-ink-soft">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="px-5.5 pb-24 md:px-8">
          <div className="mx-auto flex max-w-275 flex-wrap items-center gap-4 border-t border-line pt-8">
            <Link
              href={isAuthenticated ? '/odhad-ceny' : '/registrace'}
              className="rounded-md bg-brass px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              {isAuthenticated ? 'Spustit ocenění' : 'Založit účet zdarma'}
            </Link>
            <Link href="/kontakt" className="cargent-link text-[15px] font-medium text-ink-soft hover:text-ink">
              Nebo nám napište
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
