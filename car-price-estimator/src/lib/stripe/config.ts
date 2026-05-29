/**
 * Stripe pricing config — single source of truth for plans, prices and token grants.
 *
 * Add the actual Stripe Price IDs to .env.local (or Vercel env) — see .env.example.
 * Each Price ID must be created in the Stripe Dashboard with the matching CZK amount
 * and recurrence configured here.
 *
 * Test mode tip: use keys starting with sk_test_ / pk_test_ and create test products
 * with the same prices. The webhook secret comes from Stripe CLI (`stripe listen`) or
 * from the dashboard for production.
 */

export type PlanKey = 'dealer' | 'monitoring' | 'tokens_test';

export interface PlanConfig {
  key: PlanKey;
  label: string;
  description: string;
  /** Human-readable price (CZK). UI only — Stripe uses the Price ID. */
  priceCzk: number;
  /** Recurrence — only meaningful for subscription plans. */
  interval?: 'month' | 'year';
  /** Subscription vs one-time payment. */
  mode: 'subscription' | 'payment';
  /** Tokens granted on each successful payment (initial + every renewal). */
  bonusTokens: number;
  /** Optional badge text shown next to the plan name. */
  badge?: string;
  /** Short bullet list for the UI. */
  bullets: string[];
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  dealer: {
    key: 'dealer',
    label: 'Předplatné Autobazar',
    description:
      'Firemní účet odemkne monitoring trhu, popisky a navazující B2B nástroje. Každý měsíc dostanete bonus tokeny.',
    priceCzk: 10,
    interval: 'month',
    mode: 'subscription',
    bonusTokens: 50,
    badge: 'B2B',
    bullets: [
      'Status "Autobazar" pro firemní účet',
      '+50 tokenů každý měsíc',
      'Přístup k firemnímu profilu a popiskům',
    ],
  },
  monitoring: {
    key: 'monitoring',
    label: 'Monitoring trhu',
    description:
      'Sledujte ceny konkurence a watchlist svých vozů. Měsíční předplatné s bonus tokeny do skenů.',
    priceCzk: 20,
    interval: 'month',
    mode: 'subscription',
    bonusTokens: 30,
    badge: 'Doplněk',
    bullets: [
      'Plný přístup do modulu Monitoring',
      '+30 tokenů každý měsíc',
      'Watchlist aut a notifikace změn ceny',
    ],
  },
  tokens_test: {
    key: 'tokens_test',
    label: 'Tokeny — testovací nákup',
    description:
      'Jednorázový testovací nákup tokenů (zatím za 0 Kč). Slouží k ověření, že Stripe checkout funguje.',
    priceCzk: 0,
    mode: 'payment',
    bonusTokens: 100,
    badge: 'Test',
    bullets: [
      'Jednorázová platba (žádné předplatné)',
      '+100 tokenů na účet',
      'Pro ověření funkčnosti Stripe',
    ],
  },
};

/** Resolves the configured Stripe Price ID for a plan from env vars. */
export function getPriceId(plan: PlanKey): string | null {
  const envKey =
    plan === 'dealer'
      ? 'STRIPE_PRICE_DEALER'
      : plan === 'monitoring'
        ? 'STRIPE_PRICE_MONITORING'
        : 'STRIPE_PRICE_TOKENS_TEST';
  return process.env[envKey] ?? null;
}

/** True when both the Stripe secret key and ALL Price IDs are configured. */
export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      getPriceId('dealer') &&
      getPriceId('monitoring') &&
      getPriceId('tokens_test'),
  );
}

/** Public origin used for Stripe success/cancel URLs. */
export function getAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  );
}

/** Map a plan key to the Postgres-side feature flag we use to gate access. */
export function planToAccessKey(plan: PlanKey): 'dealer' | 'monitoring' | null {
  if (plan === 'dealer') return 'dealer';
  if (plan === 'monitoring') return 'monitoring';
  return null;
}
