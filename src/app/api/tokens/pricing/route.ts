import { NextResponse } from 'next/server';
import { getTokenPricing } from '@/lib/tokens-server';
import {
  TOKEN_COST_LABELS,
  TOKEN_VALUE_CZK,
  type TokenFeature,
} from '@/lib/tokens';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tokens/pricing — veřejný ceník akcí.
 * Vrací efektivní ceny (admin override z token_pricing, jinak výchozí
 * z TOKEN_COSTS) — UI z nich vykresluje „X tokenů ≈ Y Kč" u nástrojů.
 */
export async function GET() {
  const pricing = await getTokenPricing();

  const features = (Object.keys(pricing) as TokenFeature[]).map((feature) => ({
    feature,
    label: TOKEN_COST_LABELS[feature],
    cost: pricing[feature],
    czk: pricing[feature] * TOKEN_VALUE_CZK,
  }));

  return NextResponse.json({
    tokenValueCzk: TOKEN_VALUE_CZK,
    features,
  });
}
