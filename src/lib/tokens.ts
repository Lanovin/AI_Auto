// ── Shared constants (safe to import in both Client and Server Components) ──

// Každý nový účet začíná s 0 tokeny (migrace 0008) — kredit se dokupuje.
export const TOKENS_STARTING_BALANCE = 0;

// 1 token ≈ 5 Kč — orientační přepočet pro UI („≈ X Kč") a admin editor cen.
export const TOKEN_VALUE_CZK = 5;

/** Formats a token amount as an approximate CZK price (e.g. "≈ 20 Kč"). */
export function tokensToCzk(tokens: number): string {
  return `≈ ${(tokens * TOKEN_VALUE_CZK).toLocaleString('cs-CZ')} Kč`;
}

/** České skloňování „token“. */
export function formatTokens(n: number): string {
  const abs = Math.abs(n);
  const word = abs === 1 ? 'token' : abs >= 2 && abs <= 4 ? 'tokeny' : 'tokenů';
  return `${n.toLocaleString('cs-CZ')} ${word}`;
}

/**
 * DEFAULT cost of each billable action, in tokens.
 * The admin can override any of these in /admin → „Ceník služeb" — overrides
 * live in the `token_pricing` table and win over these values. Server code
 * must therefore resolve prices via getTokenPricing()/getTokenCost()
 * (src/lib/tokens-server.ts), never read TOKEN_COSTS directly for billing.
 */
export const TOKEN_COSTS = {
  // Price Estimator tiers (maps to `tier` param in /api/price-estimator)
  'estimator:quick':    2,
  'estimator:standard': 6,
  'estimator:detailed': 10,
  'estimator:expert':   14,
  // Scout (Skaut nabídek) — one search run
  'scout:search':       6,
  // Market Monitor scan (haiku, no web search — cheap + fast)
  'monitor:scan':       2,
  // Ad copy generator — per description
  'popisky:generate':   4,
} as const;

export type TokenFeature = keyof typeof TOKEN_COSTS;

/** Human-readable labels for the cost table shown in UI. */
export const TOKEN_COST_LABELS: Record<TokenFeature, string> = {
  'estimator:quick':    'Odhad ceny — Rychlý',
  'estimator:standard': 'Odhad ceny — Standardní',
  'estimator:detailed': 'Odhad ceny — Detailní',
  'estimator:expert':   'Odhad ceny — Expertní',
  'scout:search':       'Skaut nabídek — hledání',
  'monitor:scan':       'Monitoring — sken trhu',
  'popisky:generate':   'Generátor popisků — 1 popis',
};

/** Popis, co uživatel za jednotlivé úrovně ocenění dostane (zdroj pravdy pro UI). */
export const ESTIMATOR_TIERS = [
  {
    key: 'quick',
    feature: 'estimator:quick' as TokenFeature,
    label: 'Rychlý',
    tagline: 'Cena a pásmo',
    description: 'Prohledá inzeráty a vrátí tržní cenu s pásmem. Bez rozboru.',
    includes: ['Tržní cena + pásmo', 'Tabulka srovnatelných inzerátů', 'Krátké shrnutí'],
    durationSec: 35,
  },
  {
    key: 'standard',
    feature: 'estimator:standard' as TokenFeature,
    label: 'Standardní',
    tagline: 'Cena + faktory',
    description: 'Víc inzerátů, rozbor faktorů ceny a doporučení pro prodejce i kupujícího.',
    includes: ['Vše z Rychlého', 'Co cenu zvedá a co ji sráží', 'Doporučení k prodeji a koupi'],
    durationSec: 60,
  },
  {
    key: 'detailed',
    feature: 'estimator:detailed' as TokenFeature,
    label: 'Detailní',
    tagline: 'Posudek se stavem a výbavou',
    description: 'Zohlední stav, výbavu, servis a nehodovost. Trendy segmentu a rizika modelu.',
    includes: ['Vše ze Standardního', 'Vliv výbavy a stavu v Kč', 'Trendy, rizika modelu, checklist'],
    durationSec: 120,
  },
  {
    key: 'expert',
    feature: 'estimator:expert' as TokenFeature,
    label: 'Expertní',
    tagline: 'Znalecká úroveň',
    description: 'Nejvíc inzerátů, VIN, regionální srovnání, náklady vlastnictví a prodejní strategie.',
    includes: ['Vše z Detailního', 'Prognóza ceny, TCO na 3 roky', 'Regionální srovnání a strategie'],
    durationSec: 180,
  },
] as const;

export type EstimatorTierKey = (typeof ESTIMATOR_TIERS)[number]['key'];
