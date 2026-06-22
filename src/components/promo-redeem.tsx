'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/**
 * Pole pro uplatnění promo kódu v profilu. Po úspěchu připíše tokeny na
 * účet (server-side přes RPC) a pošle event `autoai:credits-changed`,
 * aby se odznak s kreditem v hlavičce okamžitě obnovil.
 *
 * Funguje jen pro reálně přihlášené (Supabase) účty — demo/host režim
 * nemá serverový profil, na který by se tokeny daly připsat.
 *
 * Přihlášení zjišťujeme ze serveru přes `/api/auth/status` (čte session
 * cookie), ne client-side detekcí — ta na Vercelu kvůli hydrataci často
 * selhala a formulář se schoval i přihlášenému uživateli.
 */
export default function PromoRedeem() {
  const [ready, setReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/auth/status', { cache: 'no-store' });
        if (!active || !res.ok) return;
        const json = (await res.json()) as { authenticated?: boolean };
        setIsAuthenticated(Boolean(json.authenticated));
      } catch {
        if (active) setIsAuthenticated(false);
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

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
    } catch {
      setResult({ kind: 'err', msg: 'Něco se pokazilo. Zkuste to prosím znovu.' });
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      <div className="container">
        <article className="rounded-[20px] border border-line bg-surface p-6 md:p-7">
          <h2 className="cargent-h3 text-[20px] text-ink">Mám promo kód</h2>
          <p className="mt-1 text-[14px] text-ink-soft">
            Zadejte kód a získané tokeny se vám připíší na účet.
          </p>

          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-start gap-3">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Zadejte promo kód"
                className="min-w-[200px] flex-1 rounded-[10px] border border-line-2 bg-paper px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-brass"
              />
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="rounded-[10px] bg-ink px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-60"
                style={{ color: '#FFFFFF' }}
              >
                {loading ? 'Uplatňuji…' : 'Uplatnit kód'}
              </button>
            </form>
          ) : (
            <p className="mt-4 rounded-[10px] border border-line bg-paper-2 px-4 py-3 text-[14px] text-ink-soft">
              Pro uplatnění promo kódu se nejdřív{' '}
              <Link href="/prihlaseni" className="font-medium text-brass underline-offset-2 hover:underline">
                přihlaste
              </Link>{' '}
              ke svému účtu.
            </p>
          )}

          {result && (
            <p
              className={[
                'mt-3 text-[14px]',
                result.kind === 'ok' ? 'text-emerald' : 'text-[#9C3A2A]',
              ].join(' ')}
            >
              {result.msg}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
