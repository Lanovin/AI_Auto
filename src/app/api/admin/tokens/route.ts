import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tokens
 * Body: { email: string, amount: number }
 * Přičte tokeny uživateli podle e-mailu. Vyžaduje admin session.
 */
export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Nepřihlášen.' }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY není nastaven.' },
      { status: 503 },
    );
  }

  let body: { email?: unknown; amount?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; amount?: unknown };
  } catch {
    return NextResponse.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const amount = typeof body.amount === 'number' ? Math.floor(body.amount) : NaN;

  if (!email) return NextResponse.json({ error: 'E-mail je povinný.' }, { status: 400 });
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: 'Počet tokenů musí být celé číslo ≥ 1.' }, { status: 400 });
  }

  // Najdi uživatele podle e-mailu přes admin auth API
  const { data: usersData, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    return NextResponse.json({ error: `Chyba při hledání uživatele: ${listError.message}` }, { status: 500 });
  }

  const user = usersData.users.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    return NextResponse.json({ error: `Uživatel s e-mailem „${email}" nenalezen.` }, { status: 404 });
  }

  // Přičti tokeny přes RPC funkci
  const { data: newBalance, error: rpcError } = await admin.rpc('add_tokens', {
    p_user_id: user.id,
    p_amount: amount,
  });

  if (rpcError) {
    return NextResponse.json({ error: `add_tokens selhalo: ${rpcError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email, amount, newBalance });
}
