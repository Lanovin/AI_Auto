'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const destination = requestedNext && requestedNext !== '/' && requestedNext !== '/prihlaseni' && requestedNext !== '/registrace'
    ? requestedNext
    : '/dashboard';
  const confirmationError = searchParams.get('error') === 'confirmation';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    confirmationError ? 'Potvrzení e-mailu se nezdařilo. Zkuste se přihlásit nebo požádat o nový odkaz.' : null
  );
  const [loading, setLoading] = useState(false);

  // Redirect away if already logged in
  useEffect(() => {
    let active = true;

    async function redirectIfAuthenticated() {
      const response = await fetch('/api/auth/status', { cache: 'no-store' });
      if (!active || !response.ok) {
        return;
      }

      const { authenticated } = await response.json() as { authenticated: boolean };
      if (!authenticated) {
        return;
      }

      window.location.replace(destination);
    }

    void redirectIfAuthenticated();

    return () => {
      active = false;
    };
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

    // Full page navigation so middleware picks up the new session cookie reliably.
    // router.push() can skip the server round-trip via Next.js cache.
    window.location.replace(destination);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-100">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link
            className="inline-block text-[22px] font-medium tracking-[-0.02em] text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-4"
            href="/"
          >
            AutoAI
          </Link>
          <h1 className="mt-4 text-[28px] font-medium tracking-tight text-brand-900">
            Přihlásit se
          </h1>
          <p className="mt-2 text-[15px] text-neutral-500">
            Nemáte účet?{' '}
            <Link
              className="font-medium text-brand-600 hover:text-brand-800"
              href={`/registrace${destination !== '/dashboard' ? `?next=${encodeURIComponent(destination)}` : ''}`}
            >
              Zaregistrujte se
            </Link>
          </p>
        </div>

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-brand-900" htmlFor="email">
              E-mail
            </label>
            <input
              autoComplete="email"
              autoFocus
              className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vas@email.cz"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-brand-900" htmlFor="password">
              Heslo
            </label>
            <input
              autoComplete="current-password"
              className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              id="password"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Vaše heslo"
              required
              type="password"
              value={password}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[14px] leading-normal text-red-700">
              {error}
            </p>
          )}

          <button
            className="mt-2 rounded-full bg-brand-600 px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? 'Přihlašuji…' : 'Přihlásit se'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-neutral-400">
          <Link className="hover:text-neutral-600" href="/">
            ← Zpět na hlavní stránku
          </Link>
        </p>
      </div>
    </main>
  );
}

function mapAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Nesprávný e-mail nebo heslo.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Nejdříve potvrďte e-mail. Zkontrolujte doručenou poštu (i spam).';
  }
  if (message.includes('Too many requests')) {
    return 'Příliš mnoho pokusů. Zkuste to za chvíli.';
  }
  return 'Přihlášení se nezdařilo. Zkuste to prosím znovu.';
}
