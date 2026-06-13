'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { ScanHistoryEntry } from '@/lib/supabase/user-data';

const TIER_LABELS: Record<string, string> = {
  quick: 'Rychlý',
  standard: 'Standardní',
  detailed: 'Detailní',
  expert: 'Expertní',
};

/**
 * Výpis historie ocenění v dashboardu + mazání (GDPR — právo na výmaz).
 * Jednotlivé záznamy i celou historii může uživatel smazat sám,
 * bez nutnosti psát podporu. Maže přes DELETE /api/scan-history.
 */
export default function ScanHistoryList({ history }: { history: ScanHistoryEntry[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null); // id záznamu nebo 'all'
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id?: string) {
    if (!id && !window.confirm('Smazat celou historii ocenění? Tuto akci nelze vrátit.')) {
      return;
    }
    setBusy(id ?? 'all');
    setError(null);
    try {
      const res = await fetch(`/api/scan-history${id ? `?id=${encodeURIComponent(id)}` : ''}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? 'Smazání se nepodařilo.');
        return;
      }
      router.refresh();
    } catch {
      setError('Smazání se nepodařilo.');
    } finally {
      setBusy(null);
    }
  }

  if (history.length === 0) {
    return (
      <div className="mt-5 rounded-3xl border border-dashed border-brand-100 bg-brand-50/40 p-5">
        <p className="text-[15px] leading-relaxed text-neutral-500">
          Zatím tu není žádné ocenění. Začněte na{' '}
          <Link
            href="/odhad-ceny"
            className="font-medium text-brand-600 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            odhadu ceny
          </Link>
          {' '}a účet začne dávat smysl i v historii.
        </p>
      </div>
    );
  }

  return (
    <div>
      <ul className="mt-5 flex flex-col gap-3">
        {history.map((scan) => {
          const car = scan.car_data as {
            brand?: string;
            model?: string;
            year?: number;
            mileage?: number;
          };
          const price = scan.average_price
            ? `${Number(scan.average_price).toLocaleString('cs-CZ')} Kč`
            : '—';
          const km = car.mileage
            ? `${Number(car.mileage).toLocaleString('cs-CZ')} km`
            : null;
          const date = new Date(scan.created_at).toLocaleDateString('cs-CZ', {
            day: 'numeric',
            month: 'short',
          });

          return (
            <li
              key={scan.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 px-4 py-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-brand-900">
                  {[car.brand, car.model, car.year].filter(Boolean).join(' ')}
                  {km && <span className="ml-2 font-normal text-neutral-400">{km}</span>}
                </p>
                <p className="mt-1 text-[12px] text-neutral-400">
                  {TIER_LABELS[scan.tier] ?? scan.tier} · {date}
                  {scan.tokens_spent > 0 && ` · ${scan.tokens_spent} T`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="whitespace-nowrap text-[14px] font-medium tabular-nums text-brand-700">
                  {price}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(scan.id)}
                  disabled={busy !== null}
                  aria-label={`Smazat záznam ${[car.brand, car.model].filter(Boolean).join(' ')}`}
                  className="rounded-full px-2 py-1 text-[12px] text-neutral-400 transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50"
                >
                  {busy === scan.id ? '…' : 'Smazat'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-3">
        {error ? (
          <span className="text-[13px] text-red-600">{error}</span>
        ) : (
          <span className="text-[12px] text-neutral-400">
            Historii můžete kdykoli smazat — záznamy neobsahují odkazy ani data z inzerátů.
          </span>
        )}
        <button
          type="button"
          onClick={() => handleDelete()}
          disabled={busy !== null}
          className="shrink-0 rounded-full border border-brand-100 px-3 py-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:border-red-200 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50"
        >
          {busy === 'all' ? 'Mažu…' : 'Smazat historii'}
        </button>
      </div>
    </div>
  );
}
