'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import TokenBadge from '@/components/token-badge';
import { useClientAuthState } from '@/lib/client-auth';

const NAV_LINKS = [
  { href: '/odhad-ceny', label: 'Odhad ceny' },
  { href: '/cenik', label: 'Ceník' },
  { href: '/kontakt', label: 'Kontakt' },
];

export default function Header() {
  const pathname = usePathname();
  const { ready, isAuthenticated, isAdmin } = useClientAuthState();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Zavřít mobilní menu při navigaci
  useEffect(() => { setOpen(false); }, [pathname]);

  const isActive = (href: string) => pathname === href;

  const authRedirectSuffix =
    pathname && pathname !== '/' && pathname !== '/prihlaseni' && pathname !== '/registrace'
      ? `?next=${encodeURIComponent(pathname)}`
      : '';

  const linkClass = (href: string) =>
    [
      'rounded-md px-3 py-2 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
      isActive(href) ? 'text-brass' : 'text-ink-soft hover:text-ink',
    ].join(' ');

  const accountArea = isAdmin ? (
    <>
      <span className="cargent-mono hidden rounded-full border border-brass/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-brass sm:inline">
        Admin
      </span>
      <Link href="/admin" className={linkClass('/admin')}>Administrace</Link>
    </>
  ) : isAuthenticated ? (
    <>
      <TokenBadge />
      <Link href="/dashboard" className={linkClass('/dashboard')}>Účet</Link>
    </>
  ) : (
    <Link
      href={`/prihlaseni${authRedirectSuffix}`}
      className="rounded-md bg-brass px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
      style={{ visibility: ready ? 'visible' : 'hidden' }}
    >
      Přihlásit
    </Link>
  );

  return (
    <header
      className={[
        'sticky top-0 z-40 w-full bg-paper transition-[border-color] duration-300',
        scrolled || open ? 'border-b border-line' : 'border-b border-transparent',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-310 items-center justify-between gap-6 px-5.5 py-4 md:px-8">
        <Link
          href="/"
          aria-label="Cargent — domů"
          className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <Image src="/logo_cargent.png" alt="" width={36} height={36} className="shrink-0" priority />
          <span className="text-[21px] font-bold tracking-tight text-ink">
            Car<span className="text-brass">gent</span>
          </span>
        </Link>

        <nav aria-label="Hlavní navigace" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={linkClass(href)}>{label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">{accountArea}</div>

        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Zavřít menu' : 'Otevřít menu'}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass md:hidden"
        >
          {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {open ? (
        <nav id="mobile-nav" aria-label="Mobilní navigace" className="border-t border-line bg-paper px-5.5 pb-5 pt-2 md:hidden">
          <ul className="flex flex-col">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={[
                    'block border-b border-line py-3 text-[16px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass',
                    isActive(href) ? 'text-brass' : 'text-ink',
                  ].join(' ')}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-3">{accountArea}</div>
        </nav>
      ) : null}
    </header>
  );
}
