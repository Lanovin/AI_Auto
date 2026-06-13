import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

// Mapování chyb z DB funkce redeem_promo_code() na české hlášky.
const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: 'Tento kód neexistuje nebo už není aktivní.',
  CODE_EXHAUSTED: 'Tento kód už byl vyčerpán.',
  ALREADY_REDEEMED: 'Tento kód jste už jednou uplatnili.',
  NO_PROFILE: 'Profil účtu nebyl nalezen. Zkuste se znovu přihlásit.',
};

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json(
      { ok: false, error: 'Promo kódy vyžadují přihlášení (Supabase není nakonfigurováno).' },
      { status: 503 }
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const code = (body.code ?? '').trim();
  if (!code) {
    return NextResponse.json({ ok: false, error: 'Zadejte promo kód.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, error: 'Pro uplatnění kódu se musíte přihlásit.' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.rpc('redeem_promo_code', {
      p_user_id: user.id,
      p_code: code,
    });

    if (error) {
      const matched = Object.keys(ERROR_MESSAGES).find((key) => error.message.includes(key));
      const message = matched ? ERROR_MESSAGES[matched] : 'Kód se nepodařilo uplatnit.';
      // Logické chyby (neplatný/vyčerpaný kód) → 400, neznámé → 500.
      const status = matched ? 400 : 500;
      if (!matched) console.error('[promo] redeem_promo_code error:', error.message);
      return NextResponse.json({ ok: false, error: message }, { status });
    }

    // RPC vrací řádek { tokens_granted, new_balance }.
    const row = Array.isArray(data) ? data[0] : data;
    const granted = row?.tokens_granted ?? 0;
    const balance = row?.new_balance ?? null;

    return NextResponse.json({ ok: true, granted, balance });
  } catch (err) {
    console.error('[promo] redeem unexpected error:', err);
    return NextResponse.json({ ok: false, error: 'Něco se pokazilo. Zkuste to prosím znovu.' }, { status: 500 });
  }
}
