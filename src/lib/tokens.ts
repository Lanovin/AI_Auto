// ── Shared constants (safe to import in both Client and Server Components) ──

// Starting balance for every new account. Change here to adjust the trial.
export const TOKENS_STARTING_BALANCE = 100;

// 1 token ≈ 5 Kč — used for the "≈ X Kč" hints in UI and the admin price editor.
export const TOKEN_VALUE_CZK = 5;

/** Formats a token amount as an approximate CZK price (e.g. "≈ 20 Kč"). */
export function tokensToCzk(tokens: number): string {
  return `≈ ${(tokens * TOKEN_VALUE_CZK).toLocaleString('cs-CZ')} Kč`;
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
  'estimator:quick':    4,
  'estimator:standard': 8,
  'estimator:detailed': 12,
  'estimator:expert':   20,
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
  'estimator:detailed': 'Odhad ceny — Podrobný',
  'estimator:expert':   'Odhad ceny — Expert',
  'scout:search':       'Skaut nabídek — hledání',
  'monitor:scan':       'Monitoring — sken trhu',
  'popisky:generate':   'Generátor popisků — 1 popis',
};
