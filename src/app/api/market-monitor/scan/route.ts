import { NextResponse } from 'next/server';
import { getScanOrFetch } from '@/lib/market-cache';
import { runMonitorScan } from '@/lib/run-scan';
import { generateSignature } from '@/lib/car-signature';
import { checkTokenBalance, deductTokens } from '@/lib/tokens-server';
import { isAdminAuthenticated } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Vercel Pro/Enterprise; Free tier is capped at 10 s

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { brand, model, year, mileage, transmission, fuel } = body;

    // Validate required fields early for a clear 400 error
    try {
      generateSignature({ brand: String(brand ?? ''), model: String(model ?? ''), year: Number(year) });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Neplatná data auta.' },
        { status: 400 }
      );
    }

    const car = {
      brand:        String(brand),
      model:        String(model),
      year:         Number(year),
      mileage:      mileage != null ? Number(mileage) : 0,
      transmission: transmission ? String(transmission) : undefined,
      fuel:         fuel         ? String(fuel)         : undefined,
    };

    // Přihlášení a zůstatek ověř PŘED skenem (dřív sken proběhl zdarma
    // pro kohokoli a nepřihlášení „platili" jen v localStorage). Admin neplatí.
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      const affordable = await checkTokenBalance('monitor:scan');
      if (!affordable.ok) {
        return NextResponse.json(
          {
            error: affordable.status === 401
              ? 'Pro sken trhu se musíte přihlásit a mít předplacené tokeny.'
              : affordable.reason,
          },
          { status: affordable.status },
        );
      }
    }

    const result = await getScanOrFetch(car, runMonitorScan, 3.5, 'monitor');

    // Deduct tokens (price set in /admin → Ceník služeb).
    let tokensDeducted = 0;
    if (!isAdmin) {
      const deductResult = await deductTokens('monitor:scan');
      if (deductResult.ok) {
        tokensDeducted = deductResult.cost;
      } else {
        return NextResponse.json({ error: deductResult.reason }, { status: deductResult.reason === 'Nejste přihlášeni.' ? 401 : 402 });
      }
    }

    return NextResponse.json({
      tokensDeducted,
      averagePrice: result.data.averagePrice,
      minPrice:     result.data.minPrice,
      maxPrice:     result.data.maxPrice,
      listingCount: result.data.listingCount,
      sources:      result.data.sources,
      market:       result.data.market ?? null,
      summary:      result.data.summary,
      cached:       result.cached,
      ageHours:     result.ageHours ?? null,
    });
  } catch (err) {
    console.error('[api/market-monitor/scan] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Interní chyba serveru. Zkuste to prosím znovu.' },
      { status: 500 }
    );
  }
}
