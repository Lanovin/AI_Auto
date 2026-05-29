import { NextResponse } from 'next/server';
import { getScanOrFetch } from '@/lib/market-cache';
import { runScan } from '@/lib/run-scan';
import { generateSignature } from '@/lib/car-signature';
import { deductTokens } from '@/lib/tokens-server';
import { TOKEN_COSTS, type TokenFeature } from '@/lib/tokens';
import { saveScanHistory } from '@/lib/supabase/user-data';

const TIER_FEATURE: Record<string, TokenFeature> = {
  quick:    'estimator:quick',
  standard: 'estimator:standard',
  detailed: 'estimator:detailed',
  expert:   'estimator:expert',
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Vercel Pro/Enterprise; Free tier is capped at 10 s

function mapApiError(err: unknown): { status: number; error: string } {
  if (!(err instanceof Error)) {
    return { status: 500, error: 'Interní chyba serveru. Zkuste to prosím znovu.' };
  }

  const message = err.message;

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

    const actualTier = (tier && TIER_FEATURE[tier]) ? tier : 'standard';
    const actualScope = scope === 'international' ? 'international' : 'czech';
    const feature = TIER_FEATURE[actualTier];

    const carInput = {
      brand:        String(car.brand),
      model:        String(car.model),
      year:         Number(car.year),
      mileage:      car.mileage != null ? Number(car.mileage) : 0,
      transmission: car.transmission ? String(car.transmission) : undefined,
      fuel:         car.fuel         ? String(car.fuel)         : undefined,
    };

    // Cache key includes tier + scope so Czech and international results are stored separately.
    // Czech scope uses just the tier for backward compatibility with existing cache rows.
    const cacheSuffix = actualScope === 'international' ? `${actualTier}:intl` : actualTier;
    const result = await getScanOrFetch(
      carInput,
      (c) => runScan(c, actualTier, actualScope),
      7,
      cacheSuffix
    );

    // Deduct tokens for Supabase-authenticated users.
    // localStorage users are billed client-side when tokensDeducted === 0.
    // IMPORTANT: token deduction must NEVER throw — if Supabase is unavailable the scan
    // result is still returned and the client falls back to localStorage deduction.
    let tokensDeducted = 0;
    try {
      const deductResult = await deductTokens(feature);
      if (deductResult.ok) {
        tokensDeducted = TOKEN_COSTS[feature];
      } else if (deductResult.reason !== 'Nejste přihlášeni.') {
        // Authenticated but insufficient balance → block (402, not 500)
        return NextResponse.json({ error: deductResult.reason }, { status: 402 });
      }
    } catch (tokenErr) {
      // Defensive fallback — deductTokens should never throw (see tokens-server.ts),
      // but if it does, log it and continue so the user still receives their scan result.
      console.error('[api/price-estimator] deductTokens threw unexpectedly (non-blocking):', tokenErr);
    }

    // Persist scan to user history (fire-and-forget — never blocks the response)
    saveScanHistory({
      car_data: carInput as Record<string, unknown>,
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
      ageHours:       result.ageHours ?? null,
      tokensDeducted,
      tier:           actualTier,
    });
  } catch (err) {
    console.error('[api/price-estimator] Unhandled error:', err);
    const { status, error } = mapApiError(err);
    return NextResponse.json({ error }, { status });
  }
}
