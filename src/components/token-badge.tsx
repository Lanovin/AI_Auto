'use client';

import { useEffect, useState } from 'react';
import { APP_SESSION_EVENT, getAppSession } from '@/lib/app-session';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { TOKENS_STARTING_BALANCE } from '@/lib/tokens';

// localStorage key for credits when using the legacy session system
const CREDITS_KEY = 'autoai_credits_v1';

function getLocalCredits(): number {
  try {
    const raw = localStorage.getItem(CREDITS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { balance: number };
      if (typeof parsed.balance === 'number') return parsed.balance;
    }
    // First visit — seed the wallet
    const initial = { balance: TOKENS_STARTING_BALANCE };
    localStorage.setItem(CREDITS_KEY, JSON.stringify(initial));
    return TOKENS_STARTING_BALANCE;
  } catch {
    return TOKENS_STARTING_BALANCE;
  }
}

export function setLocalCredits(balance: number) {
  try {
    localStorage.setItem(CREDITS_KEY, JSON.stringify({ balance }));
    window.dispatchEvent(new CustomEvent('autoai:credits-changed'));
  } catch { /* ignore */ }
}

async function fetchSupabaseBalance(): Promise<number | null> {
  try {
    const res = await fetch('/api/tokens/balance', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json() as { balance: number | null };
    return typeof json.balance === 'number' ? json.balance : null;
  } catch {
    return null;
  }
}

export default function TokenBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function refresh() {
      // Try Supabase first if env is configured
      if (hasSupabaseEnv()) {
        const sbBalance = await fetchSupabaseBalance();
        if (sbBalance !== null && mounted) {
          setBalance(sbBalance);
          setVisible(true);
          return;
        }
      }

      // Fall back to localStorage session
      const session = getAppSession();
      if (session.role !== 'guest' && mounted) {
        setBalance(getLocalCredits());
        setVisible(true);
        return;
      }

      if (mounted) setVisible(false);
    }

    refresh();

    // Re-sync when localStorage session changes
    window.addEventListener(APP_SESSION_EVENT, refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('autoai:credits-changed', refresh);

    return () => {
      mounted = false;
      window.removeEventListener(APP_SESSION_EVENT, refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('autoai:credits-changed', refresh);
    };
  }, []);

  if (!visible || balance === null) return null;

  const isLow = balance <= 10;

  return (
    <div
      className={`cargent-mono flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-semibold tabular-nums transition-colors ${
        isLow
          ? 'border-[#9C3A2A]/30 bg-[#9C3A2A]/10 text-[#9C3A2A]'
          : 'border-brass/30 bg-brass/10 text-brass'
      }`}
      title={`Kredit: ${balance} tokenů · 1 T = $0.10`}
    >
      <span aria-hidden="true" className="text-[10px]">◈</span>
      {balance}
    </div>
  );
}
