'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * Chybová hranice pro stránky pod root layoutem. NESMÍ vykreslovat <html>/<body>
 * — ty dodává layout (jinak vznikne vnořené html a hydratační chyba).
 * Chyby samotného root layoutu řeší global-error.tsx.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[route-error]', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6" id="main">
      <div className="mx-auto max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brass">Chyba</p>
        <h1 className="mt-3 text-[36px] font-bold tracking-tight text-ink">Něco se pokazilo</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/60">
          Na straně serveru nastala neočekávaná chyba. Zkuste to znovu nebo se vraťte na domovskou stránku.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-[11px] text-ink/30">#{error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-brass px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2"
          >
            Zkusit znovu
          </button>
          <Link
            href="/"
            className="rounded-full border border-line px-6 py-3 text-[14px] font-medium text-ink/70 transition-colors hover:border-ink/20 hover:text-ink"
          >
            Domovská stránka
          </Link>
        </div>
      </div>
    </main>
  );
}
