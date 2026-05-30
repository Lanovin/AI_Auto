import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Final CTA — centred, with a soft brass glow blooming behind the headline.
 * The glow is the only ornament here; everything else stays clean so the
 * sentence "Zjistěte, co vaše auto opravdu stojí." can do the heavy lifting.
 */
export default function CTA() {
  return (
    <section className="relative px-[22px] py-24 md:px-8 md:py-32">
      {/* Brass bloom — sits behind the text */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[440px] w-[680px] -translate-x-1/2 -translate-y-1/2 opacity-50 blur-[120px]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(176, 121, 29, 0.28), rgba(176, 121, 29, 0) 70%)',
        }}
      />

      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <span className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-brass">
          — Začněte za 30 sekund
        </span>

        <h2 className="cargent-h2 mt-5 text-[40px] md:text-[56px] lg:text-[64px]">
          Zjistěte, co vaše auto
          <br />
          <i>opravdu stojí.</i>
        </h2>

        <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-ink-soft">
          První ocenění zdarma. Bez registrace, bez kreditky.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/odhad-ceny"
            style={{ color: '#FFFFFF' }}
            className="group inline-flex items-center gap-2 rounded-[12px] bg-ink px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Ocenit vůz zdarma
            <ArrowRight
              className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
          <Link
            href="#api"
            className="rounded-[12px] border border-[color:var(--color-line-2)] bg-transparent px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Pro firmy
          </Link>
        </div>
      </div>
    </section>
  );
}
