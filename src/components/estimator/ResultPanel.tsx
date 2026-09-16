'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, Printer, RotateCcw } from 'lucide-react';
import { renderMarkdown } from '@/lib/markdown';

export interface EstimateResult {
  markdownText: string;
  averagePrice: number;
  minPrice: number;
  maxPrice: number;
  listingCount: number;
  sources: { portal: string; url: string; price: number; title: string }[];
  summary?: string;
  valuation: {
    dealerBuyPrice: number;
    confidence: number;
    p25: number;
    p50: number;
    p75: number;
    nComps: number;
    computed: boolean;
  } | null;
  cached: boolean;
  ageHours: number | null;
  tokensDeducted: number;
  tier: string;
}

const TIER_LABEL: Record<string, string> = {
  quick: 'Rychlý odhad',
  standard: 'Standardní ocenění',
  detailed: 'Detailní posudek',
  expert: 'Expertní posudek',
};

const fmt = (n: number) => Math.round(n).toLocaleString('cs-CZ');

export default function ResultPanel({
  result,
  carTitle,
  onReset,
}: {
  result: EstimateResult;
  carTitle: string;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => renderMarkdown(result.markdownText || ''), [result.markdownText]);

  const { averagePrice, minPrice, maxPrice, valuation } = result;
  const hasPrice = averagePrice > 0;
  // Poloha ručičky: kde leží doporučená cena uvnitř pásma (0 = min, 1 = max) → −80°…+80°
  const pos = maxPrice > minPrice ? (averagePrice - minPrice) / (maxPrice - minPrice) : 0.5;
  const needleDeg = -80 + Math.min(1, Math.max(0, pos)) * 160;
  const confidencePct = valuation ? Math.round(valuation.confidence * 100) : null;

  async function copy() {
    try {
      const text = `${carTitle}\nTržní cena: ${fmt(averagePrice)} Kč (pásmo ${fmt(minPrice)} – ${fmt(maxPrice)} Kč)\n\n${result.markdownText}`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <section aria-labelledby="result-heading" className="print:p-0">
      {/* ── Hlavička výsledku ─────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">
            {TIER_LABEL[result.tier] ?? 'Ocenění'}
          </p>
          <h2 id="result-heading" className="cargent-h2 mt-2 text-[26px] md:text-[32px]">{carTitle}</h2>
          <p className="mt-2 text-[13px] text-dim">
            {result.cached && result.ageHours != null
              ? `Výsledek z nedávného průzkumu (před ${result.ageHours < 24 ? `${Math.round(result.ageHours)} h` : `${(result.ageHours / 24).toFixed(1)} dny`}) — tokeny za opakované dotazy nešetříme na přesnosti, jen na čase.`
              : `Čerstvý průzkum trhu · ${result.listingCount} inzerátů`}
            {result.tokensDeducted > 0 ? ` · odečteno ${result.tokensDeducted} tokenů` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={copy} className={btnSecondary}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            {copied ? 'Zkopírováno' : 'Kopírovat'}
          </button>
          <button type="button" onClick={() => window.print()} className={btnSecondary}>
            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
            Uložit PDF
          </button>
          <button type="button" onClick={onReset} className={btnSecondary}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Nové ocenění
          </button>
        </div>
      </div>

      {/* ── Cena + ciferník ───────────────────────────────────── */}
      {hasPrice ? (
        <div className="mt-8 grid gap-8 border-y border-line py-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="text-[13px] font-medium text-dim">Doporučená tržní cena</p>
            <p className="cargent-price-pop cargent-mono mt-1 text-[46px] font-medium leading-none text-ink md:text-[58px]">
              {fmt(averagePrice)} <span className="text-[22px] text-ink-soft md:text-[26px]">Kč</span>
            </p>
            <p className="cargent-mono mt-3 text-[14px] text-ink-soft">
              pásmo {fmt(minPrice)} – {fmt(maxPrice)} Kč
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
              {valuation ? (
                <div>
                  <dt className="text-[12px] text-dim">Výkupní cena (bazar)</dt>
                  <dd className="cargent-mono mt-0.5 text-[17px] font-medium text-ink">{fmt(valuation.dealerBuyPrice)} Kč</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[12px] text-dim">Použito inzerátů</dt>
                <dd className="cargent-mono mt-0.5 text-[17px] font-medium text-ink">{valuation?.nComps ?? result.listingCount}</dd>
              </div>
              {confidencePct != null ? (
                <div>
                  <dt className="text-[12px] text-dim">Spolehlivost výpočtu</dt>
                  <dd className={`cargent-mono mt-0.5 text-[17px] font-medium ${confidencePct >= 65 ? 'text-emerald' : confidencePct >= 40 ? 'text-ink' : 'text-negative'}`}>
                    {confidencePct} %
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="flex flex-col items-center md:pr-4">
            <svg viewBox="0 0 220 130" className="h-auto w-[220px]" role="img" aria-label={`Cena ${fmt(averagePrice)} Kč leží v pásmu ${fmt(minPrice)} až ${fmt(maxPrice)} Kč`}>
              <path d="M18 116 A92 92 0 0 1 202 116" fill="none" stroke="rgba(10,27,51,0.12)" strokeWidth="10" strokeLinecap="round" />
              <path d="M18 116 A92 92 0 0 1 202 116" fill="none" stroke="var(--color-brass)" strokeWidth="10" strokeLinecap="round" strokeDasharray="289" strokeDashoffset={289 - 289 * Math.min(1, Math.max(0, pos))} />
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const a = Math.PI - t * Math.PI;
                const x1 = 110 + 78 * Math.cos(a), y1 = 116 - 78 * Math.sin(a);
                const x2 = 110 + 84 * Math.cos(a), y2 = 116 - 84 * Math.sin(a);
                return <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(10,27,51,0.35)" strokeWidth="1.5" />;
              })}
              <g className="cargent-gauge-needle" style={{ transformOrigin: '110px 116px', ['--needle-deg' as string]: `${needleDeg}deg` }}>
                <line x1="110" y1="116" x2="110" y2="42" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />
              </g>
              <circle cx="110" cy="116" r="5" fill="var(--color-ink)" />
            </svg>
            <div className="cargent-mono mt-1 flex w-[220px] justify-between text-[11px] text-faint">
              <span>{fmt(minPrice / 1000)} tis.</span>
              <span>{fmt(maxPrice / 1000)} tis.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-8 rounded-md border border-negative/20 bg-negative/5 px-4 py-3 text-[14px] text-negative">
          Nepodařilo se najít dost inzerátů pro spolehlivou cenu. Zkuste vyšší úroveň nebo mezinárodní srovnání.
        </div>
      )}

      {result.summary ? (
        <p className="mt-8 max-w-[70ch] text-[16px] leading-relaxed text-ink">{result.summary}</p>
      ) : null}

      {/* ── Tělo posudku ─────────────────────────────────────── */}
      <div className="cargent-prose mt-8 max-w-[76ch]" dangerouslySetInnerHTML={{ __html: html }} />

      {/* ── Zdroje ───────────────────────────────────────────── */}
      {result.sources.length > 0 ? (
        <div className="mt-10 border-t border-line pt-6">
          <h3 className="text-[16px] font-bold text-ink">Zdroje — inzeráty, ze kterých cena vychází</h3>
          <ul className="mt-3 divide-y divide-line">
            {result.sources.map((s, i) => (
              <li key={`${s.url}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-[14px]">
                <a href={s.url} target="_blank" rel="nofollow noopener noreferrer" className="cargent-link min-w-0 text-ink hover:text-brass">
                  <span className="font-medium">{s.portal || 'Inzerát'}</span>
                  {s.title ? <span className="text-ink-soft"> — {s.title}</span> : null}
                </a>
                {s.price > 0 ? <span className="cargent-mono shrink-0 text-ink">{fmt(s.price)} Kč</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-faint">
            Odkazy vedou na původní inzeráty na uvedených portálech. Jak s daty pracujeme: <Link href="/zdroje-dat" className="cargent-link">Zdroje dat</Link>.
          </p>
        </div>
      ) : null}
    </section>
  );
}

const btnSecondary =
  'inline-flex items-center gap-1.5 rounded-md border border-line-2 px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2';
