'use client';

import { useState } from 'react';
import { PLANS, type PlanKey } from '@/lib/stripe/config';

interface PricingPlansProps {
  isAuthenticated: boolean;
  stripeReady: boolean;
  activeSubscriptions: {
    dealer: boolean;
    monitoring: boolean;
  };
  hasStripeCustomer: boolean;
  initialStatus?: 'success' | 'cancelled' | null;
  initialStatusPlan?: PlanKey | null;
}

const PLAN_ORDER: PlanKey[] = ['balicek_500', 'balicek_1000', 'balicek_2000', 'balicek_5000'];

export default function PricingPlans({
  isAuthenticated,
  stripeReady,
  hasStripeCustomer,
  initialStatus,
  initialStatusPlan,
}: PricingPlansProps) {
  const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{
    tone: 'success' | 'info' | 'error';
    title: string;
    body: string;
  } | null>(() => {
    if (initialStatus === 'success') {
      const planLabel = initialStatusPlan ? PLANS[initialStatusPlan]?.label : null;
      return {
        tone: 'success',
        title: 'Platba proběhla',
        body: planLabel
          ? `Balíček „${planLabel}" byl zakoupen. Tokeny se připíšou během chvíle (po zpracování webhooku).`
          : 'Děkujeme za nákup. Tokeny se připíšou během chvíle.',
      };
    }
    if (initialStatus === 'cancelled') {
      return {
        tone: 'info',
        title: 'Platba zrušena',
        body: 'Žádné peníze nebyly stržené. Můžete to zkusit znovu kdykoliv.',
      };
    }
    return null;
  });

  async function handleBuy(plan: PlanKey) {
    setError(null);
    setPendingPlan(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `Nelze otevřít checkout (HTTP ${res.status}).`);
      }
      window.location.assign(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Neznámá chyba';
      setError(message);
      setStatusBanner({ tone: 'error', title: 'Checkout selhal', body: message });
      setPendingPlan(null);
    }
  }

  async function handlePortal() {
    setError(null);
    setOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? `Nelze otevřít portál (HTTP ${res.status}).`);
      }
      window.location.assign(data.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Neznámá chyba';
      setError(message);
      setStatusBanner({ tone: 'error', title: 'Portál selhal', body: message });
      setOpeningPortal(false);
    }
  }

  const bannerStyle: Record<'success' | 'info' | 'error', string> = {
    success: 'border border-emerald/25 bg-emerald/8 text-ink',
    info: 'border border-brass/25 bg-brass/8 text-ink',
    error: 'border border-negative/25 bg-negative/8 text-ink',
  };

  return (
    <div className="space-y-6">
      {statusBanner ? (
        <div className={`rounded-lg p-4 ${bannerStyle[statusBanner.tone]}`}>
          <strong className="block text-[15px]">{statusBanner.title}</strong>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">{statusBanner.body}</p>
        </div>
      ) : null}

      {!stripeReady ? (
        <div className="rounded-lg border border-line bg-paper-2 p-4 text-ink-soft">
          <strong className="block text-[15px] text-ink">Stripe zatím není nastaven</strong>
          <p className="mt-1 text-[14px] leading-relaxed">
            Doplňte <code className="cargent-mono rounded bg-surface px-1.5 py-0.5 text-[12px]">STRIPE_SECRET_KEY</code> a{' '}
            <code className="cargent-mono rounded bg-surface px-1.5 py-0.5 text-[12px]">STRIPE_PRICE_BALICEK_*</code> do{' '}
            <code className="cargent-mono rounded bg-surface px-1.5 py-0.5 text-[12px]">.env.local</code>.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const isPending = pendingPlan === key;
          const buttonDisabled = !stripeReady || isPending;

          const isSubscription = plan.mode === 'subscription';
          let buttonLabel = isSubscription
            ? `Předplatit za ${plan.priceCzk.toLocaleString('cs-CZ')} Kč/měs`
            : `Koupit za ${plan.priceCzk.toLocaleString('cs-CZ')} Kč`;
          if (isPending) buttonLabel = 'Otevírám Stripe…';
          if (!isAuthenticated) buttonLabel = 'Přihlásit se';

          return (
            <article
              key={key}
              className="flex flex-col rounded-lg border border-line bg-surface p-6"
              style={{ boxShadow: 'var(--shadow-cargent-card)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="cargent-h3 text-[20px]">{plan.label}</h3>
                <span className="cargent-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                  {isSubscription ? 'Měsíčně' : 'Jednorázově'}
                </span>
              </div>

              <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{plan.description}</p>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="cargent-mono text-[40px] font-medium text-ink">
                  {plan.priceCzk.toLocaleString('cs-CZ')} Kč
                </span>
                {plan.mode === 'subscription' && (
                  <span className="text-[15px] text-dim">/měs</span>
                )}
              </div>

              <ul className="mt-5 flex flex-col gap-2">
                {plan.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-center gap-2 text-[14px] text-ink-soft"
                  >
                    <span className="shrink-0 text-emerald">✓</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={buttonDisabled}
                onClick={() => {
                  if (!isAuthenticated) {
                    window.location.assign('/prihlaseni?next=/cenik');
                    return;
                  }
                  void handleBuy(key);
                }}
                className={`mt-6 rounded-md px-5 py-3 text-[14px] font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ${
                  buttonDisabled
                    ? 'cursor-not-allowed bg-faint'
                    : 'bg-brass hover:bg-brass-2'
                }`}
              >
                {buttonLabel}
              </button>
            </article>
          );
        })}
      </div>

      {isAuthenticated && hasStripeCustomer ? (
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">Správa plateb</p>
          <h3 className="cargent-h3 mt-1 text-[18px]">Zákaznický portál Stripe</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            Stáhněte faktury nebo spravujte platební metodu přímo ve Stripe.
          </p>
          <button
            type="button"
            onClick={() => void handlePortal()}
            disabled={!stripeReady || openingPortal}
            className="mt-4 rounded-md border border-line-2 px-5 py-3 text-[14px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-faint"
          >
            {openingPortal ? 'Otevírám portál…' : 'Otevřít zákaznický portál'}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-[13px] text-negative" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
