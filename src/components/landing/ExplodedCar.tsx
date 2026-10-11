'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Expand, Shrink } from 'lucide-react';
import CountUp from './CountUp';
import {
  DEMO_VEHICLE,
  EXPLODED_CAR_PARTS,
  formatCzk,
  formatKm,
} from '@/data/demo';

/**
 * ExplodedCar — rozložené auto jako hero ilustrace.
 *
 * Vůz je nakreslený z osmi dílů (SVG). Po načtení se díly rozletí od sebe,
 * ke každému se pověsí cenovka se šipkou (vodicí linka) a pod autem naskočí
 * součet všech dílů. Ceny jsou ilustrativní, stejně jako zbytek ukázkových
 * dat v `data/demo.ts`.
 *
 * Dostupnost: SVG je dekorativní (aria-hidden). Stejná data jsou v číslovaném
 * seznamu pod obrázkem, který je na mobilu viditelný a na desktopu jen pro
 * čtečky obrazovky.
 */

const INK = '#0A1B33';
const BLUE = '#2563EB';
const GLASS = '#E3ECFD';
const GUIDE = '#B9C4D6';
const PAPER = '#FFFFFF';

type PartId = (typeof EXPLODED_CAR_PARTS)[number]['id'];

/** Posun celé kresby doprava, aby se vlevo vešly cenovky. */
const ART_X = 80;
const TAG_W = 176;
const TAG_H = 46;

interface PartGeometry {
  /** Posun dílu v rozloženém stavu. */
  dx: number;
  dy: number;
  /** Body ve složeném stavu, odkud vedou čárkované spojnice. */
  guides: ReadonlyArray<readonly [number, number]>;
  /** Bod v rozloženém stavu, na který míří cenovka (x v souřadnicích kresby). */
  ax: number;
  /** Výška cenovky = y kotvy (vodicí linka je vodorovná). */
  y: number;
  side: 'l' | 'r';
}

const GEO: Record<PartId, PartGeometry> = {
  roof:     { dx: 0,    dy: -170, guides: [[372, 304], [612, 304]], ax: 376, y: 104, side: 'l' },
  doors:    { dx: 0,    dy: -75,  guides: [[440, 328], [540, 328]], ax: 400, y: 204, side: 'l' },
  interior: { dx: -240, dy: -38,  guides: [[506, 300]],             ax: 205, y: 268, side: 'l' },
  body:     { dx: 0,    dy: 0,    guides: [],                       ax: 292, y: 346, side: 'l' },
  engine:   { dx: 105,  dy: -85,  guides: [[681, 340]],             ax: 800, y: 256, side: 'r' },
  lights:   { dx: 111,  dy: -5,   guides: [[719, 329]],             ax: 830, y: 325, side: 'r' },
  gearbox:  { dx: 112,  dy: 80,   guides: [[618, 331]],             ax: 742, y: 411, side: 'r' },
  wheels:   { dx: 0,    dy: 100,  guides: [[372, 372], [628, 372]], ax: 655, y: 478, side: 'r' },
};

/** Pořadí vykreslování (zespodu nahoru): vnitřek schovaný pod karoserií. */
const DRAW_ORDER: PartId[] = [
  'interior', 'engine', 'gearbox', 'body', 'roof', 'doors', 'lights', 'wheels',
];

/* ── Kresba jednotlivých dílů (složený stav, souřadnice 0 0 1120 560) ─ */

function Body({ s }: { s: string }) {
  return (
    <g fill={PAPER} stroke={s} strokeWidth={1.7} strokeLinejoin="round">
      <path d="M272 372 L272 330 Q272 318 286 315 L342 304 L636 304 L700 314 Q728 320 730 346 L730 372 L668 372 A40 40 0 0 0 588 372 L412 372 A40 40 0 0 0 332 372 Z" />
      <path d="M288 338 L330 338 M412 338 L588 338 M668 338 L722 338" fill="none" stroke={GUIDE} />
      <path d="M272 352 L288 352 M716 352 L730 352" fill="none" />
    </g>
  );
}

