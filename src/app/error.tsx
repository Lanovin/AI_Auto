'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="cs">
      <body className="flex min-h-screen items-center justify-center bg-paper p-6 font-body antialiased">
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
      </body>
    </html>
  );
}
