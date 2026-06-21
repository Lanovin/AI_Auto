/**
 * Stripe pricing config — jednorázové balíčky tokenů:
 *  - balicek_1000: 1 000 Kč → 200 tokenů  (STRIPE_PRICE_BALICEK_1000)
 *  - balicek_2000: 2 000 Kč → 440 tokenů  (STRIPE_PRICE_BALICEK_2000)
 *  - balicek_5000: 5 000 Kč → 1 200 tokenů (STRIPE_PRICE_BALICEK_5000)
 */

export type PlanKey = 'balicek_1000' | 'balicek_2000' | 'balicek_5000';

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
  balicek_1000: {
    key: 'balicek_1000',
    label: 'Balíček 200 tokenů',
    description: 'Jednorázová platba 1 000 Kč, za kterou získáte 200 tokenů. Tokeny nevyprší a čerpají se podle typu posudku.',
    priceCzk: 1000,
    mode: 'payment',
    bonusTokens: 200,
    bullets: [
      '200 tokenů ihned po zaplacení',
      'Jednorázová platba, žádné předplatné',
      'Tokeny nevyprší',
    ],
  },
  balicek_2000: {
    key: 'balicek_2000',
    label: 'Balíček 440 tokenů',
    description: 'Jednorázová platba 2 000 Kč, za kterou získáte 440 tokenů. Výhodnější sazba za token oproti menšímu balíčku.',
    priceCzk: 2000,
    mode: 'payment',
    bonusTokens: 440,
    bullets: [
      '440 tokenů ihned po zaplacení',
      '+40 tokenů navíc oproti dvojnásobku malého balíčku',
      'Tokeny nevyprší',
    ],
  },
  balicek_5000: {
    key: 'balicek_5000',
    label: 'Balíček 1 200 tokenů',
    description: 'Jednorázová platba 5 000 Kč, za kterou získáte 1 200 tokenů. Nejvýhodnější sazba za token — pro intenzivní používání.',
    priceCzk: 5000,
    mode: 'payment',
    bonusTokens: 1200,
    bullets: [
      '1 200 tokenů ihned po zaplacení',
      'Nejvýhodnější cena za token',
      'Tokeny nevyprší',
    ],
  },
};

export function getPriceId(plan: PlanKey): string | null {
  switch (plan) {
    case 'balicek_1000':
      return process.env.STRIPE_PRICE_BALICEK_1000 ?? null;
    case 'balicek_2000':
      return process.env.STRIPE_PRICE_BALICEK_2000 ?? null;
    case 'balicek_5000':
      return process.env.STRIPE_PRICE_BALICEK_5000 ?? null;
    default:
      return null;
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      (getPriceId('balicek_1000') || getPriceId('balicek_2000') || getPriceId('balicek_5000')),
  );
}

export function getAppOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'
  );
}
