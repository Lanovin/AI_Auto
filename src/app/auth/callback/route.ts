import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * Cíl všech Supabase auth redirectů (Google OAuth, potvrzení e-mailu, obnova
 * hesla). Podporuje dva tvary odkazu:
 *
 *   1. `?code=...` (PKCE) — Google OAuth a výchozí e-mailové šablony Supabase.
 *      Funguje jen v prohlížeči, kde uživatel akci zahájil (code verifier je
 *      v cookie). Odkaz z e-mailu otevřený jinde selže → uživatel se přihlásí
 *      ručně (e-mail už je u Supabase potvrzený).
 *   2. `?token_hash=...&type=signup|recovery|email|magiclink` — funguje
 *      v libovolném prohlížeči. Zapneš ho úpravou e-mailových šablon v Supabase
 *      (Authentication → Email Templates) na tvar:
 *      {{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&next=/dashboard
 *
 * V Supabase Dashboard → Authentication → URL Configuration musí být tato
 * adresa v „Redirect URLs“: https://<doména>/auth/callback (a localhost pro dev).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/dashboard';
  const providerError = searchParams.get('error_description') ?? searchParams.get('error');

  // Sanitise next — only allow same-origin relative paths
  const destination = next.startsWith('/') && !next.startsWith('//') && next !== '/' ? next : '/dashboard';
  const failureCode = destination === '/nove-heslo' || type === 'recovery' ? 'reset' : 'confirmation';

  if (!hasSupabaseEnv()) {
    return NextResponse.redirect(`${origin}/prihlaseni?error=confirmation`);
  }

  if (providerError) {
    console.error('[auth/callback] provider error:', providerError);
    return NextResponse.redirect(`${origin}/prihlaseni?error=oauth`);
  }

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${destination}`);
    }
    console.error('[auth/callback] verifyOtp failed:', error.message);
    return NextResponse.redirect(`${origin}/prihlaseni?error=${failureCode}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${destination}`);
    }
    console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
    return NextResponse.redirect(`${origin}/prihlaseni?error=${failureCode}`);
  }

  return NextResponse.redirect(`${origin}/prihlaseni?error=confirmation`);
}
