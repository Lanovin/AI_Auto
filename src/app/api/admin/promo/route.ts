import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** GET — seznam všech promo kódů (nejnovější první). */
export async function GET() {
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

  const { data, error } = await admin
    .from('promo_codes')
    .select('id, code, tokens, max_uses, uses, active, note, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data ?? [] });
}

/** POST — vytvoří nový promo kód. Tělo: { code, tokens, max_uses, note? }. */
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

  let body: { code?: string; tokens?: number; max_uses?: number; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const code = (body.code ?? '').trim();
  const tokens = Number(body.tokens);
  const maxUses = Number(body.max_uses);
  const note = (body.note ?? '').trim() || null;

  if (!code) {
    return NextResponse.json({ error: 'Zadejte text kódu.' }, { status: 400 });
  }
  if (!Number.isInteger(tokens) || tokens <= 0) {
    return NextResponse.json({ error: 'Počet tokenů musí být kladné celé číslo.' }, { status: 400 });
  }
  if (!Number.isInteger(maxUses) || maxUses <= 0) {
    return NextResponse.json({ error: 'Počet použití musí být kladné celé číslo.' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('promo_codes')
    .insert({ code, tokens, max_uses: maxUses, note })
    .select('id, code, tokens, max_uses, uses, active, note, created_at')
    .single();

  if (error) {
    // Unikátní index na lower(code) → duplicitní kód.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Tento kód už existuje.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code: data });
}
