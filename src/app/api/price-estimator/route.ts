import { NextResponse } from 'next/server';
import { getScanOrFetch, saveScan } from '@/lib/market-cache';
import { runScan } from '@/lib/run-scan';
import { generateSignature, type CarInput } from '@/lib/car-signature';
import { deductTokens } from '@/lib/tokens-server';
import { type TokenFeature } from '@/lib/tokens';
import { saveScanHistory } from '@/lib/supabase/user-data';
import { getPriceStats, updatePriceStats } from '@/lib/price-stats';
import { checkDailyScanCap } from '@/lib/rate-limit';
import { isAdminAuthenticated } from '@/lib/admin/auth';

const TIER_FEATURE: Record<string, TokenFeature> = {
  quick:    'estimator:quick',
  standard: 'estimator:standard',
  detailed: 'estimator:detailed',
  expert:   'estimator:expert',
};

/** Tiers that bypass the shared cache. Their rich, user-specific inputs
 *  (condition, equipment, accidents, ...) make cache reuse misleading. */
const NO_CACHE_TIERS = new Set(['detailed', 'expert']);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Vercel Pro umožňuje až 300 s běhu funkce (Free je stropnuté na 10 s).
// Expertní/detailní posudek s 9 web searchi + dlouhým streamem 120 s často
// nestihl → 504. Dáváme plný strop; interní rozpočet (CLAUDE_TOTAL_BUDGET_MS
// v run-scan.ts) musí zůstat těsně POD touhle hodnotou.
export const maxDuration = 300;

function mapApiError(err: unknown): { status: number; error: string } {
  if (!(err instanceof Error)) {
    return { status: 500, error: 'Interní chyba serveru. Zkuste to prosím znovu.' };
  }

  const message = err.message;

  if (message.startsWith('TIMEOUT:')) {
    return {
      status: 504,
      error:
        'Posudek trval příliš dlouho a byl přerušen (server timeout). ' +
        'Zkuste posudek zopakovat, případně zvolte nižší tier (Standardní nebo Rychlý). ' +
        'Tokeny nebyly strhnuty — volání bylo přerušeno před dokončením.',
    };
  }

  if (message.includes('ANTHROPIC_API_KEY není nastaven na serveru.')) {
    return {
      status: 500,
      error: 'Na serveru chybí ANTHROPIC_API_KEY. Nastavte ji ve Vercel Project Settings -> Environment Variables.',
    };
  }

  if (message.includes('You have reached your specified API usage limits')) {
    return {
      status: 503,
      error: 'Anthropic API limit je vycerpany. Zkontrolujte billing a Usage limits v Anthropic Console.',
    };
  }

  if (message.startsWith('Anthropic API chyba 401')) {
    return {
      status: 502,
      error: 'Serverovy ANTHROPIC_API_KEY je neplatny nebo expirovany.',
    };
  }

  if (message.startsWith('Anthropic API chyba 429')) {
    return {
      status: 503,
      error: 'Anthropic API je docasne rate-limited. Zkuste to znovu za chvili.',
    };
  }

  if (/^Anthropic API chyba 5\d\d/.test(message)) {
    return {
      status: 503,
      error: 'Anthropic API je docasne nedostupna. Zkuste to znovu pozdeji.',
    };
  }

  return { status: 500, error: message };
}

