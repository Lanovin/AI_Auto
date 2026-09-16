import { NextResponse } from 'next/server';
import { getScanOrFetch, saveScan } from '@/lib/market-cache';
import { runScan } from '@/lib/run-scan';
import { generateSignature, type CarInput } from '@/lib/car-signature';
import { deductTokens, getSessionUser, refundTokens } from '@/lib/tokens-server';
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
// 300 s (Vercel Pro). Interní rozpočet (CLAUDE_TOTAL_BUDGET_MS v run-scan.ts)
// musí zůstat těsně POD touhle hodnotou.
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
        'Ocenění trvalo příliš dlouho a bylo přerušeno. Tokeny jsme vám vrátili. ' +
        'Zkuste to znovu, případně zvolte nižší úroveň (Standardní nebo Rychlá).',
    };
  }

  if (message.includes('ANTHROPIC_API_KEY není nastaven na serveru.')) {
    return { status: 500, error: 'Na serveru chybí ANTHROPIC_API_KEY. Nastavte ji v prostředí (Vercel → Environment Variables).' };
  }

  if (message.includes('You have reached your specified API usage limits')) {
    return { status: 503, error: 'Kapacita AI je momentálně vyčerpaná. Zkuste to prosím později — tokeny jsme vám vrátili.' };
  }

  if (message.startsWith('Anthropic API chyba 401')) {
    return { status: 502, error: 'Serverový klíč k AI je neplatný. Kontaktujte podporu.' };
  }

  if (message.startsWith('Anthropic API chyba 429')) {
    return { status: 503, error: 'AI je dočasně přetížená. Zkuste to znovu za chvíli — tokeny jsme vám vrátili.' };
  }

  if (/^Anthropic API chyba 5\d\d/.test(message)) {
    return { status: 503, error: 'AI je dočasně nedostupná. Zkuste to znovu později — tokeny jsme vám vrátili.' };
  }

  if (message.startsWith('Nepodařilo se parsovat JSON')) {
    return { status: 502, error: 'Výsledek se nepodařilo zpracovat. Zkuste ocenění spustit znovu — tokeny jsme vám vrátili.' };
  }

  return { status: 500, error: 'Ocenění se nepodařilo dokončit. Zkuste to prosím znovu — tokeny jsme vám vrátili.' };
}

