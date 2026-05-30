import Link from 'next/link';

const columns = [
  {
    heading: 'Produkt',
    links: [
      { label: 'Ocenit vůz', href: '/odhad-ceny' },
      { label: 'Oceňovací engine', href: '#engine' },
      { label: 'Pro firmy & API', href: '#api' },
      { label: 'Předplatné', href: '/predplatne' },
    ],
  },
  {
    heading: 'Nástroje',
    links: [
      { label: 'Odhad ceny', href: '/odhad-ceny' },
      { label: 'Skaut nabídek', href: '/skaut' },
      { label: 'Monitoring trhu', href: '/monitoring' },
      { label: 'Generátor popisků', href: '/popisky' },
    ],
  },
  {
    heading: 'Společnost',
    links: [
      { label: 'O nás', href: '#' },
      { label: 'Kontakt', href: 'mailto:hello@cargent.cz' },
      { label: 'Ochrana údajů', href: '#' },
      { label: 'Obchodní podmínky', href: '#' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-[color:var(--color-line)] bg-paper-2 px-[22px] py-16 md:px-8 md:py-20">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr_1fr] md:gap-8">
          {/* ── Brand column ────────────────────────────────────── */}
          <div>
            <Link
              href="/"
              aria-label="Cargent — domů"
              className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper-2"
            >
              <FooterLogoGauge />
              <span className="text-[20px] font-semibold tracking-tight text-ink font-display">
                Car<span className="italic text-brass">gent</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-ink-soft">
              AI oceňovací agent pro český trh ojetých vozů. Reálná tržní cena
              s intervalem spolehlivosti, ne jen tip od oka.
            </p>
          </div>

          {/* ── Link columns ────────────────────────────────────── */}
          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-[11px] font-medium uppercase tracking-[0.10em] text-faint">
                {col.heading}
              </h3>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-[14px] text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper-2"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ── Bottom row ────────────────────────────────────────── */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--color-line)] pt-6 text-[12px] text-faint">
          <span>© 2026 Cargent — AI oceňovací agent pro ojeté vozy.</span>
          <span className="cargent-mono flex items-center gap-1.5">
            Postaveno v Česku <span aria-hidden="true">🇨🇿</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterLogoGauge() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" stroke="var(--color-ink)" strokeWidth="1.4" />
      <circle
        cx="16"
        cy="16"
        r="10"
        stroke="var(--color-brass)"
        strokeWidth="1"
        strokeDasharray="1 3"
      />
      <line
        x1="16"
        y1="16"
        x2="22"
        y2="10"
        stroke="var(--color-brass)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="1.6" fill="var(--color-brass)" />
    </svg>
  );
}
