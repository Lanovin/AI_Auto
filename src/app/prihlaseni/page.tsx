'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/landing/Header';

export default function LoginPage() {
  return (
    <>
      <Header />
      <Suspense>
        <LoginForm />
      </Suspense>
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const destination =
    requestedNext &&
    requestedNext !== '/' &&
    requestedNext !== '/prihlaseni' &&
    requestedNext !== '/registrace'
      ? requestedNext
      : '/dashboard';
  const confirmationError = searchParams.get('error') === 'confirmation';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    confirmationError
      ? 'Potvrzení e-mailu se nezdařilo. Zkuste se přihlásit nebo požádat o nový odkaz.'
      : null,
  );
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function redirectIfAuthenticated() {
      const response = await fetch('/api/auth/status', { cache: 'no-store' });
      if (!active || !response.ok) return;
      const { authenticated } = (await response.json()) as { authenticated: boolean };
      if (authenticated) window.location.replace(destination);
    }
    void redirectIfAuthenticated();
    return () => { active = false; };
  }, [destination]);

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Hodnota bez „@" není e-mail → bereme ji jako admin uživatelské jméno
    // a zkusíme přihlášení do administrace (/api/admin/login).
    if (!email.includes('@')) {
      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email.trim(), password }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (res.ok && json.ok) {
          window.location.replace('/admin');
          return;
        }
        setError(json.error ?? 'Nesprávné jméno nebo heslo.');
      } catch {
        setError('Přihlášení se nezdařilo. Zkuste to prosím znovu.');
      } finally {
        setLoading(false);
      }
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(mapAuthError(error.message));
      setLoading(false);
      return;
    }
    window.location.replace(destination);
  }

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-paper px-5 py-12">
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            <LogoGauge />
            <span className="font-display text-[22px] font-bold tracking-tight text-ink">
              Car<span className="text-brass">gent</span>
            </span>
          </Link>
          <h1 className="cargent-h1 mt-5 text-[30px]">
            Přihlásit se
          </h1>
          <p className="mt-2 text-[14px] text-dim">
            Nemáte účet?{' '}
            <Link
              href={`/registrace${destination !== '/dashboard' ? `?next=${encodeURIComponent(destination)}` : ''}`}
              className="font-medium text-brass transition-colors hover:text-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Zaregistrujte se
            </Link>
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-line bg-surface p-7"
          style={{ boxShadow: 'var(--shadow-cargent)' }}
        >
          {/* Google OAuth */}
          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={() => void handleGoogleSignIn()}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-[10px] border border-line bg-paper-2/50 px-4 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? 'Přesměrovávám…' : 'Pokračovat přes Google'}
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[12px] text-faint">nebo e-mailem</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink-soft" htmlFor="email">
                E-mail
              </label>
              <input
                autoComplete="email"
                autoFocus
                id="email"
                inputMode="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                required
                type="text"
                value={email}
                className="rounded-[10px] border border-line bg-paper-2/50 px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:bg-surface focus:ring-2 focus:ring-brass/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink-soft" htmlFor="password">
                Heslo
              </label>
              <input
                autoComplete="current-password"
                id="password"
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Vaše heslo"
                required
                type="password"
                value={password}
                className="rounded-[10px] border border-line bg-paper-2/50 px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:bg-surface focus:ring-2 focus:ring-brass/20"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg border border-negative/20 bg-negative/8 px-4 py-3 text-[13px] leading-normal text-negative"
              >
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="mt-1 rounded-md bg-brass px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
            >
              {loading ? 'Přihlašuji…' : 'Přihlásit se'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-faint">
          <Link
            href="/"
            className="transition-colors hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            ← Zpět na hlavní stránku
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Nesprávný e-mail nebo heslo.';
  if (message.includes('Email not confirmed')) return 'Nejdříve potvrďte e-mail. Zkontrolujte doručenou poštu (i spam).';
  if (message.includes('Too many requests')) return 'Příliš mnoho pokusů. Zkuste to za chvíli.';
  return 'Přihlášení se nezdařilo. Zkuste to prosím znovu.';
}

function LogoGauge() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="var(--color-ink)" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="10" stroke="var(--color-brass)" strokeWidth="1" strokeDasharray="1 3" />
      <line x1="16" y1="16" x2="22" y2="10" stroke="var(--color-brass)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="var(--color-brass)" />
    </svg>
  );
}
