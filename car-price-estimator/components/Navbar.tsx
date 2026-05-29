'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import TokenBadge from '@/components/token-badge';
import { useClientAuthState } from '@/lib/client-auth';

/**
 * Cargent shared navbar — used by ALL non-landing pages (tool pages,
 * dashboard, profile, auth). The landing has its own simpler header
 * with anchor navigation in `components/landing/Header.tsx`.
 *
 * Design: paper background with backdrop blur, hairline border,
 * Fraunces "Car<i>gent</i>" wordmark, brass accents, ink primary CTA.
 *
 * Functionality preserved from the AutoAI version:
 *   • Active route highlighting
 *   • Search-as-you-type over `searchIndex` with results dropdown
 *   • Auth-aware right side (account link vs login/register)
 *   • Token balance badge
 *   • Scroll-aware shadow / background opacity
 */

const navigationItems = [
  { label: 'Odhad ceny', href: '/odhad-ceny' },
  { label: 'Skaut', href: '/skaut' },
  { label: 'Monitoring', href: '/monitoring' },
  { label: 'Popisky', href: '/popisky' },
];

type SearchEntry = {
  title: string;
  description: string;
  href: string;
  keywords: string[];
  badge?: string;
};

const searchIndex: SearchEntry[] = [
  {
    title: 'Odhad ceny',
    description: 'Zjistěte reálnou tržní cenu auta pomocí AI za 30 sekund.',
    href: '/odhad-ceny',
    keywords: ['cena', 'odhad', 'ocenění', 'auto', 'tržní', 'sauto', 'tipcars', 'vin', 'prodej', 'nákup', 'koupě', 'inzerát'],
    badge: 'Zdarma',
  },
  {
    title: 'Skaut nabídek',
    description: 'Hledejte podhodnocená auta dříve než ostatní kupci.',
    href: '/skaut',
    keywords: ['skaut', 'podhodnocená', 'nabídky', 'hledat', 'inzeráty', 'levné', 'výhodné', 'filtr'],
    badge: 'Po přihlášení',
  },
  {
    title: 'Monitoring trhu',
    description: 'Sledujte cenové pohyby a výpisy na trhu v reálném čase.',
    href: '/monitoring',
    keywords: ['monitoring', 'sledování', 'trh', 'konkurence', 'cenové pohyby', 'watchlist', 'upozornění', 'b2b'],
    badge: 'Autobazary',
  },
  {
    title: 'Generátor popisků',
    description: 'Napište prodejní popis auta za 10 sekund pomocí AI.',
    href: '/popisky',
    keywords: ['popisky', 'popis', 'generátor', 'inzerát', 'prodej', 'text', 'ai', 'generování', 'b2b'],
    badge: 'Autobazary',
  },
  {
    title: 'Předplatné & tokeny',
    description: 'Plány Autobazar, Monitoring a balíčky tokenů.',
    href: '/predplatne',
    keywords: ['předplatné', 'tokeny', 'platba', 'stripe', 'plán', 'autobazar', 'monitoring'],
    badge: undefined,
  },
  {
    title: 'Přihlášení / Registrace',
    description: 'Přihlaste se nebo vytvořte profil soukromé osoby či autobazaru.',
    href: '/prihlaseni',
    keywords: ['přihlášení', 'registrace', 'profil', 'autobazar', 'účet', 'login', 'dealer', 'soukromý'],
    badge: undefined,
  },
];

type NavbarProps = {
  /**
   * Brand label. Kept for backwards-compat with existing call sites — the
   * wordmark is always rendered as "Car<i>gent</i>" regardless of value.
   */
  brandName?: string;
};

