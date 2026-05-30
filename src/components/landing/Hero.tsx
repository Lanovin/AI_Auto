import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Instrument from './Instrument';
import BackgroundDecor from './BackgroundDecor';
import { HERO_METRICS } from '@/data/demo';

/**
 * Hero — left column: eyebrow → H1 (Fraunces, italic gold accent) →
 * subtitle → CTAs → metrics; right column: live Instrument card.
 * On mobile the columns stack and the Instrument flows below.
 *
 * BackgroundDecor sits in the hero's stacking context so the gauge motif
 * and glows only colour the hero, not the rest of the page.
 */
export default function Hero() {
  return (
    <section
      id="main"
      className="relative isolate overflow-hidden px-[22px] pb-16 pt-10 md:px-8 md:pb-24 md:pt-14"
    >
      <BackgroundDecor />

      <div className="mx-auto grid max-w-[1240px] gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        {/* ── Left column ──────────────────────────────────────────── */}
        <div className="flex flex-col">
          <span
            className="animate-fade-up inline-flex items-center self-start gap-2 rounded-full border border-[color:var(--color-line)] bg-[rgba(255,255,255,0.6)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.10em] text-ink-soft backdrop-blur-sm"
            style={{ animationDelay: '40ms' }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
            AI oceňovací agent · Český trh
          </span>

          <h1
            className="cargent-h1 animate-fade-up mt-6 text-[44px] leading-[1.02] md:text-[64px] lg:text-[72px]"
            style={{ animationDelay: '120ms' }}
          >
            Reálná cena vozu,
            <br />
            <i>podložená daty.</i>
          </h1>

          <p
            className="animate-fade-up mt-6 max-w-[58ch] text-[17px] leading-[1.65] text-ink-soft md:text-[18px]"
            style={{ animationDelay: '220ms' }}
          >
            Cargent během několika sekund projde živé inzeráty, výbavu i ověřenou
            historii vozu a vrátí{' '}
            <span className="font-semibold text-ink">tržní ocenění s intervalem spolehlivosti</span>{' '}
            — ne jen jeden tip od oka.
          </p>

          <div
            className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
            style={{ animationDelay: '320ms' }}
          >
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
            <Link
              href="#services"
              className="rounded-[12px] border border-line-2 bg-transparent px-5 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Všechny nástroje
            </Link>
          </div>

          {/* Metrics row */}
          <div
            className="animate-fade-up mt-12 grid max-w-md grid-cols-3 border-t border-[color:var(--color-line)] pt-6"
            style={{ animationDelay: '440ms' }}
          >
            {HERO_METRICS.map((metric) => (
              <div key={metric.label} className="flex flex-col gap-1.5">
                <span className="cargent-mono text-[20px] font-medium text-ink md:text-[22px]">
                  {metric.value}
                </span>
                <span className="text-[11px] uppercase tracking-[0.10em] text-faint">
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
