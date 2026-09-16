'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Header from '@/components/landing/Header';
import { createClient } from '@/lib/supabase/client';

export default function NewPasswordPage() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (active) setHasSession(Boolean(user));
    });
    return () => { active = false; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Heslo musí mít alespoň 8 znaků.'); return; }
    if (password !== password2) { setError('Hesla se neshodují.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message.includes('same') ? 'Nové heslo musí být jiné než to staré.' : 'Heslo se nepodařilo změnit. Zkuste odkaz z e-mailu otevřít znovu.');
      return;
    }
    setDone(true);
  }

  return (
    <>
      <Header />
      <main className="flex min-h-[calc(100vh-72px)] items-start justify-center bg-paper px-5 py-14 md:items-center" id="main">
        <div className="w-full max-w-[400px]">
          <h1 className="cargent-h1 text-[30px]">Nové heslo</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-dim">Zvolte nové heslo k účtu.</p>

          <div className="mt-8 rounded-lg border border-line bg-surface p-6" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
            {hasSession === false ? (
              <div>
                <p className="text-[15px] font-medium text-ink">Odkaz už není platný.</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                  Odkazy na obnovu hesla platí jen krátce a jen jednou. Nechte si poslat nový.
                </p>
                <Link href="/zapomenute-heslo" className="cargent-link mt-5 inline-block text-[14px] font-medium text-brass">
                  Poslat nový odkaz
                </Link>
              </div>
            ) : done ? (
              <div>
                <p className="text-[15px] font-medium text-ink">Heslo je změněné.</p>
                <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">Jste přihlášeni a můžete pokračovat do účtu.</p>
                <Link
                  href="/dashboard"
                  className="mt-5 inline-flex rounded-md bg-brass px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2"
                >
                  Přejít do účtu
                </Link>
              </div>
            ) : (
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-ink-soft" htmlFor="password">Nové heslo</label>
                  <input
                    autoComplete="new-password"
                    autoFocus
                    id="password"
                    minLength={8}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Alespoň 8 znaků"
                    required
                    type="password"
                    value={password}
                    className="rounded-md border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:ring-2 focus:ring-brass/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-ink-soft" htmlFor="password2">Heslo znovu</label>
                  <input
                    autoComplete="new-password"
                    id="password2"
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                    type="password"
                    value={password2}
                    className="rounded-md border border-line-2 bg-surface px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:ring-2 focus:ring-brass/20"
                  />
                </div>
                {error ? (
                  <p role="alert" className="rounded-md border border-negative/20 bg-negative/8 px-4 py-3 text-[13px] text-negative">{error}</p>
                ) : null}
                <button
                  disabled={loading || hasSession === null}
                  type="submit"
                  className="rounded-md bg-brass px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? 'Ukládám…' : 'Uložit nové heslo'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
