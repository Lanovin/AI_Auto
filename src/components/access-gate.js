'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClientAuthState } from '@/lib/client-auth';

/**
 * Brána k nástrojům podle typu účtu (Supabase):
 *   authenticated → jakýkoli přihlášený uživatel
 *   dealer        → účet typu autobazar (nebo admin)
 */
export default function AccessGate({ children, requiredRole = 'dealer' }) {
  const { ready, role, isAdmin } = useClientAuthState();
  const pathname = usePathname();

  if (!ready) {
    return (
      <div className="rounded-lg border border-line bg-paper-2 px-5 py-6 text-[14px] text-dim">
        Ověřuji přihlášení…
      </div>
    );
  }

  const hasAccess =
    isAdmin ||
    (requiredRole === 'authenticated' ? role === 'person' || role === 'dealer' : role === 'dealer');

  if (hasAccess) return children;

  const isDealerOnly = requiredRole === 'dealer';
  const next = encodeURIComponent(pathname || '/');

  return (
    <div className="rounded-lg border border-line bg-surface p-6 md:p-8" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
      <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">
        {isDealerOnly ? 'Firemní nástroj' : 'Vyžaduje přihlášení'}
      </p>
      <h2 className="cargent-h3 mt-2 text-[22px]">
        {role === 'guest'
          ? 'Pro použití nástroje se přihlaste.'
          : 'Tento nástroj je dostupný pro firemní účty autobazarů.'}
      </h2>
      <p className="mt-3 max-w-[60ch] text-[14px] leading-relaxed text-ink-soft">
        {role === 'guest'
          ? 'Registrace je zdarma. Nástroje se platí tokeny, které si dobijete v ceníku.'
          : 'Založte si firemní účet (typ autobazar) nebo nás kontaktujte a účet vám převedeme.'}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {role === 'guest' ? (
          <>
            <Link
              href={`/prihlaseni?next=${next}`}
              className="rounded-md bg-brass px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              Přihlásit se
            </Link>
            <Link
              href={`/registrace${isDealerOnly ? '?type=dealer' : ''}&next=${next}`.replace('/registrace&', '/registrace?')}
              className="rounded-md border border-line-2 px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              Založit účet
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/registrace?type=dealer"
              className="rounded-md bg-brass px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              Založit firemní účet
            </Link>
            <Link
              href="/kontakt"
              className="rounded-md border border-line-2 px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              Kontaktovat nás
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
