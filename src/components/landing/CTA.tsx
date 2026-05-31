import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Final CTA — jedno jasné sdělení.
 *
 * Na konci stránky neopakujeme hero obsah.
 * Odstraňujeme poslední pochybnost a usnadňujeme první krok.
 */
export default function CTA() {
  return (
    <section className="relative px-[22px] py-24 md:px-8 md:py-32">
      {/* Brass bloom */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 opacity-40 blur-[120px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(176,121,29,0.30), rgba(176,121,29,0) 70%)' }}
      />

      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-brass">
          — Začněte zdarma
        </span>

        <h2 className="cargent-h2 mt-5 text-[38px] md:text-[52px]">
          Kolik vaše auto
          <br />
          <i>skutečně stojí?</i>
        </h2>

        <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-ink-soft">
          Zadejte auto a do 30 sekund uvidíte výsledek.
          Zdarma, bez registrace, bez kreditky.
        </p>

        <Link
          href="/odhad-ceny"
          style={{ color: '#FFFFFF' }}
          className="group mt-8 inline-flex items-center gap-2 rounded-[12px] bg-ink px-7 py-4 text-[16px] font-medium text-white transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          Ocenit vůz zdarma
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>

        <p className="mt-4 text-[13px] text-faint">
          Neukládáme osobní data · Výsledek ihned
        </p>
      </div>
    </section>
  );
}
