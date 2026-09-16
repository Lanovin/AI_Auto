'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { TOKEN_VALUE_CZK } from '@/lib/tokens';

export const CREDITS_CHANGED_EVENT = 'autoai:credits-changed';

async function fetchBalance(): Promise<number | null> {
  try {
    const res = await fetch('/api/tokens/balance', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json() as { balance: number | null };
    return typeof json.balance === 'number' ? json.balance : null;
  } catch {
    return null;
  }
}

/** Odznak s kreditem v hlavičce. Zobrazí se jen přihlášeným (Supabase). */
export default function TokenBadge() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    let mounted = true;

    async function refresh() {
      const next = await fetchBalance();
      if (mounted) setBalance(next);
    }

    void refresh();
    window.addEventListener(CREDITS_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      mounted = false;
      window.removeEventListener(CREDITS_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  if (balance === null) return null;

  const isLow = balance <= 10;

  return (
    <Link
      href="/cenik"
      className={`cargent-mono flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 ${
        isLow
          ? 'border-negative/30 bg-negative/8 text-negative hover:bg-negative/12'
          : 'border-brass/30 bg-brass/8 text-brass hover:bg-brass/12'
      }`}
      title={`Kredit: ${balance} tokenů · 1 token ≈ ${TOKEN_VALUE_CZK} Kč · kliknutím dobijete`}
      aria-label={`Kredit ${balance} tokenů, dobít`}
    >
      <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
      {balance}
    </Link>
  );
}
