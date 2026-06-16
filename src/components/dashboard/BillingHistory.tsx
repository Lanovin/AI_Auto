'use client';

import { useEffect, useState } from 'react';
import type { BillingItem } from '@/app/api/billing/route';

const STATUS_LABEL: Record<string, string> = {
  succeeded: 'Zaplaceno',
  pending: 'Čeká',
  failed: 'Selhalo',
};

const STATUS_CLASS: Record<string, string> = {
  succeeded: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-100 bg-amber-50 text-amber-700',
  failed: 'border-red-100 bg-red-50 text-red-700',
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
    <section className="mt-6 rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Platby</p>
          <h2 className="mt-2 text-[24px] font-medium tracking-tight text-brand-900">Historie plateb</h2>
        </div>
        <a
          href="/predplatne"
          className="text-[14px] font-medium text-brand-600 transition-colors hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          Koupit tokeny →
        </a>
      </div>

      {loading ? (
        <div className="mt-5 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-brand-50" />
          ))}
        </div>
      ) : error ? (
        <p className="mt-5 text-[13px] text-red-600">{error}</p>
      ) : items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/40 px-5 py-8 text-center">
          <p className="text-[14px] text-neutral-500">Žádné platby zatím.</p>
          <a
            href="/cenik"
            className="mt-3 inline-flex rounded-full bg-brand-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-800"
          >
            Koupit tokeny
          </a>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-brand-100">
          {items.map((item, i) => (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${
                i < items.length - 1 ? 'border-b border-brand-100' : ''
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-brand-900">{item.description}</p>
                <p className="mt-0.5 text-[12px] text-neutral-500">{formatDate(item.date)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                    STATUS_CLASS[item.status] ?? 'border-line bg-surface text-ink/60'
                  }`}
                >
                  {STATUS_LABEL[item.status] ?? item.status}
                </span>
                <span className="text-[15px] font-medium tabular-nums text-brand-900">
                  {item.amount.toFixed(0)} {item.currency}
                </span>
                {item.receiptUrl ? (
                  <a
                    href={item.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[12px] font-medium text-brand-600 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
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