/** Extracts the rich CarInput fields from the request body, coercing types. */
function parseRichCarInput(raw: Record<string, unknown>): CarInput {
  const toStr = (v: unknown): string | undefined => {
    if (v == null) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  };
  const toNum = (v: unknown): number | undefined => {
    if (v == null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const toArr = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const cleaned = v.map((x) => String(x).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  };

  return {
    brand:          String(raw.brand),
    model:          String(raw.model),
    year:           Number(raw.year),
    mileage:        raw.mileage != null ? Number(raw.mileage) : 0,
    transmission:   toStr(raw.transmission),
    fuel:           toStr(raw.fuel) ?? toStr(raw.fuelType),
    // — rich fields (only set if user supplied them) —
    trim:           toStr(raw.trim),
    vin:            toStr(raw.vin),
    engineCapacity: toNum(raw.engineCapacity),
    powerKw:        toNum(raw.powerKw),
    drivetrain:     toStr(raw.drivetrain),
    bodyType:       toStr(raw.bodyType),
    color:          toStr(raw.color),
    techCondition:  toStr(raw.techCondition),
    paintCondition: toStr(raw.paintCondition),
    accidents:      toStr(raw.accidents),
    serviceHistory: toStr(raw.serviceHistory),
    owners:         toStr(raw.owners),
    consumption:    toStr(raw.consumption),
    originCountry:  toStr(raw.originCountry),
    equipment:      toArr(raw.equipment),
    notes:          toStr(raw.notes),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { car?: Record<string, unknown>; tier?: string; scope?: string };
    const { car, tier, scope } = body;

    if (!car) {
      return NextResponse.json({ error: 'Chybí data auta (pole "car").' }, { status: 400 });
    }

    // Validate required fields early for a clear 400 error
    try {
      generateSignature({
        brand: String(car.brand ?? ''),
        model: String(car.model ?? ''),
        year:  Number(car.year),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Neplatná data auta.' },
        { status: 400 }
      );
    }

    // Admin (přihlášený do /admin přes cargent_admin cookie) má neomezené hledání:
    // přeskakuje denní limit i strhávání tokenů. Viz isAdminAuthenticated().
    const isAdmin = await isAdminAuthenticated();

    // Denní limit skenů (právní pojistka proti hromadné extrakci — viz rate-limit.ts).
    // Admina se netýká.
    if (!isAdmin) {
      const cap = await checkDailyScanCap();
      if (!cap.ok) {
        return NextResponse.json(
          {
            error: `Dosáhli jste denního limitu ocenění (${cap.limit} za 24 hodin). Zkuste to znovu později.`,
          },
          { status: 429, headers: { 'Retry-After': '3600' } }
        );
      }
    }

    const actualTier = (tier && TIER_FEATURE[tier]) ? tier : 'standard';
    const actualScope = scope === 'international' ? 'international' : 'czech';
    const feature = TIER_FEATURE[actualTier];

    const carInput = parseRichCarInput(car);

    // Vlastní historická statistika jako prior pro model (src/lib/price-stats.ts).
    // Při chybě / prázdné DB je null a sken běží beze změny.
    const prior = await getPriceStats(carInput).catch(() => null);

    // For detailed/expert we ALWAYS run fresh — rich inputs vary per user and
    // a cached result for a different condition/equipment would be misleading.
    // We still write the result to cache for analytics/future generic queries.
    const cacheSuffix = actualScope === 'international' ? `${actualTier}:intl` : actualTier;
    const shouldBypassCache = NO_CACHE_TIERS.has(actualTier);

    let result: { data: Awaited<ReturnType<typeof runScan>>; cached: boolean; ageHours: number | null };

    if (shouldBypassCache) {
      const freshData = await runScan(carInput, actualTier, actualScope, prior);
      // fire-and-forget save (best-effort; never blocks)
      const base = generateSignature(carInput);
      saveScan(`${base}:${cacheSuffix}`, freshData).catch((err) =>
        console.error('[price-estimator] background saveScan failed:', err)
      );
      result = { data: freshData, cached: false, ageHours: null };
    } else {
      const cached = await getScanOrFetch(
        carInput,
        (c) => runScan(c, actualTier, actualScope, prior),
        7,
        cacheSuffix
      );
      result = { data: cached.data, cached: cached.cached, ageHours: cached.ageHours ?? null };
    }

    // Fold fresh aggregates into our own derived statistics DB — never from
    // cache hits (no double counting). Fire-and-forget, never blocks.
    if (!result.cached) {
      void updatePriceStats(carInput, result.data);
    }

    let tokensDeducted = 0;
    // Admin nehradí tokeny — neomezené hledání ceny.
    const deductResult = isAdmin
      ? ({ ok: true, cost: 0 } as const)
      : await deductTokens(feature);

    if (deductResult.ok) {
      tokensDeducted = deductResult.cost;
    } else if (deductResult.reason === 'Nejste přihlášeni.') {
      return NextResponse.json(
        { error: 'Pro ocenění vozu se musíte přihlásit a mít předplacené tokeny.' },
        { status: 401 },
      );
    } else {
      // Authenticated but insufficient balance → 402
      return NextResponse.json({ error: deductResult.reason }, { status: 402 });
    }

    // Persist scan to user history (fire-and-forget — never blocks the response)
    saveScanHistory({
      car_data: carInput as unknown as Record<string, unknown>,
      tier: actualTier,
      average_price: result.data.averagePrice,
      min_price: result.data.minPrice,
      max_price: result.data.maxPrice,
      listing_count: result.data.listingCount,
      tokens_spent: tokensDeducted,
    }).catch((err) =>
      console.error('[price-estimator] saveScanHistory failed (non-blocking):', err)
    );

    return NextResponse.json({
      markdownText:   result.data.markdownText ?? '',
      averagePrice:   result.data.averagePrice,
      minPrice:       result.data.minPrice,
      maxPrice:       result.data.maxPrice,
      listingCount:   result.data.listingCount,
      sources:        result.data.sources,
      summary:        result.data.summary,
      cached:         result.cached,
      ageHours:       result.ageHours,
      tokensDeducted,
      tier:           actualTier,
    });
  } catch (err) {
    console.error('[api/price-estimator] Unhandled error:', err);
    const { status, error } = mapApiError(err);
    return NextResponse.json({ error }, { status });
  }
}
