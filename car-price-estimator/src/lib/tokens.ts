// ── Shared constants (safe to import in both Client and Server Components) ──

// Starting balance for every new account. Change here to adjust the trial.
export const TOKENS_STARTING_BALANCE = 100;

// 1 token = $0.10
export const TOKEN_VALUE_USD = 0.10;

/** All billable actions in the app. */
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
