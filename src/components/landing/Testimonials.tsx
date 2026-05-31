/**
 * Testimonials — sociální důkaz.
 *
 * Odpovídá na otázku "proč té ceně věřit?" konkrétními příběhy.
 * Tři citace od různých typů uživatelů (B2C prodávající, B2C kupující, B2B).
 *
 * ⚠️ Placeholdery — nahradit reálnými referencemi.
 */

// TODO: nahradit reálnými referencemi
const testimonials = [
  {
    quote: 'Prodával jsem Octavii a nevěděl jsem, jestli chci 420 nebo 450 tisíc. Cargent ukázal, že podobná auta se prodávají za 435–465 tisíc. Prodal jsem za 455 000 Kč.',
    name: 'Martin K.',
    role: 'Soukromý prodejce, Praha',
    result: 'Prodal o 35 000 Kč víc',
    tone: 'consumer' as const,
  },
  {
    quote: 'Kupoval jsem auto a prodejce chtěl 380 000 Kč. Podle Cargent bylo auto o 25 tisíc předražené. Nakonec jsem koupil za 358 000 Kč.',
    name: 'Tomáš R.',
    role: 'Soukromý kupující, Brno',
    result: 'Ušetřil 22 000 Kč',
    tone: 'consumer' as const,
  },
  {
    quote: 'Používáme Cargent pro výkup vozidel. Místo zdlouhavého průzkumu trhu máme cenu do minuty. Přesnost je srovnatelná s tím, co dřív trvalo hodinu.',
    name: 'Petr V.',
    role: 'Autobazar, střední Čechy',
    result: 'Úspora 1 hodiny na vůz',
    tone: 'dealer' as const,
  },
];

const toneStyles = {
  consumer: {
    result: 'border border-emerald/30 text-emerald',
    resultBg: 'rgba(28,107,87,0.08)',
    dot: 'bg-emerald',
  },
  dealer: {
    result: 'border border-brass/30 text-brass',
    resultBg: 'rgba(176,121,29,0.08)',
    dot: 'bg-brass',
  },
};

export default function Testimonials() {
  return (
    <section
      id="reference"
      className="px-[22px] py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-10 flex flex-col items-center gap-3 text-center">
          <span className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-brass">
            — Co říkají uživatelé
          </span>
          <h2 className="cargent-h2 text-[34px] md:text-[44px]">
            Reálné výsledky,
            <br />
            <i>ne marketingové sliby.</i>
          </h2>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => {
            const style = toneStyles[t.tone];
            return (
              <article
                key={t.name}
                className="flex flex-col gap-5 rounded-[22px] border border-line bg-surface p-6 md:p-7"
                style={{ boxShadow: 'var(--shadow-cargent-card)' }}
              >
                {/* Result badge */}
                <span
                  className={['inline-flex self-start rounded-[8px] px-3 py-1 text-[12px] font-medium', style.result].join(' ')}
                  style={{ backgroundColor: style.resultBg }}
                >
                  {t.result}
                </span>

                {/* Quote */}
                <blockquote className="flex-1 text-[15px] leading-relaxed text-ink-soft">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                {/* Attribution */}
                <footer className="flex items-center gap-3 border-t border-line pt-4">
                  <span
                    className={['h-2 w-2 shrink-0 rounded-full', style.dot].join(' ')}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-[13px] font-medium text-ink">{t.name}</p>
                    <p className="text-[12px] text-faint">{t.role}</p>
                  </div>
                </footer>
              </article>
            );
          })}
        </div>

        <p className="mt-5 text-center text-[12px] text-faint">
          ⚠️ Ukázková reference — nahradit reálnými recenzemi po sběru zpětné vazby.
        </p>
      </div>
    </section>
  );
}
