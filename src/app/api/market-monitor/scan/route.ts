import { NextResponse } from 'next/server';
import { getScanOrFetch } from '@/lib/market-cache';
import { runMonitorScan } from '@/lib/run-scan';
import { generateSignature } from '@/lib/car-signature';
import { deductTokens, getSessionUser, refundTokens } from '@/lib/tokens-server';
import { isAdminAuthenticated } from '@/lib/admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  let charged: { userId: string; amount: number } | null = null;
  try {
    const body = await request.json() as Record<string, unknown>;
    const { brand, model, year, mileage, transmission, fuel } = body;

    try {
      generateSignature({ brand: String(brand ?? ''), model: String(model ?? ''), year: Number(year) });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Neplatná data auta.' },
        { status: 400 }
      );
    }

    // Přihlášení je podmínkou — sken stojí peníze.
    const isAdmin = await isAdminAuthenticated();
    const user = isAdmin ? null : await getSessionUser();
    if (!isAdmin && !user) {
      return NextResponse.json({ error: 'Pro sken trhu se přihlaste.', code: 'unauthenticated' }, { status: 401 });
    }

    let tokensDeducted = 0;
    if (!isAdmin && user) {
      const deductResult = await deductTokens('monitor:scan');
      if (!deductResult.ok) {
        const status = deductResult.code === 'unauthenticated' ? 401 : deductResult.code === 'insufficient' ? 402 : 500;
        return NextResponse.json({ error: deductResult.reason, code: deductResult.code }, { status });
      }
      tokensDeducted = deductResult.cost;
      if (tokensDeducted > 0) charged = { userId: user.id, amount: tokensDeducted };
    }

    const car = {
      brand:        String(brand),
      model:        String(model),
      year:         Number(year),
      mileage:      mileage != null ? Number(mileage) : 0,
      transmission: transmission ? String(transmission) : undefined,
      fuel:         fuel         ? String(fuel)         : undefined,
    };

    const result = await getScanOrFetch(car, runMonitorScan, 3.5, 'monitor');
    charged = null;

    return NextResponse.json({
      tokensDeducted,
      averagePrice: result.data.averagePrice,
      minPrice:     result.data.minPrice,
      maxPrice:     result.data.maxPrice,
      listingCount: result.data.listingCount,
      sources:      result.data.sources,
      summary:      result.data.summary,
      cached:       result.cached,
      ageHours:     result.ageHours ?? null,
    });
  } catch (err) {
    console.error('[api/market-monitor/scan] Unhandled error:', err);
    return NextResponse.json(
      { error: 'Sken se nepodařilo dokončit. Tokeny jsme vám vrátili, zkuste to prosím znovu.' },
      { status: 500 }
    );
  } finally {
    if (charged) await refundTokens(charged.userId, charged.amount);
  }
}
