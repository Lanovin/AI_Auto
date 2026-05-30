/**
 * "Jak agent pracuje" — process in 4 numbered steps.
 *
 * Important: NOT 4 separate cards (the AI-template cliché). Instead the
 * 4 cells live inside a single rounded container with internal hairline
 * dividers — visually one instrument, not four widgets. Step number is in
 * mono brass, headline in Fraunces, icon at the bottom turns gold on hover.
 */
const steps = [
  {
    n: '01',
    title: 'Zadáte vůz',
    body: 'VIN nebo značku, model, rok a najeto. Bez registrace, bez kreditky.',
    Icon: IconForm,
  },
  {
    n: '02',
    title: 'Agent sbírá data',
    body: 'Živé inzeráty z AutoESA a TipCars, výbavy, emise, ověřená historie přes Cebia.',
    Icon: IconCollect,
  },
  {
    n: '03',
    title: 'Modelová analýza',
    body: 'Výběr srovnatelných vozů, očištění odlehlých hodnot, regresní úprava na konkrétní vůz.',
    Icon: IconAnalyse,
  },
  {
    n: '04',
    title: 'Ocenění s jistotou',
    body: 'Tržní cena s intervalem spolehlivosti a rozpadem faktorů — víte, proč ta cena je taková.',
    Icon: IconGavel,
  },
];

export default function HowItWorks() {
  return (
    <section id="how" className="px-[22px] py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1240px]">
        <SectionHead
          eyebrow="Jak agent pracuje"
          title={
            <>
              Od značky a roku
              <br />
              po cenu, <i>které věříte.</i>
            </>
          }
        />

        <div
          className="mt-12 grid grid-cols-1 overflow-hidden rounded-[22px] border border-[color:var(--color-line)] bg-surface md:grid-cols-2 lg:grid-cols-4"
          style={{ boxShadow: 'var(--shadow-cargent-card)' }}
        >
          {steps.map((step, i) => {
            // Internal hairline dividers — bottom on mobile, right on desktop.
            // Avoid trailing dividers on the last cells in each row.
            const cellBorders = [
              i < steps.length - 1
                ? 'border-b border-[color:var(--color-line)] md:border-b-0'
                : '',
              i % 2 === 0 ? 'md:border-r md:border-[color:var(--color-line)]' : '',
              i < 2 ? 'md:border-b md:border-[color:var(--color-line)] lg:border-b-0' : '',
              i !== steps.length - 1
                ? 'lg:border-r lg:border-[color:var(--color-line)]'
                : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <article
                key={step.n}
                className={[
                  'group relative flex flex-col gap-4 p-7 transition-colors duration-200 hover:bg-paper-2/40',
                  cellBorders,
                ].join(' ')}
              >
                <span className="cargent-mono text-[12px] font-medium text-brass">
                  {step.n}
                </span>
                <h3 className="cargent-h3 text-[22px]">{step.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-soft">{step.body}</p>
                <step.Icon className="mt-auto h-7 w-7 text-ink-soft transition-colors duration-200 group-hover:text-brass" />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Section header helper (also used by Engine, Segments, CTA) ───────
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
      <h2 className="cargent-h2 text-[36px] md:text-[48px] lg:text-[56px]">{title}</h2>
    </header>
  );
}

// ── Inline SVG icons (thin, linear, brand-neutral) ──────────────────
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
function IconCollect({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.5 2.6 2.5 12.4 0 16M12 4c-2.5 2.6-2.5 12.4 0 16" />
    </svg>
  );
}
function IconAnalyse({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M3.5 18.5l5-7 4 3.5 7-9.5" />
      <circle cx="19.5" cy="5.5" r="1.6" fill="currentColor" />
    </svg>
  );
}
function IconGavel({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M4 20h12" />
      <path d="M8 16l8-8" />
      <rect x="13" y="3" width="6" height="3" rx="0.5" transform="rotate(45 16 4.5)" />
      <rect x="6" y="10" width="6" height="3" rx="0.5" transform="rotate(45 9 11.5)" />
    </svg>
  );
}
