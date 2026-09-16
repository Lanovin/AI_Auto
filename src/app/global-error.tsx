'use client';

import { useEffect } from 'react';

/**
 * Poslední záchrana: chyba v root layoutu. Tady se <html>/<body> vykreslit MUSÍ,
 * protože layout už neběží. Bez Tailwind tříd — globals.css nemusí být načtené.
 */
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
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F7F8FA', color: '#0A1B33' }}>
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 440, textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#2563EB' }}>Chyba</p>
            <h1 style={{ fontSize: 32, margin: '12px 0 0', letterSpacing: '-0.02em' }}>Něco se pokazilo</h1>
            <p style={{ marginTop: 12, fontSize: 15, lineHeight: 1.6, opacity: 0.65 }}>
              Aplikaci se nepodařilo načíst. Zkuste to znovu nebo se vraťte na domovskou stránku.
            </p>
            {error.digest ? <p style={{ marginTop: 8, fontSize: 11, opacity: 0.35, fontFamily: 'monospace' }}>#{error.digest}</p> : null}
            <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{ borderRadius: 999, background: '#2563EB', color: '#fff', border: 0, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Zkusit znovu
              </button>
              <a
                href="/"
                style={{ borderRadius: 999, border: '1px solid #D9DEE7', padding: '12px 24px', fontSize: 14, fontWeight: 500, color: '#0A1B33', textDecoration: 'none' }}
              >
                Domovská stránka
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
