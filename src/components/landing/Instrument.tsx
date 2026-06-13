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
 * Instrument — ukázka výsledku ocenění jako čistá produktová karta
 * (look platformového dashboardu po vzoru brego.io): bílá karta,
 * jemné vlasové předěly, dominantní cena s count-up animací,
 * modrý pruh cenového pásma a zelený badge ověřené historie.
 */
export default function Instrument() {
  const { price, rangeLow, rangeHigh } = DEMO_VALUATION;

  const markerPos = ((price - rangeLow) / (rangeHigh - rangeLow)) * 100;
  const fillScale = 0.62;

  return (
    <article
      className="rounded-[16px] border border-line bg-surface px-6 pb-6 pt-5 md:px-7 md:pb-7"
      style={{ boxShadow: 'var(--shadow-cargent-card)' }}
      aria-label="Ukázka výsledku ocenění"
    >
      {/* ── Card header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3">
        <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-faint">
          Výsledek ocenění · ukázka
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/10 px-3 py-1 text-[11px] font-semibold text-emerald">
          <CheckIcon />
          Historie ověřena
        </span>
      </header>

      <div aria-hidden="true" className="mt-4 h-px bg-line" />

      {/* ── Vehicle line ────────────────────────────────────────────── */}
      <p className="mt-4 text-[19px] font-bold leading-snug tracking-tight text-ink">
        {DEMO_VEHICLE.brand} {DEMO_VEHICLE.model}{' '}
        <span className="text-brass">{DEMO_VEHICLE.variant}</span>
      </p>
      <p className="cargent-mono mt-1.5 text-[12px] text-dim">
        {DEMO_VEHICLE.year} · {formatKm(DEMO_VEHICLE.mileage)} km ·{' '}
        {DEMO_VEHICLE.transmission} · {DEMO_VEHICLE.owners}
      </p>

      {/* ── Price — dominant, count-up ──────────────────────────────── */}
      <div className="mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Doporučená prodejní cena
        </p>
        <div className="mt-2 flex items-baseline gap-2">
          <CountUp
            value={price}
            duration={1400}
            precision={0}
            className="cargent-mono text-[44px] font-medium leading-none text-ink md:text-[50px]"
          />
          <span className="cargent-mono text-[19px] font-medium text-brass">Kč</span>
        </div>
      </div>

      {/* ── Range bar ───────────────────────────────────────────────── */}
      <div className="mt-5">
        <div
          className="relative h-[4px] w-full rounded-full bg-paper-2"
          role="img"
          aria-label={`Cenové pásmo od ${formatCzk(rangeLow)} do ${formatCzk(rangeHigh)} Kč, doporučená cena ${formatCzk(price)} Kč.`}
        >
          <div
            className="cargent-range-fill absolute inset-y-0 left-[19%] h-full rounded-full bg-brass"
            style={{ width: '62%', ['--fill' as string]: String(fillScale) }}
          />
          <div
            className="cargent-range-marker absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink shadow-[0_0_0_1.5px_var(--color-brass)]"
            style={{ ['--marker-pos' as string]: `${markerPos}%` }}
          />
        </div>
        <div className="cargent-mono mt-2.5 flex items-center justify-between text-[11px] text-faint">
          <span>{formatCzk(rangeLow)} Kč</span>
          <span className="text-[10px] uppercase tracking-[0.14em]">reálné rozmezí</span>
          <span>{formatCzk(rangeHigh)} Kč</span>
        </div>
      </div>

      {/* ── Price breakdown — clean rows ────────────────────────────── */}
      <div className="mt-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">
          Co ovlivnilo cenu
        </p>
        <ul className="mt-2">
          {DEMO_PRICE_BREAKDOWN.map((row) => {
            const positive = row.amount > 0;
            return (
              <li
                key={row.label}
                className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 text-[13px] last:border-b-0"
              >
                <span className="text-ink-soft">{row.label}</span>
                <span
                  className={[
                    'cargent-mono shrink-0 text-[13px] font-medium tabular-nums',
                    positive ? 'text-emerald' : 'text-negative',
                  ].join(' ')}
                >
                  {positive ? '+' : '−'}&thinsp;{formatCzk(Math.abs(row.amount))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ── Sources — single line ───────────────────────────────────── */}
      <footer className="mt-5 border-t border-line pt-4">
        <p className="cargent-mono text-[11px] leading-relaxed text-faint">
          Zdroje:{' '}
          {DEMO_SOURCES.map((src, i) => (
            <span key={src.label}>
              <span className={src.verified ? 'text-emerald' : 'text-ink-soft'}>
                {src.label}
                {src.verified ? ' ✓' : ''}
              </span>
              {i < DEMO_SOURCES.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </p>
      </footer>
    </article>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
