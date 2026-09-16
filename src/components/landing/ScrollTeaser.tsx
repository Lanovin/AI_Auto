'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

const DISMISS_KEY = 'cargent_teaser_dismissed';

/**
 * Upoutávka na ocenění, která se objeví, jakmile uživatel odscrolluje hero.
 * Jednou zavřená se v této relaci už neukáže.
 *
 * Sedí nad tlačítkem chatu a přes událost `cargent:teaser` dá Davidovi vědět,
 * že je vidět — ten pak nevytahuje svoji bublinu, aby se v rohu nehromadily
 * dvě upoutávky naráz.
 */
export default function ScrollTeaser({ title, button }: { title: string; button: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.85);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const shown = visible && !dismissed;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('cargent:teaser', { detail: { visible: shown } }));
    return () => {
      window.dispatchEvent(new CustomEvent('cargent:teaser', { detail: { visible: false } }));
    };
  }, [shown]);

  if (!shown) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  return (
    <aside
      className="cargent-teaser fixed bottom-[88px] left-4 right-[84px] z-30 sm:left-auto sm:bottom-24 sm:right-6 sm:w-[360px]"
      aria-label="Upoutávka na ocenění vozu"
    >
      <div className="flex items-center gap-3 rounded-lg border border-line bg-surface py-3 pl-4 pr-2" style={{ boxShadow: 'var(--shadow-cargent)' }}>
        <GaugeMark />
        <p className="min-w-0 flex-1 text-[14px] font-medium leading-snug text-ink">{title}</p>
        <Link
          href="/odhad-ceny"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brass px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
        >
          {button}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Zavřít upoutávku"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-dim transition-colors hover:bg-paper-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}

function GaugeMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="16" cy="16" r="14" stroke="var(--color-ink)" strokeWidth="1.4" />
      <circle cx="16" cy="16" r="10" stroke="var(--color-brass)" strokeWidth="1" strokeDasharray="1 3" />
      <line x1="16" y1="16" x2="22" y2="10" stroke="var(--color-brass)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="16" r="1.6" fill="var(--color-brass)" />
    </svg>
  );
}
