'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '@/components/landing/Header';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent('/nove-heslo')}`,
    });
    setLoading(false);
    if (error) {
      setError(error.message.includes('rate') ? 'Příliš mnoho pokusů. Zkuste to za chvíli.' : 'Odeslání se nezdařilo. Zkontrolujte e-mail a zkuste to znovu.');
      return;
    }
    setSent(true);
  }

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-72px)] items-start justify-center bg-paper px-5 py-14 md:items-center" id="main">
        <div className="w-full max-w-[400px]">
          <h1 className="cargent-h1 text-[30px]">Obnova hesla</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-dim">
            Pošleme vám odkaz, přes který si nastavíte nové heslo.
          </p>

          <div className="mt-8 rounded-lg border border-line bg-surface p-6" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
            {sent ? (
              <div>
                <p className="text-[15px] font-medium text-ink">Odkaz je na cestě.</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  Pokud k adrese <strong className="text-ink">{email}</strong> existuje účet, dorazí e-mail s odkazem na nastavení nového hesla. Zkontrolujte i spam.
                </p>
                <Link href="/prihlaseni" className="cargent-link mt-5 inline-block text-[14px] font-medium text-brass">
                  Zpět na přihlášení
                </Link>
              </div>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-ink-soft" htmlFor="email">E-mail</label>
                  <input
                    autoComplete="email"
                    autoFocus
                    id="email"
                    inputMode="email"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vas@email.cz"
                    required
                    type="email"
                    value={email}
                    className="rounded-md border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:ring-2 focus:ring-brass/20"
                  />
                </div>
                {error ? (
                  <p role="alert" className="rounded-md border border-negative/20 bg-negative/8 px-4 py-3 text-[13px] text-negative">{error}</p>
                ) : null}
                <button
                  disabled={loading}
                  type="submit"
                  className="rounded-md bg-brass px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Odesílám…' : 'Poslat odkaz'}
                </button>
                <Link href="/prihlaseni" className="cargent-link self-start text-[13px] text-dim hover:text-ink">
                  Zpět na přihlášení
                </Link>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
