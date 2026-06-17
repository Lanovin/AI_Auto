/**
 * Stripe pricing config — produkty:
 *  - tokens_100: měsíční předplatné, 100 tokenů / měsíc (STRIPE_PRICE_TOKENS_100)
 *  - test: testovací jednorázový produkt, 5 Kč za 100 tokenů (STRIPE_PRICE_TEST)
 */

export type PlanKey = 'tokens_100' | 'test';

export interface PlanConfig {
  key: PlanKey;
  label: string;
  description: string;
  priceCzk: number;
  mode: 'payment' | 'subscription';
  bonusTokens: number;
  bullets: string[];
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  tokens_100: {
    key: 'tokens_100',
    label: '100 tokenů / měsíc',
    description: 'Měsíční předplatné. Každý měsíc obdržíte 100 tokenů pro skenování cen vozů. Nevyčerpané tokeny se převádějí.',
    priceCzk: 1000,
    mode: 'subscription',
    bonusTokens: 100,
    bullets: [
      '100 tokenů připsaných každý měsíc',
      'Nevyčerpané tokeny se převádějí do dalšího měsíce',
      'Každý sken spotřebuje tokeny dle typu',
    ],
  },
  test: {
    key: 'test',
    label: 'Test — 100 tokenů',
    description: 'Testovací produkt. Jednorázová platba 15 Kč, za kterou získáte 100 tokenů. Slouží k ověření platebního toku (15 Kč je minimum Stripe pro CZK).',
    priceCzk: 15,
    mode: 'payment',
    bonusTokens: 100,
    bullets: [
      '100 tokenů ihned po zaplacení',
      'Jednorázová platba, žádné předplatné',
      'Určeno pro testování plateb',
    ],
  },
};

export function getPriceId(plan: PlanKey): string | null {
  switch (plan) {
    case 'tokens_100':
      return process.env.STRIPE_PRICE_TOKENS_100 ?? null;
    case 'test':
      return process.env.STRIPE_PRICE_TEST ?? null;
    default:
      return null;
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      (getPriceId('tokens_100') || getPriceId('test')),
  );
}

export function getAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  );
}
