'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import TokenBadge from '@/components/token-badge';
import { useClientAuthState } from '@/lib/client-auth';

/**
 * Cargent — jednotná hlavička pro CELÝ web.
 *
 * Stejné menu na úvodní straně, u nástrojů i u přihlášení:
 *   • vlevo logo,
 *   • jediná položka „Odhad ceny",
 *   • vpravo přihlášení (host) nebo účet + tokeny (přihlášený).
 *
 * Transparentní nahoře, po odscrollování (>20px) průsvitný papírový
 * podklad s blur efektem a hairline lemem.
 *
 * `brandName` se přijímá kvůli zpětné kompatibilitě se staršími call-sity,
 * wordmark se vždy vykresluje jako „Car<i>gent</i>".
 */
type HeaderProps = {
  brandName?: string;
};

export default function Header(_props: HeaderProps = {}) {
  const pathname = usePathname();
  const { role, isSupabaseAuthenticated } = useClientAuthState();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) => pathname === href.split('?')[0];

  const authRedirectSuffix =
    pathname && pathname !== '/' && pathname !== '/prihlaseni' && pathname !== '/registrace'
      ? `?next=${encodeURIComponent(pathname)}`
      : '';
  const accountHref = isSupabaseAuthenticated ? '/dashboard' : '/profil';
  const accountLabel = isSupabaseAuthenticated ? 'Účet' : 'Profil';

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

        {/* ── Nav: jediná položka „Odhad ceny" ────────────────────── */}
        <nav aria-label="Hlavní navigace" className="flex items-center">
          <Link
            href="/odhad-ceny"
            className={[
              'rounded-[8px] px-3 py-2 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
              isActive('/odhad-ceny')
                ? 'font-medium text-ink'
                : 'text-ink-soft hover:text-ink',
            ].join(' ')}
          >
            Odhad ceny
          </Link>
        </nav>

        {/* ── Vpravo: přihlášení / účet ────────────────────────────── */}
        <div className="flex items-center gap-2">
          {role !== 'guest' ? (
            <>
              <TokenBadge />
              <Link
                href={accountHref}
                className={[
                  'rounded-[8px] px-3 py-2 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                  isActive(accountHref) ? 'text-ink' : 'text-ink-soft hover:text-ink',
                ].join(' ')}
              >
                {accountLabel}
              </Link>
            </>
          ) : (
            <Link
              href={`/prihlaseni${authRedirectSuffix}`}
              className="rounded-[10px] px-4 py-2.5 text-[14px] font-medium transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              style={{ color: '#FFFFFF', backgroundColor: '#14171C' }}
            >
              Přihlásit
            </Link>
          )}
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
