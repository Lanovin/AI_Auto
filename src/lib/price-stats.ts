import { sql } from './db';
import { generateSignature, type CarInput } from './car-signature';
import type { ScanData } from './market-cache';

/**
 * price_stats — VLASTNÍ odvozená databáze cenových statistik Cargent.
 *
 * Ukládáme výhradně agregáty z našich vlastních výpočtů (průměr, medián,
 * min/max pásmo, počet skenů) — nikdy řádky či kopie cizích inzerátů.
 * Jde o vlastní databázi ve smyslu směrnice 96/9/ES, právně nezávislou na
 * databázích inzertních portálů.
 *
 * Účel:
 *   1. PRIOR pro scan prompt — model dostane historický medián jako kontrolu
 *      věrohodnosti aktuálních nálezů → vyšší odolnost proti outlierům,
 *      vyšší přesnost odhadu.
 *   2. Dlouhodobě umožní levné okamžité odhady bez web search.
 *
 * Tabulka: neon/migrations/0001_price_stats.sql (Neon, ruční spuštění).
 * Všechny funkce chyby logují a spolknou — statistiky nikdy nesmí rozbít sken.
 */

/** Rolling-window entry stored in price_stats.recent_avgs (max 20 items). */
interface RecentAvg {
  avg: number;
  min: number;
  max: number;
  n: number;
  at: string;
}

export interface PriceStatsPrior {
  medianPrice: number;
  avgPrice: number;
  nSamples: number;
  lastUpdated: Date;
  ageDays: number;
}

const RECENT_WINDOW_SIZE = 20;

/** Minimum listings a scan must have found to count into statistics. */
const MIN_LISTINGS_FOR_STATS = 3;

interface PriceStatsRow {
  n_samples: number;
  avg_price: string | number | null;
  median_price: string | number | null;
  recent_avgs: RecentAvg[];
  last_updated: string;
}

/**
 * Returns the stored prior for this car's signature band, or null when
 * there is no row / not enough samples / any DB error.
 */
export async function getPriceStats(car: CarInput): Promise<PriceStatsPrior | null> {
  try {
    const statsKey = generateSignature(car);

    const rows = await sql`
      SELECT n_samples, avg_price, median_price, recent_avgs, last_updated
      FROM price_stats
      WHERE stats_key = ${statsKey}
      LIMIT 1
    ` as PriceStatsRow[];

    if (!rows.length) return null;
    const row = rows[0];

    const nSamples = Number(row.n_samples) || 0;
    const avgPrice = Number(row.avg_price) || 0;
    const medianPrice = Number(row.median_price) || avgPrice;
    if (nSamples < 1 || avgPrice <= 0) return null;

    const lastUpdated = new Date(row.last_updated);
    const ageDays = Math.round((Date.now() - lastUpdated.getTime()) / 86_400_000);

    return { medianPrice, avgPrice, nSamples, lastUpdated, ageDays };
  } catch (err) {
    console.error('[price-stats] getPriceStats failed (continuing without prior):', err);
    return null;
  }
}

/** Median of the rolling window's per-scan averages. */
function computeMedian(window: RecentAvg[]): number {
  const vals = window.map((e) => e.avg).filter((v) => v > 0).sort((a, b) => a - b);
  if (!vals.length) return 0;
  const mid = Math.floor(vals.length / 2);
  return vals.length % 2 ? vals[mid] : Math.round((vals[mid - 1] + vals[mid]) / 2);
}

/**
 * Folds a completed FRESH scan's aggregates into price_stats.
 * Call fire-and-forget, only for non-cached results (no double counting).
 * Stores nothing but our own computed numbers — never listing rows.
 */
export async function updatePriceStats(car: CarInput, scan: ScanData): Promise<void> {
  try {
    if (
      !scan ||
      Number(scan.listingCount) < MIN_LISTINGS_FOR_STATS ||
      Number(scan.averagePrice) <= 0
    ) {
      return;
    }

    const statsKey = generateSignature(car);
    const [brand, model, ...rest] = statsKey.split('-');
    // signature = brand-model-yearBand-kmBand-transmission-fuel; brand/model
    // are slugified single tokens, the four tail parts are fixed-position.
    const fuel = rest.pop() ?? 'any';
    const transmission = rest.pop() ?? 'any';
    const kmBand = rest.pop() ?? '';
    const yearBand = rest.pop() ?? '';
    // Anything left in `rest` belongs to a multi-word model slug
    const modelFull = [model, ...rest].join('-');

    const entry: RecentAvg = {
      avg: Math.round(Number(scan.averagePrice)),
      min: Math.round(Number(scan.minPrice) || 0),
      max: Math.round(Number(scan.maxPrice) || 0),
      n:   Number(scan.listingCount) || 0,
      at:  new Date().toISOString(),
    };

    // Read current window (if any) to compute the new median in JS —
    // simpler and more portable than jsonb gymnastics in SQL.
    const existing = await sql`
      SELECT n_samples, recent_avgs FROM price_stats WHERE stats_key = ${statsKey} LIMIT 1
    ` as { n_samples: number; recent_avgs: RecentAvg[] }[];

    const prevWindow: RecentAvg[] = existing[0]?.recent_avgs ?? [];
    const newWindow = [...prevWindow, entry].slice(-RECENT_WINDOW_SIZE);
    const newMedian = computeMedian(newWindow);

    await sql`
      INSERT INTO price_stats (
        stats_key, brand, model, year_band, km_band, transmission, fuel,
        n_samples, avg_price, median_price, min_price, max_price,
        recent_avgs, last_updated
      ) VALUES (
        ${statsKey}, ${brand}, ${modelFull}, ${yearBand}, ${kmBand}, ${transmission}, ${fuel},
        1, ${entry.avg}, ${newMedian}, ${entry.min}, ${entry.max},
        ${JSON.stringify(newWindow)}::jsonb, now()
      )
      ON CONFLICT (stats_key) DO UPDATE SET
        n_samples    = price_stats.n_samples + 1,
        avg_price    = ((price_stats.avg_price * price_stats.n_samples) + ${entry.avg})
                       / (price_stats.n_samples + 1),
        median_price = ${newMedian},
        min_price    = LEAST(coalesce(price_stats.min_price, ${entry.min}), ${entry.min}),
        max_price    = GREATEST(coalesce(price_stats.max_price, ${entry.max}), ${entry.max}),
        recent_avgs  = ${JSON.stringify(newWindow)}::jsonb,
        last_updated = now()
    `;
  } catch (err) {
    console.error('[price-stats] updatePriceStats failed (non-blocking):', err);
  }
}
