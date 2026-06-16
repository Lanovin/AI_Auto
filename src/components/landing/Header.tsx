'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import TokenBadge from '@/components/token-badge';
import { useClientAuthState } from '@/lib/client-auth';

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

  const navLinks = [
    { href: '/odhad-ceny', label: 'Odhad ceny' },
    { href: '/cenik', label: 'Ceník' },
    { href: '/kontakt', label: 'Kontakt' },
  ];

  return (
    <header
      className={[
        'sticky top-0 z-40 w-full transition-[background-color,border-color,backdrop-filter] duration-300',
        scrolled
          ? 'border-b border-line bg-[rgba(255,255,255,0.88)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-310 items-center justify-between gap-6 px-5.5 py-5 md:px-8">
        {/* ── Logo ─────────────────────────────────────────────────── */}
        <Link
          href="/"
          aria-label="Cargent — domů"
          className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <Image
            src="/logo_cargent.png"
            alt="Cargent"
            width={40}
            height={40}
            className="shrink-0"
            priority
          />
          <span className="text-[22px] font-bold tracking-tight text-ink">
            Car
            <span className="text-brass">gent</span>
          </span>
        </Link>

        {/* ── Navigace ─────────────────────────────────────────────── */}
        <nav aria-label="Hlavní navigace" className="hidden items-center gap-1 sm:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={[
                'rounded-lg px-3 py-2 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                isActive(href)
                  ? 'bg-brass/10 text-brass'
                  : 'text-ink/70 hover:bg-ink/5 hover:text-ink',
              ].join(' ')}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Vpravo: tokeny + přihlášení ──────────────────────────── */}
        <div className="flex items-center gap-2">
          {role !== 'guest' ? (
            <>
              <TokenBadge />
              <Link
                href={accountHref}
                className={[
                  'rounded-lg px-3 py-2 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                  isActive(accountHref) ? 'text-ink' : 'text-ink/70 hover:text-ink',
                ].join(' ')}
              >
                {accountLabel}
              </Link>
            </>
          ) : (
            <Link
              href={`/prihlaseni${authRedirectSuffix}`}
              className="rounded-md bg-brass px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Přihlásit
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
