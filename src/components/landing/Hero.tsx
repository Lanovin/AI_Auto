import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BackgroundDecor from './BackgroundDecor';
import Instrument from './Instrument';
import { HERO_METRICS } from '@/data/demo';

export default function Hero() {
  return (
    <section
      id="main"
      className="relative isolate overflow-hidden pb-20 pt-14 md:pb-28 md:pt-20"
    >
      <BackgroundDecor />

      <div className="mx-auto max-w-[1240px] px-[22px] md:px-8">
        {/* ── Gauge mark ───────────────────────────────────────────── */}
        <div
          className="animate-fade-up"
          style={{ animationDelay: '0ms' }}
          aria-hidden="true"
        >
          <HeroGauge />
        </div>

        {/* ── Two-column hero: copy + live result preview ──────────── */}
        <div className="mt-10 grid items-center gap-12 lg:mt-12 lg:grid-cols-[1.04fr_0.96fr] lg:gap-16">
          {/* Left — headline, subhead, CTA, metrics */}
          <div>
            <span
              className="animate-fade-up cargent-mono inline-block text-[11px] uppercase tracking-[0.14em] text-brass"
              style={{ animationDelay: '80ms' }}
            >
              — AI oceňovací agent
            </span>

            <h1
              className="animate-fade-up cargent-h1 mt-5 leading-[1.04]"
              style={{ animationDelay: '120ms', fontSize: 'clamp(34px, 4.6vw, 62px)' }}
            >
              Oceňte svá auta
              <br />
              jako <i>člověk.</i>
            </h1>

            <p
              className="animate-fade-up mt-6 max-w-[48ch] text-[16px] leading-relaxed text-ink-soft md:text-[17px]"
              style={{ animationDelay: '180ms' }}
            >
              Cargent projde živé inzeráty, výbavu i ověřenou historii vozu
              a vrátí reálnou tržní cenu s intervalem spolehlivosti —
              ne jen tip od oka.
            </p>

            <div
              className="animate-fade-up mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: '240ms' }}
            >
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
                href="#how"
                className="inline-flex items-center gap-2 rounded-[12px] border border-line-2 bg-surface px-6 py-3.5 text-[15px] font-medium text-ink transition-colors hover:border-brass/30 hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                Jak to funguje
              </Link>
            </div>

            <p
              className="animate-fade-up mt-4 text-[13px] text-faint"
              style={{ animationDelay: '280ms' }}
            >
              Bez registrace · Výsledek do 30 sekund · Neukládáme osobní data
            </p>

            {/* Metrics row */}
            <dl
              className="animate-fade-up mt-10 flex flex-wrap gap-x-10 gap-y-5 border-t border-line pt-7"
              style={{ animationDelay: '340ms' }}
            >
              {HERO_METRICS.map((m) => (
                <div key={m.label} className="flex flex-col gap-1">
                  <dt className="order-2 text-[12px] text-ink-soft">{m.label}</dt>
                  <dd className="cargent-mono order-1 text-[26px] font-medium leading-none text-ink">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right — live valuation result preview */}
          <div
            className="animate-fade-up"
            style={{ animationDelay: '300ms' }}
          >
            <Instrument />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Hero gauge — instrument cluster motif.
 * Uses vectorEffect="non-scaling-stroke" so stroke widths stay
 * sharp in CSS pixels regardless of how the SVG scales on-screen.
 * Needle animates one full 360° rotation on load.
 */
function HeroGauge() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 88 88"
      fill="none"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Outer ring */}
      <circle
        cx="44" cy="44" r="40"
        stroke="#14171C"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {/* Inner dashed ring (brass) */}
      <circle
        cx="44" cy="44" r="30"
        stroke="#B0791D"
        strokeWidth="1.5"
        strokeDasharray="3 6"
        vectorEffect="non-scaling-stroke"
      />
      {/* Cardinal tick marks */}
      <line x1="44" y1="6"  x2="44" y2="14" stroke="#14171C" strokeWidth="2"   strokeOpacity="0.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1="82" y1="44" x2="74" y2="44" stroke="#14171C" strokeWidth="2"   strokeOpacity="0.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1="6"  y1="44" x2="14" y2="44" stroke="#14171C" strokeWidth="2"   strokeOpacity="0.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <line x1="44" y1="82" x2="44" y2="74" stroke="#14171C" strokeWidth="2"   strokeOpacity="0.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {/* Needle — 360° spin on load, then settles at ~2 o'clock */}
      <line
        x1="44" y1="44"
        x2="67" y2="21"
        stroke="#B0791D"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{
          transformBox: 'view-box',
          transformOrigin: '44px 44px',
          animation: 'needle-sweep-360 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both',
        }}
      />
      {/* Center pivot */}
      <circle cx="44" cy="44" r="4"   fill="#B0791D" />
      <circle cx="44" cy="44" r="1.8" fill="#F6F4EE" />
    </svg>
  );
}
