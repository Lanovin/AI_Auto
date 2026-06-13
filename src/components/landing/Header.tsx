'use client';

import Image from 'next/image';
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
 * Transparentní nahoře, po odscrollování (>20px) průsvitný bílý
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
          ? 'border-b border-[color:var(--color-line)] bg-[rgba(255,255,255,0.82)] backdrop-blur-md'
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
          <Image
            src="/logo_cargent.png"
            alt="Cargent"
            width={32}
            height={32}
            className="shrink-0"
            priority
          />
          <span className="text-[20px] font-bold tracking-tight text-ink">
            Car
            <span className="text-brass">gent</span>
          </span>
        </Link>

        {/* ── Nav: jediná položka „Odhad ceny" ────────────────────── */}
        <nav aria-label="Hlavní navigace" className="flex items-center">
          <Link
            href="/odhad-ceny"
            className={[
              'cargent-link mx-3 py-2 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
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
              className="rounded-full bg-brass px-5 py-2.5 text-[14px] font-semibold transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              style={{ color: '#FFFFFF' }}
            >
              Přihlásit
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

