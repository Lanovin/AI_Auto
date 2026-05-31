import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Instrument from './Instrument';
import BackgroundDecor from './BackgroundDecor';
import { HERO_METRICS } from '@/data/demo';

/**
 * Hero — zcela přepracován pro UX refaktor.
 *
 * Principy:
 *   • Problém uživatele na prvním místě, ne technologie
 *   • Jedno dominantní CTA (Ocenit vůz zdarma)
 *   • Sekundární CTA vede B2B segment do správné sekce
 *   • Lidsky čitelné metriky místo akademických (MAPE, R²)
 *   • Bez buzzwordů "AI agent", "interval spolehlivosti" v headline
 */
export default function Hero() {
  return (
    <section
      id="main"
      className="relative isolate overflow-hidden px-[22px] pb-16 pt-10 md:px-8 md:pb-24 md:pt-14"
    >
      <BackgroundDecor />

      <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        {/* ── Left column ──────────────────────────────────────────── */}
        <div className="flex flex-col">

          {/* Eyebrow — benefit-first, not technology-first */}
          <span
            className="animate-fade-up inline-flex items-center self-start gap-2 rounded-full border border-line bg-surface/80 px-3 py-1.5 text-[12px] font-medium text-ink-soft backdrop-blur-sm"
            style={{ animationDelay: '40ms' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden="true" />
            Zdarma · Bez registrace · Výsledek za 30 sekund
          </span>

          {/* H1 — user's problem, not product description */}
          <h1
            className="cargent-h1 animate-fade-up mt-6 text-[42px] leading-[1.04] md:text-[60px] lg:text-[68px]"
            style={{ animationDelay: '120ms' }}
          >
            Zjistěte, za kolik
            <br />
            se vaše auto
            <br />
            <i>opravdu prodá.</i>
          </h1>

          {/* Subtitle — concrete benefit, minimal jargon */}
          <p
            className="animate-fade-up mt-6 max-w-[52ch] text-[17px] leading-[1.65] text-ink-soft"
            style={{ animationDelay: '220ms' }}
          >
            Porovnáme stovky aktuálních inzerátů ze Sauto, TipCars a dalších
            portálů a řekneme vám cenu, která odpovídá{' '}
            <span className="font-semibold text-ink">reálnému trhu právě dnes</span>
            — ne průměru z minulého roku.
          </p>

          {/* CTA group — clear hierarchy */}
          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '300ms' }}
          >
            {/* Primary — single dominant action */}
            <Link
              href="/odhad-ceny"
              style={{ color: '#FFFFFF' }}
              className="group inline-flex items-center gap-2 rounded-[12px] bg-ink px-5 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Ocenit vůz zdarma
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
            {/* Secondary — B2B path */}
            <Link
              href="#dealers"
              className="rounded-[12px] border border-line-2 px-5 py-3.5 text-[15px] font-medium text-ink-soft transition-colors hover:border-brass/30 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Jsem autobazar
            </Link>
          </div>

          {/* Trust metrics — human language, not academic */}
          <div
            className="animate-fade-up mt-12 grid max-w-sm grid-cols-3 gap-4 border-t border-line pt-6"
            style={{ animationDelay: '400ms' }}
          >
            {HERO_METRICS.map((metric) => (
              <div key={metric.label} className="flex flex-col gap-1">
                <span className="cargent-mono text-[22px] font-medium text-ink">
                  {metric.value}
                </span>
                <span className="text-[11px] leading-tight text-faint">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right column: Instrument card ───────────────────────── */}
        <div
          className="animate-fade-up"
          style={{ animationDelay: '180ms' }}
        >
          <Instrument />
        </div>
      </div>
    </section>
  );
}
