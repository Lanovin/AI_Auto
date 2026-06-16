/**
 * Stripe pricing config — jeden produkt: 100 tokenů (jednorázová platba).
 * Price ID nastavit v .env.local jako STRIPE_PRICE_TOKENS_100.
 */

export type PlanKey = 'tokens_100';

export interface PlanConfig {
  key: PlanKey;
  label: string;
  description: string;
  priceCzk: number;
  mode: 'payment';
  bonusTokens: number;
  bullets: string[];
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  tokens_100: {
    key: 'tokens_100',
    label: '100 tokenů',
    description: 'Jednorázový nákup 100 tokenů. Tokeny platí bez omezení a slouží ke skenování cen vozů.',
    priceCzk: 99,
    mode: 'payment',
    bonusTokens: 100,
    bullets: [
      '100 tokenů připsaných okamžitě',
      'Každý sken spotřebuje tokeny dle typu',
      'Platnost bez časového omezení',
    ],
  },
};

export function getPriceId(plan: PlanKey): string | null {
  return process.env.STRIPE_PRICE_TOKENS_100 ?? null;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && getPriceId('tokens_100'));
}

export function getAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  );
}