/** Extracts the rich CarInput fields from the request body, coercing types. */
function parseRichCarInput(raw: Record<string, unknown>): CarInput {
  const toStr = (v: unknown, max = 200): string | undefined => {
    if (v == null) return undefined;
    const s = String(v).trim().slice(0, max);
    return s === '' ? undefined : s;
  };
  const toNum = (v: unknown): number | undefined => {
    if (v == null || v === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const toArr = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const cleaned = v.slice(0, 60).map((x) => String(x).trim().slice(0, 60)).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  };

  return {
    brand:          String(raw.brand).trim().slice(0, 60),
    model:          String(raw.model).trim().slice(0, 80),
    year:           Number(raw.year),
    mileage:        raw.mileage != null ? Math.max(0, Number(raw.mileage) || 0) : 0,
    transmission:   toStr(raw.transmission, 40),
    fuel:           toStr(raw.fuel, 40) ?? toStr(raw.fuelType, 40),
    trim:           toStr(raw.trim, 80),
    vin:            toStr(raw.vin, 17),
    engineCapacity: toNum(raw.engineCapacity),
    powerKw:        toNum(raw.powerKw),
    drivetrain:     toStr(raw.drivetrain, 40),
    bodyType:       toStr(raw.bodyType, 40),
    color:          toStr(raw.color, 40),
    techCondition:  toStr(raw.techCondition, 60),
    paintCondition: toStr(raw.paintCondition, 60),
    accidents:      toStr(raw.accidents, 80),
    serviceHistory: toStr(raw.serviceHistory, 80),
    owners:         toStr(raw.owners, 20),
    consumption:    toStr(raw.consumption, 20),
    originCountry:  toStr(raw.originCountry, 40),
    tires:          toStr(raw.tires, 60),
    stkValidity:    toStr(raw.stkValidity, 40),
    importDetail:   toStr(raw.importDetail, 80),
    equipment:      toArr(raw.equipment),
    notes:          toStr(raw.notes, 1500),
  };
}

export async function POST(request: Request) {
  // Bookkeeping pro refund při selhání (tokeny se odečítají PŘED skenem).
  let charged: { userId: string; amount: number } | null = null;

  try {
    let body: { car?: Record<string, unknown>; tier?: string; scope?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Neplatné tělo požadavku (očekává se JSON).' }, { status: 400 });
    }
    const { car, tier, scope } = body ?? {};

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

    const actualTier = (tier && TIER_FEATURE[tier]) ? tier : 'standard';
    const actualScope = scope === 'international' ? 'international' : 'czech';
    const feature = TIER_FEATURE[actualTier];

    // Admin (cargent_admin cookie) má neomezené hledání — přeskakuje limit i tokeny.
    const isAdmin = await isAdminAuthenticated();
    const user = isAdmin ? null : await getSessionUser();

    // 1) Přihlášení je podmínkou — každý sken stojí reálné peníze za AI.
    if (!isAdmin && !user) {
      return NextResponse.json(
        { error: 'Pro ocenění vozu se přihlaste. Registrace je zdarma, ocenění se platí tokeny.', code: 'unauthenticated' },
        { status: 401 },
      );
    }

    // 2) Denní limit skenů (právní pojistka proti hromadné extrakci — viz rate-limit.ts).
    if (!isAdmin) {
      const cap = await checkDailyScanCap();
      if (!cap.ok) {
        return NextResponse.json(
          { error: `Dosáhli jste denního limitu ocenění (${cap.limit} za 24 hodin). Zkuste to znovu později.` },
          { status: 429, headers: { 'Retry-After': '3600' } }
        );
      }
    }

    // 3) Odečti tokeny PŘED skenem — bez kreditu se drahý sken vůbec nespustí.
    //    Při selhání skenu se tokeny vrací (finally níže).
    let tokensDeducted = 0;
    if (!isAdmin && user) {
      const deductResult = await deductTokens(feature);
      if (!deductResult.ok) {
        const status = deductResult.code === 'unauthenticated' ? 401 : deductResult.code === 'insufficient' ? 402 : 500;
        return NextResponse.json(
          { error: deductResult.reason, code: deductResult.code, cost: deductResult.cost, balance: deductResult.balance },
          { status },
        );
      }
      tokensDeducted = deductResult.cost;
      if (tokensDeducted > 0) charged = { userId: user.id, amount: tokensDeducted };
    }

    const carInput = parseRichCarInput(car);

    // Vlastní historická statistika jako prior pro model (src/lib/price-stats.ts).
    const prior = await getPriceStats(carInput).catch(() => null);

    const cacheSuffix = actualScope === 'international' ? `${actualTier}:intl` : actualTier;
    const shouldBypassCache = NO_CACHE_TIERS.has(actualTier);

    let result: { data: Awaited<ReturnType<typeof runScan>>; cached: boolean; ageHours: number | null };

    if (shouldBypassCache) {
      const freshData = await runScan(carInput, actualTier, actualScope, prior);
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

    // Sken doběhl — tokeny zůstávají odečtené.
    charged = null;

    if (!result.cached) {
      void updatePriceStats(carInput, result.data);
    }

    // Persist scan to user history (fire-and-forget — never blocks the response)
    if (user) {
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
    }

    return NextResponse.json({
      markdownText:   result.data.markdownText ?? '',
      averagePrice:   result.data.averagePrice,
      minPrice:       result.data.minPrice,
      maxPrice:       result.data.maxPrice,
      listingCount:   result.data.listingCount,
      sources:        result.data.sources,
      summary:        result.data.summary,
      valuation:      result.data.valuation ?? null,
      cached:         result.cached,
      ageHours:       result.ageHours,
      tokensDeducted,
      tier:           actualTier,
    });
  } catch (err) {
    console.error('[api/price-estimator] Unhandled error:', err);
    const { status, error } = mapApiError(err);
    return NextResponse.json({ error }, { status });
  } finally {
    if (charged) {
      const ok = await refundTokens(charged.userId, charged.amount);
      if (!ok) console.error('[price-estimator] REFUND FAILED — manual credit needed:', charged);
    }
  }
}
