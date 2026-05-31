import { TRUST_ITEMS } from '@/data/demo';

/**
 * TrustStrip — tenký pruh hned pod heroem.
 *
 * Odpovídá na podvědomou otázku "proč věřit tomuto webu?" dřív, než
 * uživatel začne scrollovat. Čtyři konkrétní fakta v lidském jazyce.
 * Žádné technické metriky, žádný jargon.
 */
export default function TrustStrip() {
  return (
    <div
      className="border-y border-line bg-paper-2 px-[22px] py-5 md:px-8"
      aria-label="Klíčové statistiky"
    >
      <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-center gap-6 md:justify-between md:gap-8">
        {TRUST_ITEMS.map((item, i) => (
          <div
            key={item.label}
            className={[
              'flex items-center gap-3',
              // Vertical separator on desktop between items (not after last)
              i < TRUST_ITEMS.length - 1 ? 'md:pr-8 md:border-r md:border-line' : '',
            ].join(' ')}
          >
            <span className="cargent-mono text-[22px] font-medium text-brass">
              {item.stat}
            </span>
            <span className="text-[13px] text-ink-soft">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
