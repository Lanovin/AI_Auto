import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BackgroundDecor from './BackgroundDecor';

const tools = [
  {
    title: 'Odhad ceny',
    description: 'Reálná tržní cena vašeho auta za 30 sekund.',
    href: '/odhad-ceny',
    Icon: IconCar,
  },
  {
    title: 'Skaut nabídek',
    description: 'Najděte podhodnocená auta dřív než ostatní.',
    href: '/skaut',
    Icon: IconSearch,
  },
  {
    title: 'Monitoring trhu',
    description: 'Sledujte ceny konkurence v reálném čase.',
    href: '/monitoring',
    Icon: IconChart,
  },
  {
    title: 'Generátor popisků',
    description: 'Prodejní popis auta za pár vteřin.',
    href: '/popisky',
    Icon: IconPen,
  },
];

export default function Hero() {
  return (
    <section
      id="main"
      className="relative isolate overflow-hidden pb-20 pt-14 md:pb-28 md:pt-20"
    >
      <BackgroundDecor />

      {/* ── Gauge + wordmark + tools — max-w container ─────────── */}
      <div className="mx-auto max-w-[1240px] px-[22px] md:px-8">
        <div
          className="animate-fade-up"
          style={{ animationDelay: '0ms' }}
          aria-hidden="true"
        >
          <HeroGauge />
        </div>
      </div>

      {/* ── Headline — full viewport width, centered ────────────── */}
      <div
        className="animate-fade-up mt-10 overflow-hidden px-[22px] md:px-8"
        style={{ animationDelay: '100ms' }}
      >
        <h1
          className="cargent-h1 text-center leading-[1.02] md:whitespace-nowrap"
          style={{ fontSize: 'clamp(36px, 5.5vw, 88px)' }}
        >
          Oceňte svá auta jako <i>člověk.</i>
        </h1>
      </div>

      {/* ── Wordmark + tool cards — back in container ───────────── */}
      <div className="mx-auto max-w-[1240px] px-[22px] md:px-8">
        {/* Wordmark */}
        <div
          className="animate-fade-up mt-5 flex flex-wrap items-center gap-3"
          style={{ animationDelay: '180ms' }}
        >
          <span className="font-display text-[26px] font-semibold tracking-tight text-ink-soft">
            Car<span className="italic text-brass">gent</span>
          </span>
        </div>

        {/* Tool cards */}
        <div className="mt-14 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool, i) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="animate-fade-up group flex flex-col gap-4 rounded-[16px] border border-line bg-surface p-5 transition-all hover:-translate-y-0.5 hover:border-brass/20 hover:shadow-cargent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              style={{ animationDelay: `${320 + i * 70}ms` }}
            >
              <tool.Icon className="h-6 w-6 text-ink-soft transition-colors duration-200 group-hover:text-brass" />
              <div>
                <p className="text-[15px] font-semibold text-ink">{tool.title}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
                  {tool.description}
                </p>
              </div>
              <ArrowRight
                className="mt-auto h-4 w-4 text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-ink"
                aria-hidden="true"
              />
            </Link>
          ))}
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

type IconProps = { className?: string };

function IconCar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M5 17H3v-5l2.5-6h13L21 12v5h-2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
      <path d="M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M3 18l5-5 4 4 5-7 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="21" x2="21" y2="21" strokeLinecap="round" />
    </svg>
  );
}

function IconPen({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden="true">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
