/**
 * Stripe pricing config.
 *
 * Jednorázové balíčky tokenů (mode: payment):
 *  - balicek_500:  500 Kč → 90 tokenů      (STRIPE_PRICE_BALICEK_500)
 *  - balicek_1000: 1 000 Kč → 200 tokenů   (STRIPE_PRICE_BALICEK_1000)
 *  - balicek_2000: 2 000 Kč → 440 tokenů   (STRIPE_PRICE_BALICEK_2000)
 *  - balicek_5000: 5 000 Kč → 1 200 tokenů (STRIPE_PRICE_BALICEK_5000)
 *
 * Měsíční předplatné (mode: subscription) — zobrazí se JEN když je nastavené
 * STRIPE_PRICE_PREDPLATNE (recurring price v CZK). Tokeny se připisují každý
 * zúčtovací cyklus přes webhook (invoice.payment_succeeded) a nevyprší.
 *  - predplatne: 1 490 Kč/měs → 360 tokenů  (STRIPE_PRICE_PREDPLATNE)
 */

export type PlanKey = 'balicek_500' | 'balicek_1000' | 'balicek_2000' | 'balicek_5000' | 'predplatne';

export interface PlanConfig {
  key: PlanKey;
  label: string;
  description: string;
  priceCzk: number;
  mode: 'payment' | 'subscription';
  bonusTokens: number;
  bullets: string[];
  /** Zvýrazněný „doporučený“ plán. */
  featured?: boolean;
}

export const PLANS: Record<PlanKey, PlanConfig> = {
  balicek_500: {
    key: 'balicek_500',
    label: 'Start',
    description: 'Na vyzkoušení. Stačí na několik ocenění.',
    priceCzk: 500,
    mode: 'payment',
    bonusTokens: 90,
    bullets: ['90 tokenů', '5,6 Kč za token', 'Tokeny nevyprší'],
  },
  balicek_1000: {
    key: 'balicek_1000',
    label: 'Základ',
    description: 'Pro občasné oceňování.',
    priceCzk: 1000,
    mode: 'payment',
    bonusTokens: 200,
    bullets: ['200 tokenů', '5,0 Kč za token', 'Tokeny nevyprší'],
  },
  balicek_2000: {
    key: 'balicek_2000',
    label: 'Bazar',
    description: 'Pro pravidelný výkup a oceňování.',
    priceCzk: 2000,
    mode: 'payment',
    bonusTokens: 440,
    bullets: ['440 tokenů', '4,5 Kč za token', 'Tokeny nevyprší'],
    featured: true,
  },
  balicek_5000: {
    key: 'balicek_5000',
    label: 'Velký bazar',
    description: 'Nejvýhodnější sazba pro intenzivní provoz.',
    priceCzk: 5000,
    mode: 'payment',
    bonusTokens: 1200,
    bullets: ['1 200 tokenů', '4,2 Kč za token', 'Tokeny nevyprší'],
  },
  predplatne: {
    key: 'predplatne',
    label: 'Měsíční předplatné',
    description: 'Tokeny chodí každý měsíc automaticky. Zrušíte kdykoli.',
    priceCzk: 1490,
    mode: 'subscription',
    bonusTokens: 360,
    bullets: ['360 tokenů každý měsíc', '4,1 Kč za token', 'Nevyčerpané tokeny se sčítají', 'Zrušení kdykoli ve Stripe portálu'],
  },
};

export const ONE_TIME_PLAN_ORDER: PlanKey[] = ['balicek_500', 'balicek_1000', 'balicek_2000', 'balicek_5000'];

export function isPlanKey(value: unknown): value is PlanKey {
  return typeof value === 'string' && value in PLANS;
}

export function getPriceId(plan: PlanKey): string | null {
  switch (plan) {
    case 'balicek_500':
      return process.env.STRIPE_PRICE_BALICEK_500 ?? null;
    case 'balicek_1000':
      return process.env.STRIPE_PRICE_BALICEK_1000 ?? null;
    case 'balicek_2000':
      return process.env.STRIPE_PRICE_BALICEK_2000 ?? null;
    case 'balicek_5000':
      return process.env.STRIPE_PRICE_BALICEK_5000 ?? null;
    case 'predplatne':
      return process.env.STRIPE_PRICE_PREDPLATNE ?? null;
    default:
      return null;
  }
}

/** Plány, které mají nastavené Price ID (jen ty se dají koupit). */
export function getAvailablePlanKeys(): PlanKey[] {
  return (Object.keys(PLANS) as PlanKey[]).filter((k) => Boolean(getPriceId(k)));
}

export function isSubscriptionAvailable(): boolean {
  return Boolean(getPriceId('predplatne'));
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && getAvailablePlanKeys().length > 0);
}

/**
 * Origin aplikace pro Stripe redirecty. Preferuje NEXT_PUBLIC_APP_URL; když
 * chybí, odvodí ho z requestu (Vercel předává x-forwarded-host) — nikdy tak
 * neskončíme s redirectem na localhost v produkci.
 */
export function getAppOrigin(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');

  if (request) {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');
    if (host) return `${proto}://${host}`;
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