export default function Navbar({ brandName: _brandName }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, isSupabaseAuthenticated } = useClientAuthState();
  const [scrolled, setScrolled] = useState(false);
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const results =
    query.trim().length >= 1
      ? searchIndex
          .filter((item) => {
            const q = query.toLowerCase();
            return (
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.keywords.some((k) => k.toLowerCase().includes(q))
            );
          })
          .slice(0, 5)
      : [];

  const isActive = (href: string) => pathname === href.split('?')[0];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (results.length > 0) {
      router.push(results[0].href);
      setQuery('');
      setShowResults(false);
    }
  }

  function handleResultClick(href: string) {
    router.push(href);
    setQuery('');
    setShowResults(false);
  }

  function clearSearch() {
    setQuery('');
    setShowResults(false);
    inputRef.current?.focus();
  }

  const authRedirectSuffix =
    pathname && pathname !== '/' && pathname !== '/prihlaseni' && pathname !== '/registrace'
      ? `?next=${encodeURIComponent(pathname)}`
      : '';
  const accountHref = isSupabaseAuthenticated ? '/dashboard' : '/profil';
  const accountLabel = isSupabaseAuthenticated ? 'Účet' : 'Profil';

  return (
    <header
      className={[
        'sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300',
        scrolled
          ? 'border-b border-[color:var(--color-line)] bg-[rgba(246,244,238,0.86)] backdrop-blur-md'
          : 'border-b border-transparent bg-paper',
      ].join(' ')}
    >
      <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-[22px] py-4 md:px-8">
        {/* ── Brand ──────────────────────────────────────────────── */}
        <Link
          href="/"
          aria-label="Cargent — domů"
          className="group flex shrink-0 items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <LogoGauge />
          <span
            className="text-[20px] font-semibold tracking-tight font-display"
            style={{ color: '#14171C' }}
          >
            Car
            <span className="italic" style={{ color: '#B0791D' }}>
              gent
            </span>
          </span>
        </Link>

        {/* ── Primary nav (desktop) ──────────────────────────────── */}
        <nav
          aria-label="Hlavní navigace"
          className="hidden items-center gap-0.5 text-[14px] md:flex"
        >
          {navigationItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  'rounded-[8px] px-3 py-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                  active
                    ? 'font-medium text-ink'
                    : 'text-ink-soft hover:bg-paper-2/60 hover:text-ink',
                ].join(' ')}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* ── Search (desktop) ───────────────────────────────────── */}
        <div className="relative hidden md:block" ref={searchRef}>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-faint"
              />
              <input
                ref={inputRef}
                className="h-9 w-52 rounded-full border border-[color:var(--color-line)] bg-paper-2/50 pl-9 pr-8 text-[13px] text-ink placeholder:text-faint focus:border-brass focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brass/20 xl:w-64"
                placeholder="Hledat na webu..."
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowResults(true);
                }}
                onFocus={() => setShowResults(true)}
              />
              {query && (
                <button
                  aria-label="Vymazat hledání"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink-soft"
                  type="button"
                  onClick={clearSearch}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </form>

          {showResults && results.length > 0 && (
            <ul
              className="search-dropdown absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-[14px] border border-[color:var(--color-line)] bg-surface shadow-cargent-2"
              role="listbox"
            >
              {results.map((item) => (
                <li key={item.href} role="option" aria-selected={false}>
                  <button
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-2/60"
                    type="button"
                    onClick={() => handleResultClick(item.href)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-ink">{item.title}</span>
                        {item.badge && (
                          <span className="rounded-full border border-[color:var(--color-line)] bg-paper-2/60 px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-dim">{item.description}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Right side: token + auth ───────────────────────────── */}
        <div className="flex items-center gap-2">
          <TokenBadge />
          {role !== 'guest' ? (
            <Link
              className={[
                'rounded-[8px] px-3 py-2 text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper',
                isActive(accountHref) ? 'text-ink' : 'text-ink-soft hover:text-ink',
              ].join(' ')}
              href={accountHref}
            >
              {accountLabel}
            </Link>
          ) : (
            <>
              <Link
                className="hidden rounded-[8px] px-3 py-2 text-[14px] text-ink-soft transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper sm:block"
                href={`/prihlaseni${authRedirectSuffix}`}
              >
                Přihlásit se
              </Link>
              <Link
                className="rounded-[10px] px-4 py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                href={`/registrace${authRedirectSuffix}`}
                style={{ color: '#FFFFFF', backgroundColor: '#14171C' }}
              >
                Registrace
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Logo mark — miniature gauge that echoes the hero motif. */
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
      <circle cx="16" cy="16" r="14" stroke="#14171C" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="10" stroke="#B0791D" strokeWidth="1" strokeDasharray="1 3" />
      <line x1="16" y1="16" x2="22" y2="10" stroke="#B0791D" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="#B0791D" />
    </svg>
  );
}
