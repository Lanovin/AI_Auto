import { Check } from 'lucide-react';
import CountUp from './CountUp';
import {
  DEMO_PRICE_BREAKDOWN,
  DEMO_SOURCES,
  DEMO_VALUATION,
  DEMO_VEHICLE,
  formatCzk,
  formatKm,
} from '@/data/demo';

/**
 * Instrument card — ukázka výsledku ocenění.
 *
 * UX refaktor: odebrán VIN z hlavičky (zbytečné číslo pro běžného uživatele),
 * zjednodušen status label, breakdown tabulka má lidské popisky místo
 * technických zkratek.
 */
export default function Instrument() {
  const { price, rangeLow, rangeHigh } = DEMO_VALUATION;

  const markerPos = ((price - rangeLow) / (rangeHigh - rangeLow)) * 100;
  const fillScale = 0.62;

  return (
    <article
      className="relative rounded-[22px] border border-line bg-surface p-6 md:p-7"
      style={{ boxShadow: 'var(--shadow-cargent)' }}
      aria-label="Ukázka výsledku ocenění"
    >
      {/* Brass top bar — premium detail */}
      <span aria-hidden="true" className="absolute -top-px right-7 h-[3px] w-14 rounded-b bg-brass" />

      {/* ── Status header — simplified, no VIN ──────────────────── */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="cargent-pulse h-2 w-2 rounded-full bg-emerald" aria-hidden="true" />
          <span className="text-[13px] font-medium text-ink-soft">Ukázka výsledku</span>
        </div>
        <span className="rounded-full border border-emerald/30 bg-emerald/8 px-2.5 py-0.5 text-[11px] font-medium text-emerald"
          style={{ backgroundColor: 'rgba(28,107,87,0.08)' }}>
          Historie ověřena ✓
        </span>
      </header>

      {/* ── Vehicle line ──────────────────────────────────────────── */}
      <p className="mt-4 text-[14px] leading-snug text-ink-soft">
        <span className="font-semibold text-ink">
          {DEMO_VEHICLE.brand} {DEMO_VEHICLE.model} {DEMO_VEHICLE.variant}
        </span>
        <span className="text-faint"> · </span>
        <span className="cargent-mono">{DEMO_VEHICLE.year}</span>
        <span className="text-faint"> · </span>
        <span className="cargent-mono">{formatKm(DEMO_VEHICLE.mileage)} km</span>
        <span className="text-faint"> · </span>
        {DEMO_VEHICLE.transmission}
        <span className="text-faint"> · </span>
        {DEMO_VEHICLE.owners}
      </p>

      {/* ── Price — dominant, count-up ────────────────────────────── */}
      <div className="mt-5">
        <p className="text-[12px] font-medium uppercase tracking-[0.10em] text-faint">
          Doporučená prodejní cena
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <CountUp
            value={price}
            duration={1400}
            precision={0}
            className="cargent-mono text-[46px] font-medium leading-none text-brass md:text-[52px]"
          />
          <span className="cargent-mono text-[20px] text-brass">Kč</span>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-soft">
          Reálné rozmezí: {formatCzk(rangeLow)} — {formatCzk(rangeHigh)} Kč
        </p>
      </div>

      {/* ── Range bar ──────────────────────────────────────────────── */}
      <div className="mt-5">
        <div
          className="relative h-1.5 w-full rounded-full bg-line"
          role="img"
          aria-label={`Cenové pásmo od ${formatCzk(rangeLow)} do ${formatCzk(rangeHigh)} Kč, doporučená cena ${formatCzk(price)} Kč.`}
        >
          <div
            className="cargent-range-fill absolute inset-y-0 left-[19%] h-full rounded-full bg-brass"
            style={{ width: '62%', ['--fill' as string]: String(fillScale) }}
          />
          <div
            className="cargent-range-marker absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink shadow-[0_0_0_1.5px_var(--color-brass)]"
            style={{ ['--marker-pos' as string]: `${markerPos}%` }}
          />
        </div>
        <div className="cargent-mono mt-2 flex items-center justify-between text-[11px] text-faint">
          <span>Min: {formatCzk(rangeLow)}</span>
          <span>Max: {formatCzk(rangeHigh)}</span>
        </div>
      </div>

      {/* ── Price breakdown — human labels ────────────────────────── */}
      <div className="mt-6 rounded-[14px] border border-line bg-paper-2/40">
        <p className="border-b border-line px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.10em] text-ink-soft">
          Co ovlivnilo cenu
        </p>
        <ul>
          {DEMO_PRICE_BREAKDOWN.map((row, i) => {
            const positive = row.amount > 0;
            const last = i === DEMO_PRICE_BREAKDOWN.length - 1;
            return (
              <li
                key={row.label}
                className={['flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]', last ? '' : 'border-b border-line'].join(' ')}
              >
                <span className="text-ink-soft">{row.label}</span>
                <span className={['cargent-mono text-right text-[13px] font-medium tabular-nums', positive ? 'text-emerald' : 'text-[#9C3A2A]'].join(' ')}>
                  {positive ? '+' : '−'} {formatCzk(Math.abs(row.amount))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Sources ───────────────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-faint">Data z:</span>
        {DEMO_SOURCES.map((src) => (
          <span
            key={src.label}
            className={['inline-flex items-center gap-1 rounded-[6px] border px-2.5 py-1 text-[12px]',
              src.verified ? 'border-emerald/30 text-emerald' : 'border-line-2 text-ink-soft'].join(' ')}
            style={src.verified ? { backgroundColor: 'rgba(28,107,87,0.08)' } : undefined}
          >
            {src.label}
            {src.verified ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
          </span>
        ))}
      </div>
    </article>
  );
}
