'use client';

import { useState } from 'react';

/**
 * Pole pro uplatnění promo kódu na dashboardu ("Můj účet").
 *
 * Na rozdíl od client-side komponenty `PromoRedeem` se NESPOLÉHÁ na
 * detekci přihlášení v prohlížeči (`useClientAuthState`), která na Vercelu
 * kvůli SSR cookies a hydrataci často vrací `guest` a formulář pak skryje.
 * Dashboard je už chráněný server-side (`supabase.auth.getUser()` v page.tsx),
 * takže tady form vykreslíme bezpodmínečně. Samotné uplatnění ověří uživatele
 * znovu na serveru přes `/api/promo/redeem`.
 */
export default function RedeemCode() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setResult({ kind: 'err', msg: json.error ?? 'Kód se nepodařilo uplatnit.' });
        return;
      }
      setResult({
        kind: 'ok',
        msg: `Připsáno ${json.granted} tokenů. Nový zůstatek: ${json.balance} tokenů.`,
      });
      setCode('');
      // Obnoví odznak kreditu v hlavičce.
      window.dispatchEvent(new CustomEvent('autoai:credits-changed'));
      // Aktualizuje zůstatek a další server-rendered hodnoty na stránce.
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setResult({ kind: 'err', msg: 'Něco se pokazilo. Zkuste to prosím znovu.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-xl border border-line bg-surface p-6" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
      <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">Promo kód</p>
      <h2 className="cargent-h2 mt-2 text-[18px]">Mám kód k uplatnění</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
        Zadejte kód a tokeny se vám okamžitě připíší na účet.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-start gap-2">
        <label className="sr-only" htmlFor="dashboard-promo-code">Promo kód</label>
        <input
          id="dashboard-promo-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Zadejte kód"
          autoComplete="off"
          className="min-w-[140px] flex-1 rounded-md border border-line-2 bg-paper px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-brass focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="rounded-md bg-brass px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
        >
          {loading ? 'Uplatňuji…' : 'Uplatnit'}
        </button>
      </form>

      {result && (
        <p
          aria-live="polite"
          className={[
            'mt-3 text-[13px] font-medium',
            result.kind === 'ok' ? 'text-emerald' : 'text-negative',
          ].join(' ')}
        >
          {result.msg}
        </p>
      )}
    </article>
  );
}
