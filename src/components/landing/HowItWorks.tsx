/**
 * HowItWorks — UX refaktor.
 *
 * Původní verze měla 4 kroky s technickým jazykem:
 *   "Modelová analýza", "Výběr srovnatelných vozů, očištění odlehlých hodnot,
 *   regresní úprava" — pro běžného uživatele nesrozumitelné.
 *
 * Nová verze: 3 kroky, výsledky místo technologie, žádný jargon.
 */
const steps = [
  {
    n: '1',
    title: 'Zadáte auto',
    body: 'Stačí značka, model, rok výroby a kolik má najeto. Hotovo za minutu, bez registrace.',
    Icon: IconForm,
  },
  {
    n: '2',
    title: 'Prohledáme trh',
    body: 'Porovnáme stovky aktuálních inzerátů z předních inzertních portálů. Data jsou vždy čerstvá.',
    Icon: IconSearch,
  },
  {
    n: '3',
    title: 'Dostanete cenu',
    body: 'Ukážeme, za kolik se prodávají srovnatelná auta a co konkrétně ovlivňuje cenu toho vašeho.',
    Icon: IconPrice,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="bg-paper-2 px-[22px] py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1240px]">
        <header className="mb-12 flex flex-col items-center gap-3 text-center">
          <span className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-brass">
            — Jak to funguje
          </span>
          <h2 className="cargent-h2 text-[36px] md:text-[46px]">
            Tři kroky k <i>reálné ceně.</i>
          </h2>
        </header>

        <div
          className="grid grid-cols-1 overflow-hidden rounded-[22px] border border-line bg-surface md:grid-cols-3"
          style={{ boxShadow: 'var(--shadow-cargent-card)' }}
        >
          {steps.map((step, i) => (
            <article
              key={step.n}
              className={[
                'group flex flex-col gap-4 p-8 transition-colors hover:bg-paper-2/30',
                i < steps.length - 1
                  ? 'border-b border-line md:border-b-0 md:border-r'
                  : '',
              ].join(' ')}
            >
              {/* Step number */}
              <div className="flex items-center gap-3">
                <span
                  className="cargent-mono flex h-8 w-8 items-center justify-center rounded-full border border-brass/30 text-[14px] font-medium text-brass"
                  style={{ backgroundColor: 'rgba(176,121,29,0.08)' }}
                  aria-hidden="true"
                >
                  {step.n}
                </span>
              </div>

              <h3 className="cargent-h3 text-[22px]">{step.title}</h3>
              <p className="flex-1 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
              <step.Icon className="mt-2 h-7 w-7 text-ink-soft transition-colors duration-200 group-hover:text-brass" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section header helper (used by Engine, CTA) ───────────────────────
export function SectionHead({
  eyebrow,
  title,
  align = 'left',
}: {
  eyebrow: string;
  title: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <header
      className={[
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start',
      ].join(' ')}
    >
      <span className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-brass">
        — {eyebrow}
      </span>
      <h2 className="cargent-h2 text-[36px] md:text-[48px] lg:text-[52px]">{title}</h2>
    </header>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────
type IconProps = { className?: string };

function IconForm({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      <line x1="7" y1="13" x2="16" y2="13" />
      <line x1="7" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" strokeLinecap="round" />
    </svg>
  );
}

function IconPrice({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" strokeLinecap="round" />
    </svg>
  );
}
