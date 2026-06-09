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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
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
            <span className="font-display text-[22px] font-semibold tracking-tight text-ink">
              Car<span className="italic" style={{ color: '#B0791D' }}>gent</span>
            </span>
          </Link>
          <h1 className="mt-5 font-display text-[30px] font-medium tracking-tight text-ink" style={{ letterSpacing: '-0.02em' }}>
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
          className="rounded-[22px] border border-line bg-surface p-7"
          style={{ boxShadow: '0 30px 70px -34px rgba(20,23,28,0.22)' }}
        >
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink-soft" htmlFor="email">
                E-mail
              </label>
              <input
                autoComplete="email"
                autoFocus
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                required
                type="email"
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
                className="rounded-[10px] border border-[#9C3A2A]/20 bg-[#9C3A2A]/8 px-4 py-3 text-[13px] leading-normal text-[#9C3A2A]"
              >
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="mt-1 rounded-[10px] px-6 py-3 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50"
              style={{ backgroundColor: '#14171C', color: '#FFFFFF' }}
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

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) return 'Nesprávný e-mail nebo heslo.';
  if (message.includes('Email not confirmed')) return 'Nejdříve potvrďte e-mail. Zkontrolujte doručenou poštu (i spam).';
  if (message.includes('Too many requests')) return 'Příliš mnoho pokusů. Zkuste to za chvíli.';
  return 'Přihlášení se nezdařilo. Zkuste to prosím znovu.';
}

function LogoGauge() {
  return (
    <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="#14171C" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="10" stroke="#B0791D" strokeWidth="1" strokeDasharray="1 3" />
      <line x1="16" y1="16" x2="22" y2="10" stroke="#B0791D" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="#B0791D" />
    </svg>
  );
}
