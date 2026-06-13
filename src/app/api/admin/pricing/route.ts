import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  TOKEN_COSTS,
  TOKEN_COST_LABELS,
  TOKEN_VALUE_CZK,
  type TokenFeature,
} from '@/lib/tokens';

export const dynamic = 'force-dynamic';

/**
 * GET — vrátí všechny zpoplatněné akce s výchozí cenou (z TOKEN_COSTS)
 * a aktuální cenou (override z token_pricing, nebo výchozí).
 * Slouží k vykreslení editoru ceníku v /admin.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const overrides: Record<string, number> = {};
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data } = await admin.from('token_pricing').select('feature, cost');
    for (const row of (data as { feature: string; cost: number }[] | null) ?? []) {
      overrides[row.feature] = row.cost;
    }
  }

  const features = (Object.keys(TOKEN_COSTS) as TokenFeature[]).map((feature) => ({
    feature,
    label: TOKEN_COST_LABELS[feature],
    default: TOKEN_COSTS[feature],
    cost: overrides[feature] ?? TOKEN_COSTS[feature],
    customized: feature in overrides,
  }));

  return NextResponse.json({ tokenValueCzk: TOKEN_VALUE_CZK, features });
}

/**
 * POST — uloží změny cen. Tělo: { entries: { [feature]: cost } }.
 * Pokud se cena rovná výchozí hodnotě, override z DB se smaže (úklid).
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: 'Supabase service-role klíč není nastaven (SUPABASE_SERVICE_ROLE_KEY).' },
      { status: 503 }
    );
  }

  let body: { entries?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const entries = body.entries ?? {};
  const toUpsert: { feature: string; cost: number }[] = [];
  const toDelete: string[] = [];

  for (const [feature, rawCost] of Object.entries(entries)) {
    // Ignoruj klíče, které neznáme (ochrana proti zápisu cizích dat).
    if (!(feature in TOKEN_COSTS)) continue;

    const cost = Number(rawCost);
    if (!Number.isInteger(cost) || cost < 0) {
      return NextResponse.json(
        { error: `Neplatná cena u „${TOKEN_COST_LABELS[feature as TokenFeature]}" — zadejte celé číslo ≥ 0.` },
        { status: 400 }
      );
    }

    if (cost === TOKEN_COSTS[feature as TokenFeature]) {
      toDelete.push(feature);
    } else {
      toUpsert.push({ feature, cost });
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await admin
      .from('token_pricing')
      .upsert(
        toUpsert.map((e) => ({ ...e, updated_at: new Date().toISOString() })),
        { onConflict: 'feature' }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (toDelete.length > 0) {
    const { error } = await admin.from('token_pricing').delete().in('feature', toDelete);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, saved: toUpsert.length, reset: toDelete.length });
}
