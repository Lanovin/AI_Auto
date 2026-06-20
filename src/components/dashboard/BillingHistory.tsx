'use client';

import { useEffect, useState } from 'react';
import type { BillingItem } from '@/app/api/billing/route';

const STATUS_LABEL: Record<string, string> = {
  succeeded: 'Zaplaceno',
  pending: 'Čeká',
  failed: 'Selhalo',
};

const STATUS_CLASS: Record<string, string> = {
  succeeded: 'border-emerald/25 bg-emerald/8 text-emerald',
  pending: 'border-brass/25 bg-brass/8 text-brass',
  failed: 'border-negative/25 bg-negative/8 text-negative',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('cs-CZ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function BillingHistory() {
  const [items, setItems] = useState<BillingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/billing')
      .then((r) => r.json())
      .then((data: { items?: BillingItem[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setItems(data.items ?? []);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Chyba načítání.');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-6" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">Platby</p>
          <h2 className="cargent-h2 mt-2 text-[24px]">Historie plateb</h2>
        </div>
        <a
          href="/predplatne"
          className="cargent-link text-[14px] font-medium text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
        >
          Koupit tokeny →
        </a>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-paper-2" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-5 text-[13px] text-negative">{error}</p>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-lg border border-line bg-paper-2 px-5 py-8 text-center">
          <p className="text-[14px] text-ink-soft">Žádné platby zatím.</p>
          <a
            href="/cenik"
            className="mt-3 inline-flex rounded-md bg-brass px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brass-2"
          >
            Koupit tokeny
          </a>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-line">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${
                i < items.length - 1 ? 'border-b border-line' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">{item.description}</p>
                <p className="mt-0.5 text-[12px] text-dim">{formatDate(item.date)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`cargent-mono rounded-md border px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${
                    STATUS_CLASS[item.status] ?? 'border-line bg-surface text-dim'
                  }`}
                >
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
                <span className="cargent-mono text-[15px] font-medium text-ink">
                  {item.amount.toFixed(0)} {item.currency}
                </span>
                {item.receiptUrl ? (
                  <a
                    href={item.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cargent-link text-[12px] font-medium text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                  >
                    Faktura
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
