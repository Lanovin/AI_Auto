import { SectionHead } from './HowItWorks';

/**
 * "Pro koho" — 4 audience cards. White cards with subtle hover lift +
 * brass icon square. Icons are thin linear SVGs (no rounded gradient
 * shtick), one motif per audience: person, car-shop, bank, shield.
 */
const segments = [
  {
    title: 'Spotřebitelé',
    body: 'Ověřte si nabídku před koupí nebo si ujasněte cenu před prodejem. Bez registrace.',
    Icon: IconPerson,
  },
  {
    title: 'Bazary & dealeři',
    body: 'Konzistentní ocenění napříč týmem, kontrola výkupu i navrhované prodejní ceny.',
    Icon: IconShop,
  },
  {
    title: 'Banky & leasing',
    body: 'Reziduální hodnota a oceňovací API pro úvěrové a leasingové scénáře.',
    Icon: IconBank,
  },
  {
    title: 'Pojišťovny',
    body: 'Aktuální tržní hodnota při likvidacích, podpora pro znalce i call-centra.',
    Icon: IconShield,
  },
];

export default function Segments() {
  return (
    <section id="who" className="px-[22px] py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1240px]">
        <SectionHead
          eyebrow="Pro koho"
          title={
            <>
              Jedna cena. <i>Čtyři důvody</i>
              <br />
              jí věřit.
            </>
          }
        />

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {segments.map((s) => (
            <article
              key={s.title}
              className="group flex flex-col gap-5 rounded-[22px] border border-[color:var(--color-line)] bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[color:var(--color-line-2)]"
              style={{ boxShadow: 'var(--shadow-cargent-card)' }}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-[10px] border border-brass/20 bg-brass/10 text-brass transition-colors duration-200 group-hover:bg-brass/15"
                aria-hidden="true"
              >
                <s.Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="cargent-h3 text-[20px]">{s.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{s.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Inline icons ────────────────────────────────────────────────────
type IconProps = { className?: string };

function IconPerson({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 19.5c1.5-3.5 4.5-5.5 7.5-5.5s6 2 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}
function IconShop({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M3 10l1.5-4.5h15L21 10" />
      <path d="M4 10v9h16v-9" />
      <path d="M9 14h6" />
      <path d="M3 10c0 2 1.5 3 3 3s3-1 3-3" />
      <path d="M9 10c0 2 1.5 3 3 3s3-1 3-3" />
      <path d="M15 10c0 2 1.5 3 3 3s3-1 3-3" />
    </svg>
  );
}
function IconBank({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M3 10l9-5 9 5" strokeLinecap="round" />
      <path d="M4 10v8M9 10v8M15 10v8M20 10v8" />
      <path d="M3 19h18" strokeLinecap="round" />
    </svg>
  );
}
function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M12 3l8 3v6c0 4-3.5 7.5-8 9-4.5-1.5-8-5-8-9V6l8-3z" strokeLinejoin="round" />
      <path d="M9 12l2.2 2.2L15 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
