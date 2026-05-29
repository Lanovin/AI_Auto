'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Sticky landing header.
 *
 *   • Transparent at top, switches to translucent paper bg + backdrop blur
 *     once the user scrolls past 20px (matches design brief).
 *   • Mobile (≤640px): nav links hidden, primary CTA stays visible.
 *   • Logo: small gauge mark SVG + wordmark "Car" + gold italic "gent".
 */
const navItems = [
  { label: 'Nástroje', href: '#services' },
  { label: 'Jak to funguje', href: '#how' },
  { label: 'Engine', href: '#engine' },
  { label: 'Pro firmy', href: '#api' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'sticky top-0 z-40 w-full transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled
          ? 'border-b border-[color:var(--color-line)] bg-[rgba(246,244,238,0.78)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-[22px] py-4 md:px-8">
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <Link
          href="/"
          aria-label="Cargent — domů"
          className="group flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <LogoGauge />
          <span className="text-[20px] font-semibold tracking-tight text-ink font-display">
            Car
            <span className="italic text-brass">gent</span>
          </span>
        </Link>

        {/* ── Nav (desktop) ───────────────────────────────────────── */}
        <nav className="hidden md:flex md:items-center md:gap-7">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-[14px] text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* ── Auth + primary CTA ──────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/prihlaseni"
            className="hidden text-[14px] text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:inline"
          >
            Přihlásit
          </Link>
          <Link
            href="/odhad-ceny"
            style={{ color: '#FFFFFF' }}
            className="rounded-[10px] bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Ocenit vůz
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Small logo mark — miniature gauge that echoes the hero motif. */
function LogoGauge() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
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
