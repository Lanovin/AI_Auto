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
      <div className="mt-5 rounded-lg border border-dashed border-line-2 bg-paper-2 p-5">
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Zatím tu není žádné ocenění. Začněte na{' '}
          <Link
            href="/odhad-ceny"
            className="cargent-link font-medium text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
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
              className="flex items-center justify-between gap-4 rounded-lg border border-line px-4 py-4 transition-colors hover:border-brass/40 hover:bg-paper-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-ink">
                  {[car.brand, car.model, car.year].filter(Boolean).join(' ')}
                  {km && <span className="cargent-mono ml-2 text-[13px] font-normal text-faint">{km}</span>}
                </p>
                <p className="mt-1 text-[12px] text-dim">
                  {TIER_LABELS[scan.tier] ?? scan.tier} · {date}
                  {scan.tokens_spent > 0 && ` · ${scan.tokens_spent} T`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="cargent-mono whitespace-nowrap text-[14px] font-medium text-ink">
                  {price}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(scan.id)}
                  disabled={busy !== null}
                  aria-label={`Smazat záznam ${[car.brand, car.model].filter(Boolean).join(' ')}`}
                  className="rounded-md px-2 py-1 text-[12px] text-faint transition-colors hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:opacity-50"
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
          <span className="text-[13px] text-negative">{error}</span>
        ) : (
          <span className="text-[12px] text-faint">
            Historii můžete kdykoli smazat — záznamy neobsahují odkazy ani data z inzerátů.
          </span>
        )}
        <button
          type="button"
          onClick={() => handleDelete()}
          disabled={busy !== null}
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-[12px] font-medium text-dim transition-colors hover:border-negative/40 hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:opacity-50"
        >
          {busy === 'all' ? 'Mažu…' : 'Smazat historii'}
        </button>
      </div>
    </div>
  );
}
