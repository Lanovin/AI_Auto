/**
 * Cargent landing — demo / placeholder data.
 *
 * ⚠️ Všechny hodnoty zde jsou PLACEHOLDERY. V produkci nahradit reálnými
 * daty z API (`/v1/valuations`, `/v1/metrics`, …).
 *
 * Drž je na jednom místě — tahá si je `Hero`, `Instrument`, `Engine`,
 * `Ticker`, `B2B`. Když měníš číslo, měň ho tady.
 */

// ── Hero metrics (pod CTA) ──────────────────────────────────────────
export const HERO_METRICS = [
  { label: 'MAPE', value: '± 4,3 %' }, // TODO: nahradit reálnými daty z API
  { label: 'R²',    value: '0,94' },    // TODO: nahradit reálnými daty z API
  { label: 'Vozů v DB', value: '180k+' }, // TODO: nahradit reálnými daty z API
] as const;

// ── Instrument: aktuální oceňovaný vůz ──────────────────────────────
export const DEMO_VEHICLE = {
  brand: 'Škoda',
  model: 'Octavia Combi',
  variant: '2.0 TDI',
  year: 2021,
  mileage: 78_400,
  transmission: 'DSG',
  trim: 'Style',
  owners: '1. majitel',
  vin: 'TMBJB7NE5M0123456', // TODO: nahradit reálnými daty z API
} as const;

// Instrument cena + interval spolehlivosti
export const DEMO_VALUATION = {
  price: 489_000,         // TODO: nahradit reálnými daty z API
  rangeLow: 462_000,      // TODO: nahradit reálnými daty z API
  rangeHigh: 516_000,     // TODO: nahradit reálnými daty z API
  confidencePct: 90,
  verified: true,         // Cebia
} as const;

// Rozpad ceny — co cenu posunulo
export const DEMO_PRICE_BREAKDOWN: ReadonlyArray<{
  label: string;
  /** Positive = adds value, negative = subtracts */
  amount: number;
}> = [
  { label: 'Výbava (Style, DSG, tažné)', amount:  24_000 }, // TODO: nahradit reálnými daty z API
  { label: 'Najeto 78 400 km',           amount: -31_000 }, // TODO: nahradit reálnými daty z API
  { label: '1. majitel · plná servisní historie', amount: 12_000 }, // TODO: nahradit reálnými daty z API
  { label: 'Sezónní poptávka (jaro)',    amount:   4_000 }, // TODO: nahradit reálnými daty z API
];

// Zdroje pod instrumentem
export const DEMO_SOURCES = [
  { label: 'AutoESA',  verified: false },
  { label: 'TipCars',  verified: false },
  { label: 'Cebia',    verified: true  },
] as const;

// ── Ticker: nedávná ocenění (rolují horizontálně) ───────────────────
export const TICKER_ITEMS: ReadonlyArray<{ model: string; price: number }> = [
  { model: 'BMW 320d 2019',           price: 535_000 }, // TODO: nahradit reálnými daty z API
  { model: 'Škoda Kodiaq 2022',       price: 712_000 },
  { model: 'VW Passat 2.0 TDI 2020',  price: 428_000 },
  { model: 'Audi A4 Avant 2021',      price: 589_000 },
  { model: 'Toyota Corolla 2023',     price: 468_000 },
  { model: 'Mercedes GLC 2020',       price: 845_000 },
  { model: 'Hyundai Tucson 2022',     price: 514_000 },
];

// ── Engine: kvalitativní metriky modelu (count-up) ──────────────────
export const ENGINE_METRICS = [
  { label: 'MAPE napříč segmenty', value: 4.3,  suffix: ' %', precision: 1 },
  { label: 'R² na hold-out setu',  value: 0.94, suffix: '',   precision: 2 },
  { label: 'Vozů v tréninkovém setu', value: 184_000, suffix: '', precision: 0 },
  { label: 'Datových bodů na vůz',  value: 42,    suffix: '',  precision: 0 },
] as const;

// ── Engine: srovnatelné vozy v analýze (top 5 z 27) ─────────────────
export const COMPARABLES: ReadonlyArray<{
  vehicle: string;
  mileage: number;
  price: number;
  deviationPct: number;
}> = [
  { vehicle: "Octavia 2.0 TDI '21", mileage: 71_200, price: 512_000, deviationPct:  4.7 }, // TODO
  { vehicle: "Octavia 2.0 TDI '21", mileage: 83_500, price: 475_000, deviationPct: -2.9 },
  { vehicle: "Octavia 2.0 TDI '20", mileage: 76_900, price: 468_000, deviationPct: -4.3 },
  { vehicle: "Octavia 2.0 TDI '21", mileage: 79_100, price: 495_000, deviationPct:  1.2 },
  { vehicle: "Octavia 2.0 TDI '22", mileage: 68_400, price: 529_000, deviationPct:  8.2 },
];

export const MEDIAN_PRICE = 489_000; // TODO: nahradit reálnými daty z API
export const COMPARABLES_TOTAL = 27;

// ── B2B: ukázka API volání ──────────────────────────────────────────
export const API_REQUEST_SAMPLE = `POST /v1/valuations
Authorization: Bearer sk_live_•••
Content-Type: application/json

{
  "vin": "TMBJB7NE5M0123456",
  "mileage": 78400
}`;

export const API_RESPONSE_SAMPLE = `{
  "price":    489000,
  "currency": "CZK",
  "range":    [462000, 516000],
  "confidence": 0.90,
  "mape":     0.043,
  "verified": true,
  "sources":  ["autoesa", "tipcars", "cebia"]
}`;

// ── Helpers ─────────────────────────────────────────────────────────
/** Formats integer as Czech grouped number (489 000 — uses NBSP). */
export function formatCzk(value: number): string {
  return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(value);
}

export function formatKm(value: number): string {
  return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(value);
}
