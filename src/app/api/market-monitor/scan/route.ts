import { NextResponse } from 'next/server';
import { getScanOrFetch } from '@/lib/market-cache';
import { runMonitorScan } from '@/lib/run-scan';
import { generateSignature } from '@/lib/car-signature';
import { chargeTokens, refundCharge } from '@/lib/tokens-server';
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

    // Tokeny se strhnou atomicky PŘED skenem; když sken selže, vrátí se.
    // Admin neplatí.
    const isAdmin = await isAdminAuthenticated();
    let usageId: number | null = null;
    let tokensDeducted = 0;
    if (!isAdmin) {
      const charge = await chargeTokens('monitor:scan');
      if (!charge.ok) {
        return NextResponse.json(
          {
            error: charge.status === 401
              ? 'Pro sken trhu se musíte přihlásit a mít předplacené tokeny.'
              : charge.reason,
          },
          { status: charge.status },
        );
      }
      usageId = charge.usageId;
      tokensDeducted = charge.cost;
    }

    let result: Awaited<ReturnType<typeof getScanOrFetch>>;
    try {
      result = await getScanOrFetch(car, runMonitorScan, 3.5, 'monitor');
    } catch (scanErr) {
      console.error('[api/market-monitor/scan] scan failed:', scanErr);
      const refunded = usageId !== null && (await refundCharge(usageId));
      return NextResponse.json(
        {
          error: 'Sken trhu se nepodařilo dokončit. Zkuste to prosím znovu.' +
            (refunded ? ' Tokeny vám byly vráceny.' : ''),
        },
        { status: 500 },
      );
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
