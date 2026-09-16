'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANS, ONE_TIME_PLAN_ORDER, type PlanKey } from '@/lib/stripe/config';

interface PricingPlansProps {
  isAuthenticated: boolean;
  stripeReady: boolean;
  /** Plány s nastaveným Stripe Price ID. */
  availablePlans: PlanKey[];
  hasStripeCustomer: boolean;
  subscriptionActive: boolean;
  initialStatus?: 'success' | 'cancelled' | null;
  initialStatusPlan?: PlanKey | null;
}

export default function PricingPlans({
  isAuthenticated,
  stripeReady,
  availablePlans,
  hasStripeCustomer,
  subscriptionActive,
  initialStatus,
  initialStatusPlan,
}: PricingPlansProps) {
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'success' | 'info' | 'error'; title: string; body: string } | null>(() => {
    if (initialStatus === 'success') {
      const plan = initialStatusPlan ? PLANS[initialStatusPlan] : null;
      return {
        tone: 'success',
        title: 'Platba proběhla',
        body: plan
          ? `${plan.label} — ${plan.bonusTokens} tokenů se připíše během chvíle. Zůstatek uvidíte v hlavičce a v účtu.`
          : 'Děkujeme. Tokeny se připíšou během chvíle.',
      };
    }
    if (initialStatus === 'cancelled') {
      return { tone: 'info', title: 'Platba zrušena', body: 'Nic se nestrhlo. Můžete to zkusit kdykoli znovu.' };
    }
    return null;
  });

  async function post(url: string, body?: unknown): Promise<string> {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.status === 401) {
      window.location.assign('/prihlaseni?next=%2Fcenik');
      throw new Error('Přihlaste se.');
    }
    if (!res.ok || !data.url) throw new Error(data.error ?? `Nepodařilo se otevřít platbu (HTTP ${res.status}).`);
    return data.url;
  }

  async function handleBuy(plan: PlanKey) {
    if (!isAuthenticated) { window.location.assign('/prihlaseni?next=%2Fcenik'); return; }
    setBanner(null);
    setPendingPlan(plan);
    try {
      window.location.assign(await post('/api/stripe/checkout', { plan }));
    } catch (err) {
      setBanner({ tone: 'error', title: 'Platbu se nepodařilo otevřít', body: err instanceof Error ? err.message : 'Neznámá chyba' });
      setPendingPlan(null);
    }
  }

  async function handlePortal() {
    setBanner(null);
    setOpeningPortal(true);
    try {
      window.location.assign(await post('/api/stripe/portal'));
    } catch (err) {
      setBanner({ tone: 'error', title: 'Portál se nepodařilo otevřít', body: err instanceof Error ? err.message : 'Neznámá chyba' });
      setOpeningPortal(false);
    }
  }

  const bannerStyle = {
    success: 'border-emerald/25 bg-emerald/5',
    info: 'border-brass/25 bg-brass/5',
    error: 'border-negative/25 bg-negative/5',
  } as const;

  const oneTime = ONE_TIME_PLAN_ORDER;
  const subscription = PLANS.predplatne;
  const subscriptionOffered = availablePlans.includes('predplatne');

  return (
    <div className="space-y-10">
      {banner ? (
        <div role="status" className={`rounded-md border p-4 ${bannerStyle[banner.tone]}`}>
          <strong className="block text-[15px] text-ink">{banner.title}</strong>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{banner.body}</p>
        </div>
      ) : null}

      {!stripeReady ? (
        <div className="rounded-md border border-line bg-paper-2 p-4 text-[14px] leading-relaxed text-ink-soft">
          Platby se právě nastavují. Napište nám přes <Link href="/kontakt" className="cargent-link font-medium text-brass">kontakt</Link> a kredit vám připíšeme ručně.
        </div>
      ) : null}

      {/* ── Jednorázové balíčky ─────────────────────────────────── */}
      <div>
        <h2 className="text-[20px] font-bold tracking-tight text-ink">Balíčky tokenů</h2>
        <p className="mt-1 text-[14px] text-dim">Jednorázová platba kartou. Tokeny nevyprší a čerpají se podle úrovně ocenění.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {oneTime.map((key) => {
            const plan = PLANS[key];
            const available = availablePlans.includes(key);
            const pending = pendingPlan === key;
            const disabled = !stripeReady || !available || pending;
            const perToken = plan.priceCzk / plan.bonusTokens;
            return (
              <article
                key={key}
                className={`flex flex-col rounded-lg border p-5 ${plan.featured ? 'border-brass' : 'border-line'}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-[17px] font-bold text-ink">{plan.label}</h3>
                  {plan.featured ? <span className="cargent-mono text-[10px] uppercase tracking-[0.14em] text-brass">Nejčastější</span> : null}
                </div>
                <p className="mt-1 text-[13px] text-dim">{plan.description}</p>

                <p className="cargent-mono mt-5 text-[34px] font-medium leading-none text-ink">{plan.bonusTokens.toLocaleString('cs-CZ')}</p>
                <p className="mt-1 text-[13px] text-dim">tokenů · {perToken.toFixed(1).replace('.', ',')} Kč za token</p>

                <p className="cargent-mono mt-4 text-[18px] text-ink">{plan.priceCzk.toLocaleString('cs-CZ')} Kč</p>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void handleBuy(key)}
                  className={`mt-5 rounded-md px-4 py-2.5 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ${
                    disabled
                      ? 'cursor-not-allowed border border-line text-faint'
                      : plan.featured
                        ? 'bg-brass text-white hover:bg-brass-2'
                        : 'border border-line-2 text-ink hover:border-brass hover:text-brass'
                  }`}
                >
                  {pending ? 'Otevírám platbu…' : !available ? 'Brzy' : isAuthenticated ? 'Koupit' : 'Přihlásit se a koupit'}
                </button>
              </article>
            );
          })}
        </div>
      </div>

      {/* ── Předplatné ─────────────────────────────────────────── */}
      {subscriptionOffered ? (
        <div className="border-t border-line pt-8">
          <h2 className="text-[20px] font-bold tracking-tight text-ink">Měsíční předplatné</h2>
          <p className="mt-1 text-[14px] text-dim">Pro autobazary, které oceňují pravidelně. Tokeny chodí každý měsíc, zrušit můžete kdykoli.</p>

          <div className="mt-6 grid gap-6 rounded-lg border border-line p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6">
            <div>
              <h3 className="text-[17px] font-bold text-ink">{subscription.label}</h3>
              <ul className="mt-3 grid gap-1.5 text-[14px] text-ink-soft sm:grid-cols-2">
                {subscription.bullets.map((b) => <li key={b}>· {b}</li>)}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <p className="cargent-mono text-[26px] font-medium text-ink">
                {subscription.priceCzk.toLocaleString('cs-CZ')} Kč<span className="text-[14px] text-dim"> / měsíc</span>
              </p>
              {subscriptionActive ? (
                <button type="button" onClick={() => void handlePortal()} disabled={openingPortal} className="rounded-md border border-line-2 px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass disabled:text-faint">
                  {openingPortal ? 'Otevírám…' : 'Spravovat předplatné'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!stripeReady || pendingPlan === 'predplatne'}
                  onClick={() => void handleBuy('predplatne')}
                  className="rounded-md bg-brass px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 disabled:cursor-not-allowed disabled:bg-faint"
                >
                  {pendingPlan === 'predplatne' ? 'Otevírám platbu…' : isAuthenticated ? 'Předplatit' : 'Přihlásit se a předplatit'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isAuthenticated && hasStripeCustomer ? (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <p className="text-[14px] text-ink-soft">Faktury, platební karta a případné předplatné jsou v zákaznickém portálu Stripe.</p>
          <button
            type="button"
            onClick={() => void handlePortal()}
            disabled={!stripeReady || openingPortal}
            className="rounded-md border border-line-2 px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-faint"
          >
            {openingPortal ? 'Otevírám…' : 'Otevřít portál plateb'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
