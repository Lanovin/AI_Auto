'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'Přihlášení se nezdařilo.');
        return;
      }
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Něco se pokazilo. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[20px] border border-line bg-surface p-8"
        style={{ boxShadow: 'var(--shadow-cargent-card)' }}
      >
        <h1 className="cargent-h3 text-[24px]">Administrace</h1>
        <p className="mt-2 text-[14px] text-ink-soft">
          Přihlaste se ke správě textů a promo kódů.
        </p>

        <label className="mt-6 block text-[13px] font-medium text-ink-soft">
          Uživatelské jméno
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            className="mt-1.5 w-full rounded-[10px] border border-line-2 bg-paper px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-brass"
          />
        </label>

        <label className="mt-4 block text-[13px] font-medium text-ink-soft">
          Heslo
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-[10px] border border-line-2 bg-paper px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-brass"
          />
        </label>

        {error && (
          <p className="mt-4 rounded-[10px] border border-[#9C3A2A]/30 bg-[#9C3A2A]/10 px-3.5 py-2.5 text-[13px] text-[#9C3A2A]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-[10px] bg-ink px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-60"
          style={{ color: '#FFFFFF' }}
        >
          {loading ? 'Přihlašuji…' : 'Přihlásit se'}
        </button>
      </form>
    </main>
  );
}
