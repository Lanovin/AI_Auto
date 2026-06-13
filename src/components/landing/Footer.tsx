import Link from 'next/link';
import { getSiteContent } from '@/lib/content/server';

/**
 * Footer — čistá vícesloupcová patička po vzoru brego.io:
 * světlý podklad, vlasová linka nahoře, značka + sloupce odkazů,
 * dole řádek s copyrightem.
 */
const columns = [
  {
    heading: 'Produkt',
    links: [
      { label: 'Ocenit vůz', href: '/odhad-ceny' },
      { label: 'Co Cargent umí', href: '/#features' },
      { label: 'Jak to funguje', href: '/#how' },
      { label: 'Proč věřit ceně', href: '/#engine' },
      { label: 'Předplatné', href: '/predplatne' },
    ],
  },
  {
    heading: 'Společnost',
    links: [
      { label: 'Kontakt', href: 'mailto:hello@cargent.cz' },
      { label: 'Zdroje dat', href: '/zdroje-dat' },
      { label: 'Ochrana údajů', href: '/ochrana-udaju' },
      { label: 'Obchodní podmínky', href: '/podminky' },
    ],
  },
];

export default async function Footer() {
  const t = await getSiteContent();
  return (
    <footer className="border-t border-line bg-paper-2/60 px-[22px] pb-8 pt-14 md:px-8 md:pt-16">
      <div className="mx-auto max-w-[1240px]">
        <div className="grid gap-10 md:grid-cols-[2fr_1fr_1fr] md:gap-8">
          {/* ── Brand column ────────────────────────────────────── */}
          <div>
            <Link
              href="/"
              aria-label="Cargent — domů"
              className="inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              <FooterLogoGauge />
              <span className="text-[20px] font-bold tracking-tight text-ink">
                Car<span className="text-brass">gent</span>
              </span>
            </Link>
            <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-dim">
              {t('footer.tagline')}
            </p>
          </div>

          {/* ── Link columns ────────────────────────────────────── */}
          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
                {col.heading}
              </h3>
              <ul className="mt-5 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={`${col.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="cargent-link text-[14px] text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
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
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5 text-[12px] text-faint">
          <span>{t('footer.copyright')}</span>
          <span className="flex items-center gap-1.5">
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
