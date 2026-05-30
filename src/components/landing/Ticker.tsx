import { TICKER_ITEMS, formatCzk } from '@/data/demo';

/**
 * Recent valuations ticker — thin horizontal strip between hero and
 * "How it works". The trick for a seamless loop without JS:
 *
 *   1. Render the same list TWICE side by side (track width = 200%).
 *   2. Translate by -50% over N seconds (CSS keyframes).
 *   3. Because the second copy is identical, the wrap-around is invisible.
 *
 * Pause-on-hover is a CSS-only `animation-play-state: paused` rule in globals.
 */
export default function Ticker() {
  return (
    <section
      aria-label="Nedávná ocenění"
      className="cargent-ticker relative overflow-hidden border-y border-[color:var(--color-line)] bg-paper-2"
    >
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 py-3 px-[22px] md:px-8">
        <span className="cargent-mono shrink-0 rounded border border-[color:var(--color-line)] bg-surface px-2.5 py-1 text-[10px] uppercase tracking-[0.10em] text-ink-soft">
          Nedávná ocenění
        </span>

        <div className="relative flex-1 overflow-hidden">
          {/* Fade edges so the loop seam never shows */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12"
            style={{
              background:
                'linear-gradient(to right, var(--color-paper-2), rgba(239, 237, 228, 0))',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12"
            style={{
              background:
                'linear-gradient(to left, var(--color-paper-2), rgba(239, 237, 228, 0))',
            }}
          />

          {/* Track: 2× content, animates translateX(-50%) */}
          <div className="cargent-ticker-track flex w-max items-center whitespace-nowrap">
            <TickerRow />
            <TickerRow />
          </div>
        </div>
      </div>
    </section>
  );
}

function TickerRow() {
  return (
    <div className="flex items-center" aria-hidden="false">
      {TICKER_ITEMS.map((item, i) => (
        <span key={`${item.model}-${i}`} className="flex items-center">
          <span className="text-[13px] text-ink-soft">{item.model}</span>
          <span className="mx-2 text-faint" aria-hidden="true">
            ·
          </span>
          <span className="cargent-mono text-[13px] font-medium text-brass">
            {formatCzk(item.price)} Kč
          </span>
          <span className="mx-5 h-1 w-1 rounded-full bg-[color:var(--color-line-2)]" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}
