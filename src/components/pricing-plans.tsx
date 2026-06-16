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

const PLAN_ORDER: PlanKey[] = ['tokens_100'];

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
    success: 'border border-emerald-100 bg-emerald-50 text-emerald-800',
    info: 'border border-brand-100 bg-brand-50 text-brand-800',
    error: 'border border-red-100 bg-red-50 text-red-800',
  };

  return (
    <div className="space-y-6">
      {statusBanner ? (
        <div className={`rounded-2xl p-4 ${bannerStyle[statusBanner.tone]}`}>
          <strong className="block text-[15px]">{statusBanner.title}</strong>
          <p className="mt-1 text-[14px] leading-relaxed">{statusBanner.body}</p>
        </div>
      ) : null}

      {!stripeReady ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <strong className="block text-[15px]">Stripe zatím není nastaven</strong>
          <p className="mt-1 text-[14px] leading-relaxed">
            Doplňte <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">STRIPE_SECRET_KEY</code> a{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">STRIPE_PRICE_TOKENS_100</code> do{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">.env.local</code>.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-1 max-w-sm">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const isPending = pendingPlan === key;
          const buttonDisabled = !stripeReady || !isAuthenticated || isPending;

          let buttonLabel = `Koupit za ${plan.priceCzk} Kč`;
          if (isPending) buttonLabel = 'Otevírám Stripe…';
          if (!isAuthenticated) buttonLabel = 'Nejprve se přihlaste';

          return (
            <article
              key={key}
              className="flex flex-col rounded-3xl border border-brass/30 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)]"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[20px] font-medium text-ink">{plan.label}</h3>
                <span className="inline-flex rounded-full border border-brass/20 bg-brass/10 px-3 py-1 text-[11px] font-medium text-brass">
                  Jednorázově
                </span>
              </div>

              <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">{plan.description}</p>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-[42px] font-medium tabular-nums text-ink">
                  {plan.priceCzk} Kč
                </span>
              </div>

              <ul className="mt-5 flex flex-col gap-2">
                {plan.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-center gap-2 text-[14px] text-neutral-600"
                  >
                    <span className="text-emerald shrink-0">✓</span>
                    {bullet}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={buttonDisabled}
                onClick={() => void handleBuy(key)}
                className={`mt-6 rounded-full px-5 py-3 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ${
                  buttonDisabled
                    ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                    : 'bg-brass text-white hover:bg-brass-2'
                }`}
              >
                {buttonLabel}
              </button>
            </article>
          );
        })}
      </div>

      {isAuthenticated && hasStripeCustomer ? (
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-dim">Správa plateb</p>
          <h3 className="mt-1 text-[18px] font-medium text-ink">Zákaznický portál Stripe</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
            Stáhněte faktury nebo spravujte platební metodu přímo ve Stripe.
          </p>
          <button
            type="button"
            onClick={() => void handlePortal()}
            disabled={!stripeReady || openingPortal}
            className="mt-4 rounded-full border border-line px-5 py-3 text-[14px] font-medium text-ink transition-colors hover:border-ink/20 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-neutral-400"
          >
            {openingPortal ? 'Otevírám portál…' : 'Otevřít zákaznický portál'}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
