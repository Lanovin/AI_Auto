import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

/** PATCH — přepne aktivitu kódu. Tělo: { active: boolean }. */
export async function PATCH(request: Request, { params }: Ctx) {
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

  const { id } = await params;
  let body: { active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('promo_codes')
    .update({ active: Boolean(body.active) })
    .eq('id', id)
    .select('id, code, tokens, max_uses, uses, active, note, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ code: data });
}

/** DELETE — smaže kód (i jeho uplatnění díky ON DELETE CASCADE). */
export async function DELETE(_request: Request, { params }: Ctx) {
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

  const { id } = await params;
  const { error } = await admin.from('promo_codes').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
