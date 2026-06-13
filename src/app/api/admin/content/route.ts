import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { CONTENT_REGISTRY, CONTENT_GROUPS, type ContentKey } from '@/lib/content/registry';

export const dynamic = 'force-dynamic';

/**
 * GET — vrátí všechna editovatelná pole (z registry) s aktuální hodnotou
 * (override z DB, nebo výchozí text). Slouží k vykreslení editoru v /admin.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const overrides: Record<string, string> = {};
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data } = await admin.from('site_content').select('key, value');
    for (const row of (data as { key: string; value: string }[] | null) ?? []) {
      overrides[row.key] = row.value;
    }
  }

  const fields = (Object.keys(CONTENT_REGISTRY) as ContentKey[]).map((key) => {
    const def = CONTENT_REGISTRY[key];
    return {
      key,
      group: def.group,
      label: def.label,
      multiline: 'multiline' in def ? Boolean(def.multiline) : false,
      default: def.default,
      value: overrides[key] ?? def.default,
      customized: key in overrides,
    };
  });

  return NextResponse.json({ groups: CONTENT_GROUPS, fields });
}

/**
 * POST — uloží změny textů. Tělo: { entries: { [key]: value } }.
 * Pokud se hodnota rovná výchozímu textu, override z DB se smaže (úklid).
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

  let body: { entries?: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const entries = body.entries ?? {};
  const toUpsert: { key: string; value: string }[] = [];
  const toDelete: string[] = [];

  for (const [key, rawValue] of Object.entries(entries)) {
    // Ignoruj klíče, které neznáme (ochrana proti zápisu cizích dat).
    if (!(key in CONTENT_REGISTRY)) continue;
    const value = typeof rawValue === 'string' ? rawValue : '';
    const def = CONTENT_REGISTRY[key as ContentKey].default;

    if (value === def) {
      toDelete.push(key);
    } else {
      toUpsert.push({ key, value });
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await admin
      .from('site_content')
      .upsert(
        toUpsert.map((e) => ({ ...e, updated_at: new Date().toISOString() })),
        { onConflict: 'key' }
      );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (toDelete.length > 0) {
    const { error } = await admin.from('site_content').delete().in('key', toDelete);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, saved: toUpsert.length, reset: toDelete.length });
}
