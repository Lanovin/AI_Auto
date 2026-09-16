'use client';

import { useState } from 'react';
import { CREDITS_CHANGED_EVENT } from '@/components/token-badge';

/**
 * Uplatnění promo kódu na dashboardu. Stránka je chráněná server-side, samotné
 * uplatnění ověří uživatele znovu na serveru (/api/promo/redeem).
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
      setResult({ kind: 'ok', msg: `Připsáno ${json.granted} tokenů. Nový zůstatek: ${json.balance} tokenů.` });
      setCode('');
      window.dispatchEvent(new CustomEvent(CREDITS_CHANGED_EVENT));
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setResult({ kind: 'err', msg: 'Něco se pokazilo. Zkuste to prosím znovu.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <p className="text-[13px] text-dim">Promo kód</p>
      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <label className="sr-only" htmlFor="dashboard-promo-code">Promo kód</label>
        <input
          id="dashboard-promo-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Zadejte kód"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-line-2 bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:ring-2 focus:ring-brass/20"
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="shrink-0 rounded-md border border-line-2 px-4 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass disabled:cursor-not-allowed disabled:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
        >
          {loading ? 'Uplatňuji…' : 'Uplatnit'}
        </button>
      </form>
      {result ? (
        <p aria-live="polite" className={`mt-2 text-[13px] font-medium ${result.kind === 'ok' ? 'text-emerald' : 'text-negative'}`}>
          {result.msg}
        </p>
      ) : (
        <p className="mt-2 text-[12.5px] text-faint">Tokeny z kódu se připíší okamžitě.</p>
      )}
    </div>
  );
}