function Roof({ s }: { s: string }) {
  return (
    <g fill={PAPER} stroke={s} strokeWidth={1.7} strokeLinejoin="round">
      <path d="M342 304 L392 250 Q398 243 408 243 L560 243 Q572 243 580 251 L636 304 Z" />
      <path d="M364 304 L398 258 Q402 254 408 254 L560 254 Q566 254 570 258 L614 304 Z" fill={GLASS} />
      <rect x="492" y="254" width="12" height="50" />
    </g>
  );
}

function Doors({ s }: { s: string }) {
  return (
    <g fill={PAPER} stroke={s} strokeWidth={1.7} strokeLinejoin="round">
      <path d="M366 328 L366 304 L398 258 Q402 254 408 254 L492 254 L492 328 Z" />
      <path d="M376 300 L402 262 L484 262 L484 300 Z" fill={GLASS} stroke="none" />
      <line x1="466" y1="308" x2="484" y2="308" strokeWidth={3} strokeLinecap="round" />
      <path d="M504 328 L504 254 L560 254 Q566 254 570 258 L616 304 L616 328 Z" />
      <path d="M512 262 L556 262 L602 300 L512 300 Z" fill={GLASS} stroke="none" />
      <line x1="514" y1="308" x2="532" y2="308" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

function Wheel({ cx, cy, s }: { cx: number; cy: number; s: string }) {
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={34} fill={INK} stroke={s === BLUE ? BLUE : INK} strokeWidth={2} />
      <circle r={22} fill={PAPER} />
      {[0, 72, 144, 216, 288].map((a) => (
        <line
          key={a}
          x1={0} y1={-6} x2={0} y2={-20}
          stroke={BLUE} strokeWidth={3.2} strokeLinecap="round"
          transform={`rotate(${a})`}
        />
      ))}
      <circle r={5} fill={INK} />
    </g>
  );
}

function Wheels({ s }: { s: string }) {
  return (
    <>
      <Wheel cx={372} cy={372} s={s} />
      <Wheel cx={628} cy={372} s={s} />
    </>
  );
}

function Engine({ s }: { s: string }) {
  return (
    <g fill={PAPER} stroke={s} strokeWidth={1.7} strokeLinejoin="round">
      <rect x={650} y={326} width={62} height={30} rx={4} />
      <rect x={655} y={318} width={52} height={8} rx={2} fill={GLASS} />
      {[664, 676, 688, 700].map((x) => (
        <line key={x} x1={x} y1={332} x2={x} y2={350} stroke={GUIDE} />
      ))}
      <circle cx={647} cy={341} r={7} />
      <path d="M712 334 L718 334 L718 346 L712 346" fill="none" />
    </g>
  );
}

function Gearbox({ s }: { s: string }) {
  return (
    <g fill={PAPER} stroke={s} strokeWidth={1.7} strokeLinejoin="round">
      <path d="M596 326 Q596 320 602 320 L632 320 Q640 320 640 328 L640 336 Q640 342 634 342 L602 342 Q596 342 596 336 Z" />
      <circle cx={606} cy={331} r={2.4} />
      <circle cx={628} cy={331} r={2.4} />
      <line x1={640} y1={331} x2={650} y2={331} />
    </g>
  );
}

function Interior({ s }: { s: string }) {
  return (
    <g fill={PAPER} stroke={s} strokeWidth={1.7} strokeLinejoin="round">
      {[430, 520].map((ox) => (
        <g key={ox}>
          <rect x={ox} y={284} width={15} height={42} rx={6} transform={`rotate(-10 ${ox + 7} 326)`} />
          <rect x={ox + 1} y={270} width={13} height={10} rx={4} transform={`rotate(-10 ${ox + 7} 326)`} />
          <rect x={ox} y={318} width={46} height={13} rx={6} />
        </g>
      ))}
      <ellipse cx={578} cy={298} rx={4} ry={15} transform="rotate(20 578 298)" />
      <line x1={574} y1={309} x2={558} y2={324} />
    </g>
  );
}

function Lights({ s }: { s: string }) {
  return (
    <g fill={GLASS} stroke={s} strokeWidth={1.7} strokeLinejoin="round">
      <path d="M708 322 L727 322 Q733 330 728 338 L708 338 Q703 330 708 322 Z" />
      <circle cx={716} cy={330} r={4} fill={PAPER} />
    </g>
  );
}

const PART_ART: Record<PartId, (p: { s: string }) => ReactNode> = {
  body: Body, roof: Roof, doors: Doors, wheels: Wheels,
  engine: Engine, gearbox: Gearbox, interior: Interior, lights: Lights,
};

/* ── Cenovka (široká varianta) ────────────────────────────────────── */

function PriceTag({
  part, index, active, open,
}: {
  part: (typeof EXPLODED_CAR_PARTS)[number];
  index: number;
  active: boolean;
  open: boolean;
}) {
  const g = GEO[part.id];
  const left = g.side === 'l';
  const x = left ? 4 : 1120 - TAG_W - 0;
  const y = g.y;
  const top = y - TAG_H / 2;
  const bottom = y + TAG_H / 2;
  const tip = 16;

  const outline = left
    ? `M${x} ${top} H${x + TAG_W - tip} L${x + TAG_W} ${y} L${x + TAG_W - tip} ${bottom} H${x} Z`
    : `M${x + tip} ${top} H${x + TAG_W} V${bottom} H${x + tip} L${x} ${y} Z`;
  const holeX = left ? x + TAG_W - 11 : x + 11;
  const textX = left ? x + 12 : x + 26;
  const tipX = left ? x + TAG_W : x;
  const dotX = g.ax + ART_X;
  const stroke = active ? BLUE : '#C9D2E0';

  return (
    <g
      className="cargent-fade"
      style={{
        opacity: open ? 1 : 0,
        transitionDelay: open ? `${950 + index * 70}ms` : '0ms',
      }}
    >
      <line x1={tipX} y1={y} x2={dotX} y2={y} stroke={active ? BLUE : GUIDE} strokeWidth={1.4} />
      <circle cx={dotX} cy={y} r={4.5} fill={BLUE} stroke={PAPER} strokeWidth={1.6} />
      <path d={outline} fill={PAPER} stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" />
      <circle cx={holeX} cy={y} r={2.8} fill="#EEF2F8" stroke={stroke} strokeWidth={1} />
      <text x={textX} y={y - 6} fontSize={12.5} fill="#5B6A80">{part.name}</text>
      <text
        x={textX} y={y + 14} fontSize={15} fontWeight={500} fill={INK}
        className="cargent-mono"
      >
        {formatCzk(part.price)} Kč
      </text>
    </g>
  );
}

/* ── Kresba ───────────────────────────────────────────────────────── */

function Illustration({
  variant, open, hover, setHover, className,
}: {
  variant: 'wide' | 'compact';
  open: boolean;
  hover: PartId | null;
  setHover: (id: PartId | null) => void;
  className: string;
}) {
  const wide = variant === 'wide';

  return (
    <svg
      viewBox={wide ? '0 50 1120 480' : '240 50 700 480'}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g transform={`translate(${ART_X} 0)`}>
        {/* čárkované spojnice složený → rozložený stav */}
        <g
          className="cargent-fade"
          style={{ opacity: open ? 1 : 0, transitionDelay: open ? '500ms' : '0ms' }}
          stroke={GUIDE} strokeWidth={1.3} strokeDasharray="4 5"
        >
          {EXPLODED_CAR_PARTS.flatMap((p) =>
            GEO[p.id].guides.map(([x, y], i) => (
              <line key={`${p.id}-${i}`} x1={x} y1={y} x2={x + GEO[p.id].dx} y2={y + GEO[p.id].dy} />
            )),
          )}
        </g>

        {DRAW_ORDER.map((id) => {
          const Art = PART_ART[id];
          const g = GEO[id];
          const order = EXPLODED_CAR_PARTS.findIndex((p) => p.id === id);
          const dim = hover !== null && hover !== id;
          return (
            <g
              key={id}
              className="cargent-part"
              style={{
                transform: open ? `translate(${g.dx}px, ${g.dy}px)` : 'translate(0px, 0px)',
                transitionDelay: open ? `${order * 70}ms` : '0ms',
                opacity: dim ? 0.3 : 1,
              }}
              onPointerEnter={() => setHover(id)}
              onPointerLeave={() => setHover(null)}
            >
              <Art s={hover === id ? BLUE : INK} />
            </g>
          );
        })}
      </g>

      {/* široká varianta: cenovky; úzká: číslované body k seznamu */}
      {wide
        ? EXPLODED_CAR_PARTS.map((p, i) => (
            <g
              key={p.id}
              onPointerEnter={() => setHover(p.id)}
              onPointerLeave={() => setHover(null)}
              style={{ opacity: hover && hover !== p.id ? 0.35 : 1, transition: 'opacity 0.25s ease' }}
            >
              <PriceTag part={p} index={i} active={hover === p.id} open={open} />
            </g>
          ))
        : EXPLODED_CAR_PARTS.map((p, i) => {
            const g = GEO[p.id];
            return (
              <g
                key={p.id}
                className="cargent-fade"
                style={{ opacity: open ? 1 : 0, transitionDelay: open ? `${950 + i * 70}ms` : '0ms' }}
              >
                <circle cx={g.ax + ART_X} cy={g.y} r={12} fill={BLUE} stroke={PAPER} strokeWidth={2} />
                <text
                  x={g.ax + ART_X} y={g.y + 4.5} fontSize={13} fontWeight={600}
                  textAnchor="middle" fill={PAPER} className="cargent-mono"
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
    </svg>
  );
}

/* ── Hlavní komponenta ────────────────────────────────────────────── */

export default function ExplodedCar({ caption }: { caption: string }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const autoRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<PartId | null>(null);

  const total = EXPLODED_CAR_PARTS.reduce((sum, p) => sum + p.price, 0);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      autoRef.current = true;
      setOpen(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || autoRef.current) return;
        autoRef.current = true;
        io.disconnect();
        timer = setTimeout(() => setOpen(true), 450);
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-[1120px]">
      <div className="relative">
        <Illustration
          variant="wide" open={open} hover={hover} setHover={setHover}
          className="hidden h-auto w-full lg:block"
        />
        <Illustration
          variant="compact" open={open} hover={hover} setHover={setHover}
          className="block h-auto w-full lg:hidden"
        />

        <button
          type="button"
          onClick={() => {
            autoRef.current = true;
            setOpen((v) => !v);
          }}
          className="absolute right-0 top-0 inline-flex items-center gap-2 rounded-md border border-line-2 bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          {open ? (
            <Shrink aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Expand aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {open ? 'Složit auto' : 'Rozložit auto'}
        </button>
      </div>

      {/* Seznam dílů: viditelný pod desktopem, na desktopu jen pro čtečky */}
      <ol className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2 lg:sr-only">
        {EXPLODED_CAR_PARTS.map((p, i) => (
          <li
            key={p.id}
            className="flex items-center gap-3 border-b border-line py-2.5 text-[14px]"
          >
            <span
              aria-hidden="true"
              className="cargent-mono flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brass text-[12px] font-semibold text-white"
            >
              {i + 1}
            </span>
            <span className="text-ink-soft">{p.name}</span>
            <span className="cargent-mono ml-auto text-[14px] font-medium tabular-nums text-ink">
              {formatCzk(p.price)} Kč
            </span>
          </li>
        ))}
      </ol>

      {/* Součet všech dílů */}
      <div className="mt-6 flex flex-col items-center text-center lg:mt-2">
        <div aria-hidden="true" className="hidden h-8 w-px bg-line-2 lg:block" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
          Hodnota vozu celkem
        </p>
        <p className="mt-2 flex items-baseline gap-2">
          <CountUp
            value={total}
            duration={1600}
            delay={600}
            className="cargent-mono text-[44px] font-medium leading-none text-ink md:text-[58px]"
          />
          <span className="cargent-mono text-[20px] font-medium text-brass md:text-[24px]">Kč</span>
        </p>
        <p className="cargent-mono mt-2.5 text-[12px] text-dim">
          {DEMO_VEHICLE.brand} {DEMO_VEHICLE.model} {DEMO_VEHICLE.variant} · {DEMO_VEHICLE.year} ·{' '}
          {formatKm(DEMO_VEHICLE.mileage)} km
        </p>
        <p className="mt-3 max-w-[56ch] text-[13px] leading-relaxed text-faint">{caption}</p>
      </div>
    </div>
  );
}
