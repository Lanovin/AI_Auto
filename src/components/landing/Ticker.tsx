import { TICKER_ITEMS, formatCzk } from '@/data/demo';

/**
 * Ticker — nedávná ocenění jako čistý datový pás na světlém podkladu:
 * tučné názvy vozů + modré mono ceny, tečkové oddělovače.
 * Bezešvá smyčka: obsah 2×, posun o -50 % (čisté CSS, pauza na hover).
 */
export default function Ticker() {
  return (
    <section
      aria-label="Nedávná ocenění"
      className="cargent-ticker border-y border-line bg-paper-2 px-[22px] py-0 md:px-8"
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="relative overflow-hidden py-6">
          {/* Fade edges so the loop seam never shows */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16"
            style={{ background: 'linear-gradient(to right, #F3F6FA, rgba(243,246,250,0))' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16"
            style={{ background: 'linear-gradient(to left, #F3F6FA, rgba(243,246,250,0))' }}
          />

          {/* Track: 2× content, animates translateX(-50%) */}
          <div className="cargent-ticker-track flex w-max items-baseline whitespace-nowrap">
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
    <div className="flex items-baseline">
      <span className="mr-8 text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
        Nedávná ocenění
      </span>
      {TICKER_ITEMS.map((item, i) => (
        <span key={`${item.model}-${i}`} className="flex items-baseline">
          <span className="text-[16px] font-bold tracking-tight text-ink">{item.model}</span>
          <span className="cargent-mono ml-3 text-[14px] font-medium text-brass">
            {formatCzk(item.price)} Kč
          </span>
          <span className="mx-7 text-[10px] text-faint" aria-hidden="true">•</span>
        </span>
      ))}
    </div>
  );
}
