'use client';

import { useState } from 'react';
import { PLANS, type PlanKey } from '@/lib/stripe/config';

interface PricingPlansProps {
  /** Whether the visitor is logged in via Supabase. Drives auth-aware messaging. */
  isAuthenticated: boolean;
  /** Whether the server has Stripe configured. If not, buttons explain that. */
  stripeReady: boolean;
  /** Current subscription state for the user, if any. Used to highlight active plans. */
  activeSubscriptions: {
    dealer: boolean;
    monitoring: boolean;
  };
  /** True if the user has a Stripe customer record (so the portal link can show). */
  hasStripeCustomer: boolean;
  /** Optional initial status banner shown after redirect from Stripe. */
  initialStatus?: 'success' | 'cancelled' | null;
  /** Plan key from ?plan= query, used to personalise the success banner. */
  initialStatusPlan?: PlanKey | null;
}

const PLAN_ORDER: PlanKey[] = ['dealer', 'monitoring', 'tokens_test'];

export default function PricingPlans({
  isAuthenticated,
  stripeReady,
  activeSubscriptions,
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
          ? `Plán "${planLabel}" je aktivní. Tokeny se připíšou během chvíle (po zpracování webhooku).`
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
            Doplňte <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">STRIPE_SECRET_KEY</code>,{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">STRIPE_PRICE_DEALER</code>,{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">STRIPE_PRICE_MONITORING</code> a{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">STRIPE_PRICE_TOKENS_TEST</code> do{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">.env.local</code>. Detaily v{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">.env.example</code>.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((key) => {
          const plan = PLANS[key];
          const isActive =
            (key === 'dealer' && activeSubscriptions.dealer) ||
            (key === 'monitoring' && activeSubscriptions.monitoring);
          const isPending = pendingPlan === key;
          const buttonDisabled = !stripeReady || !isAuthenticated || isPending || isActive;

          let buttonLabel = `Koupit za ${plan.priceCzk} Kč`;
          if (plan.mode === 'subscription') {
            buttonLabel = `Předplatit za ${plan.priceCzk} Kč/měs`;
          }
          if (plan.priceCzk === 0) {
            buttonLabel = 'Aktivovat (zdarma)';
          }
          if (isPending) buttonLabel = 'Otevírám Stripe…';
          if (isActive) buttonLabel = 'Aktivní';
          if (!isAuthenticated) buttonLabel = 'Nejprve se přihlaste';

          return (
            <article
              key={key}
              className={`flex flex-col rounded-[24px] border bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)] ${
                isActive ? 'border-emerald-200' : 'border-brand-100'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[20px] font-medium text-brand-900">{plan.label}</h3>
                {plan.badge ? (
                  <span className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium text-brand-700">
                    {plan.badge}
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">{plan.description}</p>

              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-[36px] font-medium tabular-nums text-brand-900">
                  {plan.priceCzk} Kč
                </span>
                {plan.mode === 'subscription' ? (
                  <span className="text-[14px] text-neutral-500">/měs</span>
                ) : (
                  <span className="text-[14px] text-neutral-500">jednorázově</span>
                )}
              </div>

              <ul className="mt-5 flex flex-col gap-2">
                {plan.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-3 text-[14px] text-neutral-600"
                  >
                    {bullet}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={buttonDisabled}
                onClick={() => void handleBuy(key)}
                className={`mt-6 rounded-full px-5 py-3 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'cursor-default bg-emerald-100 text-emerald-800'
                    : buttonDisabled
                      ? 'cursor-not-allowed bg-neutral-100 text-neutral-400'
                      : 'bg-brand-600 text-white hover:bg-brand-800'
                }`}
              >
                {buttonLabel}
              </button>
            </article>
          );
        })}
      </div>

      {isAuthenticated && hasStripeCustomer ? (
        <div className="rounded-2xl border border-brand-100 bg-white p-5">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Správa</p>
          <h3 className="mt-1 text-[18px] font-medium text-brand-900">Stripe zákaznický portál</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
            Spravujte platební metodu, zrušte předplatné nebo si stáhněte faktury přímo ve Stripe.
          </p>
          <button
            type="button"
            onClick={() => void handlePortal()}
            disabled={!stripeReady || openingPortal}
            className="mt-4 rounded-full border border-brand-100 px-5 py-3 text-[14px] font-medium text-brand-700 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-neutral-400"
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
