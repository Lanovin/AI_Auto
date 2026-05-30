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
 * Instrument card — the visual hero of the landing.
 *
 * Anatomy (top → bottom):
 *   1. Status header: pulsing emerald dot + brand label + VIN
 *   2. Vehicle line (model, year, mileage, trim, owner)
 *   3. Big price (count-up animation in mono brass)
 *   4. Confidence interval text + "verified via Cebia ✓"
 *   5. Range bar: track + animated fill + sliding marker + min/max scale
 *   6. Price breakdown table (+/− factors)
 *   7. Source chips (last one = emerald "Cebia ✓")
 *
 * White card, soft shadow, hairline border, generous internal rhythm.
 * No icons of the "round-gradient-feature" variety — everything is
 * data-oriented and serves the "we show actual numbers" thesis.
 */
export default function Instrument() {
  const { price, rangeLow, rangeHigh, confidencePct } = DEMO_VALUATION;

  // Position of the price marker inside [rangeLow, rangeHigh] as a percentage.
  const markerPos = ((price - rangeLow) / (rangeHigh - rangeLow)) * 100;
  const fillScale = 0.62; // visual width of the central "good range" band

  return (
    <article
      className="relative rounded-[22px] border border-[color:var(--color-line)] bg-surface p-6 md:p-7"
      style={{ boxShadow: 'var(--shadow-cargent)' }}
    >
      {/* Tiny corner brass marker — premium detail */}
      <span
        aria-hidden="true"
        className="absolute -top-px right-7 h-[3px] w-14 rounded-b bg-brass"
      />

      {/* ── Status header ──────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.10em] text-faint">
        <div className="flex items-center gap-2">
          <span
            className="cargent-pulse h-2 w-2 rounded-full bg-emerald"
            aria-hidden="true"
          />
          <span className="font-medium text-ink-soft">Cargent · živé ocenění</span>
        </div>
        <span className="cargent-mono text-[10px] text-faint">
          VIN&nbsp;·&nbsp;{DEMO_VEHICLE.vin}
        </span>
      </header>

      {/* ── Vehicle line ──────────────────────────────────────────── */}
      <p className="mt-5 text-[14px] leading-snug text-ink-soft">
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
        {DEMO_VEHICLE.trim}
        <span className="text-faint"> · </span>
        {DEMO_VEHICLE.owners}
      </p>

      {/* ── Price (count-up) ──────────────────────────────────────── */}
      <div className="mt-6 flex items-baseline gap-2">
        <CountUp
          value={price}
          duration={1400}
          precision={0}
          className="cargent-mono text-[44px] font-medium leading-none text-brass md:text-[52px]"
        />
        <span className="cargent-mono text-[20px] text-brass">Kč</span>
      </div>

      {/* ── Confidence note ───────────────────────────────────────── */}
      <p className="mt-3 text-[13px] text-ink-soft">
        Interval spolehlivosti {confidencePct} % ·{' '}
        <span className="text-emerald">
          <i className="not-italic font-medium">historie ověřena přes Cebia</i> ✓
        </span>
      </p>

      {/* ── Range bar ──────────────────────────────────────────────── */}
      <div className="mt-6">
        <div
          className="relative h-1.5 w-full rounded-full bg-[color:var(--color-line)]"
          role="img"
          aria-label={`Cenové pásmo od ${formatCzk(rangeLow)} do ${formatCzk(rangeHigh)} korun, doporučená cena ${formatCzk(price)} korun.`}
        >
          {/* Animated central fill */}
          <div
            className="cargent-range-fill absolute inset-y-0 left-[19%] h-full rounded-full bg-brass"
            style={{
              width: '62%',
              ['--fill' as string]: String(fillScale),
            }}
          />
          {/* Sliding marker */}
          <div
            className="cargent-range-marker absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink shadow-[0_0_0_1.5px_var(--color-brass)]"
            style={{ ['--marker-pos' as string]: `${markerPos}%` }}
          />
        </div>
        <div className="cargent-mono mt-3 flex items-center justify-between text-[12px] text-faint">
          <span>{formatCzk(rangeLow)}</span>
          <span className="text-ink">{formatCzk(price)}&nbsp;Kč</span>
          <span>{formatCzk(rangeHigh)}</span>
        </div>
      </div>

      {/* ── Price breakdown ────────────────────────────────────────── */}
      <div className="mt-7 rounded-[14px] border border-[color:var(--color-line)] bg-paper-2/40">
        <div className="flex items-center justify-between border-b border-[color:var(--color-line)] px-4 py-2.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.10em] text-ink-soft">
            Rozpad ceny
          </span>
          <span className="text-[11px] text-faint">Faktor → vliv</span>
        </div>
        <ul>
          {DEMO_PRICE_BREAKDOWN.map((row, i) => {
            const isPositive = row.amount > 0;
            const last = i === DEMO_PRICE_BREAKDOWN.length - 1;
            return (
              <li
                key={row.label}
                className={[
                  'flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]',
                  last ? '' : 'border-b border-[color:var(--color-line)]',
                ].join(' ')}
              >
                <span className="text-ink-soft">{row.label}</span>
                <span
                  className={[
                    'cargent-mono text-right text-[13px] font-medium tabular-nums',
                    isPositive ? 'text-emerald' : 'text-[#9C3A2A]',
                  ].join(' ')}
                >
                  {isPositive ? '+' : '−'} {formatCzk(Math.abs(row.amount))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Source chips ──────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-[0.10em] text-faint">Zdroje</span>
        {DEMO_SOURCES.map((src) => (
          <span
            key={src.label}
            className={[
              'inline-flex items-center gap-1 rounded-[6px] border px-2.5 py-1 text-[12px]',
              src.verified
                ? 'border-emerald/30 bg-emerald/8 text-emerald'
                : 'border-[color:var(--color-line-2)] bg-paper-2/60 text-ink-soft',
            ].join(' ')}
            style={src.verified ? { backgroundColor: 'rgba(28, 107, 87, 0.08)' } : undefined}
          >
            {src.label}
            {src.verified ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
          </span>
        ))}
      </div>
    </article>
  );
}
