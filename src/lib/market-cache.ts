import { sql } from './db';
import { generateSignature, type CarInput } from './car-signature';

export type { CarInput };

export interface ScanData {
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  listingCount: number;
  sources: { portal: string; url: string; price: number; title: string }[];
  modelInput: Record<string, unknown>;
  summary?: string;
  markdownText?: string;
}

export interface ScanResult {
  data: ScanData;
  cached: boolean;
  ageHours?: number;
}

interface CachedRow {
  scan_data: ScanData;
  scanned_at: string;
}

/**
 * Returns the freshest cached scan for `signature` if it is newer than `maxAgeDays`.
 * Returns null on cache miss OR if the DB query fails (falls through to fresh scan).
 */
export async function getCachedScan(
  signature: string,
  maxAgeDays = 3.5
): Promise<{ data: ScanData; scannedAt: Date; ageHours: number } | null> {
  try {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();

    const rows = await sql`
      SELECT scan_data, scanned_at
      FROM market_scans
      WHERE car_signature = ${signature}
        AND scanned_at > ${cutoff}::timestamptz
      ORDER BY scanned_at DESC
      LIMIT 1
    ` as CachedRow[];

    if (!rows.length) return null;

    const scannedAt = new Date(rows[0].scanned_at);
    const ageHours = Math.round(((Date.now() - scannedAt.getTime()) / 3_600_000) * 10) / 10;

    return { data: rows[0].scan_data, scannedAt, ageHours };
  } catch (err) {
    console.error('[market-cache] getCachedScan DB error (falling through to fresh scan):', err);
    return null;
  }
}

/**
 * Maximální stáří záznamů ve sdílené cache market_scans.
 *
 * Právní odůvodnění: cache obsahuje malé výňatky z cizích inzerátů (portál,
 * URL, cena, titulek). Krátkodobá technická cache pro opakované dotazy je
 * v pořádku — ale bez mazání by se časem nahromadila paralelní databáze
 * obsahu inzertních portálů, což by mohlo kolidovat se zvláštním právem
 * pořizovatele databáze (směrnice 96/9/ES, AZ § 88 a násl.). Proto se staré
 * záznamy automaticky mažou; dlouhodobé poznatky držíme výhradně jako vlastní
 * odvozené agregáty v price_stats (src/lib/price-stats.ts).
 */
export const MARKET_SCANS_RETENTION_DAYS = 14;

/**
 * Inserts a new scan record. Returns the new row ID, or null if the insert fails.
 * A failed insert is logged but does NOT throw — the scan result is still returned to the user.
 */
export async function saveScan(
  signature: string,
  scanData: ScanData
): Promise<number | null> {
  try {
    const rows = await sql`
      INSERT INTO market_scans (car_signature, scan_data)
      VALUES (${signature}, ${JSON.stringify(scanData)}::jsonb)
      RETURNING id
    ` as { id: number }[];

    // Oportunistický úklid při každém zápisu (žádný cron není potřeba).
    // Index market_scans_scanned_at_idx viz neon/migrations/0001_price_stats.sql.
    sql`
      DELETE FROM market_scans
      WHERE scanned_at < now() - make_interval(days => ${MARKET_SCANS_RETENTION_DAYS})
    `.catch((err: unknown) =>
      console.error('[market-cache] retention cleanup failed (non-blocking):', err)
    );

    return rows[0]?.id ?? null;
  } catch (err) {
    console.error('[market-cache] saveScan DB error (scan data was NOT cached):', err);
    return null;
  }
}

/**
 * High-level helper used by both Market Monitor and Price Estimator.
 *
 * 1. Generates a normalised car signature.
 * 2. Checks the DB cache.
 * 3. On cache hit  → returns cached data immediately.
 * 4. On cache miss → calls `runFreshScan(car)`, persists the result, returns it.
 *
 * DB failures are swallowed so users always get a result (just without caching).
 */
export async function getScanOrFetch(
  car: CarInput,
  runFreshScan: (car: CarInput) => Promise<ScanData>,
  maxAgeDays = 3.5,
  // Optional suffix appended to the cache key — use to separate results by tier or scan type
  signatureSuffix = ''
): Promise<ScanResult> {
  const base = generateSignature(car); // throws on missing required fields
  const signature = signatureSuffix ? `${base}:${signatureSuffix}` : base;

  const cached = await getCachedScan(signature, maxAgeDays);
  if (cached) {
    return { data: cached.data, cached: true, ageHours: cached.ageHours };
  }

  const freshData = await runFreshScan(car);

  // Fire-and-forget — a failed INSERT must not prevent the user from getting their result
  saveScan(signature, freshData).catch((err) =>
    console.error('[market-cache] Background saveScan failed (user still receives data):', err)
  );

  return { data: freshData, cached: false };
}
