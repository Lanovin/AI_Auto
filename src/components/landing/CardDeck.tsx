'use client';

import { useEffect, useRef, useState } from 'react';

/* ── Card 1: Tržní cena ─────────────────────────────────────────── */
function CardPrice() {
  return (
    <div
      className="rounded-[18px] border border-line bg-surface flex flex-col"
      style={{ boxShadow: 'var(--shadow-cargent-card)', padding: '22px 22px 18px' }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <span className="cargent-mono text-[10.5px] uppercase tracking-[0.13em] text-dim">Tržní cena</span>
        <span className="flex items-center gap-1.5 cargent-mono text-[10.5px] text-faint">
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald cargent-pulse"
            aria-hidden="true"
          />
          živý scan
        </span>
      </div>

      <p className="text-[15.5px] font-bold tracking-tight text-ink leading-tight">
        Škoda Octavia III RS 2.0 TDI
      </p>
      <p className="cargent-mono text-[10.5px] text-faint mt-1">2014 · 184 000 km · DSG · CZ původ</p>

      <div className="flex justify-center my-3">
        <svg viewBox="0 0 280 150" className="w-full max-w-[220px]" xmlns="http://www.w3.org/2000/svg">
          <path d="M 30 140 A 110 110 0 0 0 250 140" fill="none" stroke="#E4E8F0" strokeWidth="9" strokeLinecap="round" />
          <path d="M 52 74 A 110 110 0 0 0 153 31" fill="none" stroke="rgba(37,99,235,.24)" strokeWidth="9" strokeLinecap="round" />
          <line x1="140" y1="140" x2="99" y2="38" stroke="#0A1B33" strokeWidth="1.5" />
          <circle cx="140" cy="140" r="3.5" fill="#0A1B33" />
          <circle cx="99" cy="38" r="5.5" fill="#2563EB" />
          <circle cx="99" cy="38" r="2" fill="#FFFFFF" />
        </svg>
      </div>
      <div className="flex justify-between cargent-mono text-[9.5px] text-faint px-1">
        <span>245 000</span>
        <span>pásmo 90 %</span>
        <span>440 000</span>
      </div>

      <div className="text-center mt-3">
        <p className="cargent-mono text-[36px] font-medium leading-none text-ink">
          319 000 <span className="text-[17px] text-ink-soft">Kč</span>
        </p>
        <p className="text-[11px] text-ink-soft mt-1.5">doporučená prodejní cena</p>
      </div>

      <div className="grid grid-cols-[1fr_1px_1fr] mt-4 pt-3.5 border-t border-line/50">
        <div className="text-center">
          <p className="cargent-mono text-[12px] text-ink">300–310k</p>
          <p className="text-[10px] text-faint mt-0.5">realizace</p>
        </div>
        <div className="bg-line/40" />
        <div className="text-center">
          <p className="cargent-mono text-[12px] text-ink">245–260k</p>
          <p className="text-[10px] text-faint mt-0.5">výkup do bazaru</p>
        </div>
      </div>

      <p className="mt-3.5 cargent-mono text-[10px] text-faint flex items-center gap-1.5">
        <span className="text-brass">◆</span>16 srovnatelných inzerátů · čerstvý scan
      </p>
    </div>
  );
}

/* ── Card 2: Srovnatelné nabídky ────────────────────────────────── */
function CardComparables() {
  const pts = [
    { pct: 9.3, type: 'dot' },
    { pct: 18.6, type: 'dot' },
    { pct: 34.4, type: 'rec' },
    { pct: 48.4, type: 'dot' },
    { pct: 90.7, type: 'dot' },
    { pct: 100, type: 'dim' },
  ];
  return (
    <div
      className="rounded-[18px] border border-line bg-surface flex flex-col"
      style={{ boxShadow: 'var(--shadow-cargent-card)', padding: '22px 22px 18px' }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <span className="cargent-mono text-[10.5px] uppercase tracking-[0.13em] text-dim">Srovnatelné nabídky</span>
        <span className="cargent-mono text-[10.5px] text-faint">8 portálů</span>
      </div>

      <p className="text-[15.5px] font-bold tracking-tight text-ink leading-tight">Reálné inzeráty vs. medián</p>
      <p className="cargent-mono text-[10.5px] text-faint mt-1">odchylka od mediánu segmentu · živá data</p>

      <div className="relative h-[60px] my-4">
        <div className="absolute left-0 right-0 top-[30px] h-px bg-line" />
        <div
          className="absolute"
          style={{ left: '29.8%', top: '13px', height: '34px', width: '1.5px', background: 'var(--color-brass)' }}
        />
        <span
          className="absolute cargent-mono text-[9px] text-brass"
          style={{ left: '29.8%', top: 0, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
        >
          medián 309k
        </span>
        {pts.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${p.pct}%`,
              top: '30px',
              width: p.type === 'rec' ? 12 : p.type === 'dim' ? 7 : 8,
              height: p.type === 'rec' ? 12 : p.type === 'dim' ? 7 : 8,
              marginLeft: p.type === 'rec' ? -6 : p.type === 'dim' ? -3.5 : -4,
              marginTop: p.type === 'rec' ? -6 : p.type === 'dim' ? -3.5 : -4,
              background: p.type === 'rec' ? 'white' : p.type === 'dim' ? 'transparent' : '#0A1B33',
              border: p.type === 'rec' ? '2.5px solid #2563EB' : p.type === 'dim' ? '1.5px solid #919EB2' : 'none',
            }}
          />
        ))}
        <span
          className="absolute cargent-mono text-[9px] text-brass"
          style={{ left: '34.4%', bottom: 0, transform: 'translateX(-50%)', whiteSpace: 'nowrap' }}
        >
          odhad 319k
        </span>
      </div>

      <div>
        {[
          { name: 'TipCars', price: '440 000', diff: '+42 %', med: false },
          { name: 'ZNauto', price: '349 000', diff: '+13 %', med: false },
          { name: 'SportovníVozy', price: '309 000', diff: 'medián', med: true },
          { name: 'Bazoš', price: '285 000', diff: '−8 %', med: false },
          { name: 'TipCars · benzín ref.', price: '265 000', diff: '−14 %', med: false },
        ].map((row, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-2 py-1.5 border-t border-line/40 first:border-t-0 text-[12px]"
          >
            <span className="font-semibold text-ink truncate">{row.name}</span>
            <span className="cargent-mono text-[11.5px] text-ink-soft text-right min-w-[68px]">{row.price}</span>
            <span className={`cargent-mono text-[10.5px] text-right min-w-[44px] ${row.med ? 'text-brass' : 'text-faint'}`}>
              {row.diff}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3.5 cargent-mono text-[10px] text-faint flex items-center gap-1.5">
        <span className="text-brass">◆</span>16 nalezeno · 1 odlehlý vyřazen
      </p>
    </div>
  );
}

/* ── Card 3: Rozpad ceny ────────────────────────────────────────── */
function CardBreakdown() {
  const factors = [
    { label: 'Výbava nad standard', amt: '+28 000', pos: true, w: 74 },
    { label: 'Servisní historie ASC', amt: '+15 000', pos: true, w: 40 },
    { label: 'CZ původ', amt: '+15 000', pos: true, w: 40 },
    { label: 'Nájezd 184 tis. km', amt: '−10 000', pos: false, w: 26 },
    { label: 'Stáří DSG + likvidita', amt: '−38 000', pos: false, w: 100 },
  ];
  return (
    <div
      className="rounded-[18px] border border-line bg-surface flex flex-col"
      style={{ boxShadow: 'var(--shadow-cargent-card)', padding: '22px 22px 18px' }}
    >
      <div className="flex items-center justify-between mb-3.5">
        <span className="cargent-mono text-[10.5px] uppercase tracking-[0.13em] text-dim">Rozpad ceny</span>
        <span className="cargent-mono text-[10.5px] text-faint">výbava + stav</span>
      </div>

      <p className="text-[15.5px] font-bold tracking-tight text-ink leading-tight">Z čeho se cena skládá</p>
      <p className="cargent-mono text-[10.5px] text-faint mt-1">od mediánu segmentu k doporučení</p>

      <div className="flex justify-between items-baseline mt-4 mb-3">
        <span className="text-[12px] text-ink-soft">Medián segmentu DSG</span>
        <span className="cargent-mono text-[12.5px] text-ink">309 000</span>
      </div>

      {factors.map((f, i) => (
        <div key={i} className="mb-2">
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-[11.5px] text-ink">{f.label}</span>
            <span className={`cargent-mono text-[11px] ${f.pos ? 'text-brass' : 'text-ink-soft'}`}>{f.amt}</span>
          </div>
          <div className="h-[4px] rounded-full overflow-hidden" style={{ background: 'rgba(10,27,51,0.07)' }}>
            <div
              className={`h-full rounded-full ${f.pos ? 'bg-brass' : 'bg-faint'}`}
              style={{ width: `${f.w}%` }}
            />
          </div>
        </div>
      ))}

      <div className="flex justify-between items-baseline mt-3 pt-3.5 border-t border-line">
        <span className="text-[12px] text-ink">Doporučená cena</span>
        <span className="cargent-mono text-[21px] font-medium tracking-tight text-ink">319 000 Kč</span>
      </div>

      <p className="mt-3.5 cargent-mono text-[10px] text-faint flex items-center gap-1.5">
        <span className="text-brass">◆</span>10 faktorů · transparentní výpočet
      </p>
    </div>
  );
}

/* ── Carousel ───────────────────────────────────────────────────── */
const CARDS = [CardPrice, CardComparables, CardBreakdown];

export default function CardDeck() {
  const [active, setActive] = useState(0);
  const [jumping, setJumping] = useState(-1);
  const jumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let curr = 0;
    const id = setInterval(() => {
      const next = (curr + 1) % 3;
      const jump = (curr + 2) % 3;
      setJumping(jump);
      setActive(next);
      curr = next;
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
      jumpTimer.current = setTimeout(() => setJumping(-1), 750);
    }, 4500);
    return () => {
      clearInterval(id);
      if (jumpTimer.current) clearTimeout(jumpTimer.current);
    };
  }, []);

  function getPos(i: number) {
    const d = (i - active + 3) % 3;
    return d === 0 ? 'active' : d === 1 ? 'next' : 'prev';
  }

  function cardStyle(i: number): React.CSSProperties {
    const pos = getPos(i);
    const isJumping = i === jumping;
    const easing = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
    const transition = isJumping
      ? 'none'
      : `transform 0.72s ${easing}, opacity 0.5s ease`;

    const base: React.CSSProperties = {
      position: 'absolute',
      left: '50%',
      top: 0,
      width: '100%',
      maxWidth: '370px',
      transition,
      willChange: 'transform, opacity',
    };

    if (pos === 'active') {
      return { ...base, transform: 'translateX(-50%)', opacity: 1, zIndex: 10 };
    } else if (pos === 'next') {
      return {
        ...base,
        /* --deck-offset is set responsively via className on the container */
        transform: 'translateX(calc(-50% + var(--deck-offset, 320px))) rotateY(-16deg) scale(0.88)',
        opacity: isJumping ? 0 : 'var(--peek-opacity, 0.76)' as unknown as number,
        zIndex: 5,
        pointerEvents: 'none',
      };
    } else {
      return {
        ...base,
        transform: 'translateX(calc(-50% - var(--deck-offset, 320px))) rotateY(16deg) scale(0.88)',
        opacity: isJumping ? 0 : 'var(--peek-opacity, 0.76)' as unknown as number,
        zIndex: 5,
        pointerEvents: 'none',
      };
    }
  }

  return (
    <div>
      {/* Perspective wrapper + CSS variable overrides per breakpoint */}
      <div
        className="[--deck-offset:220px] sm:[--deck-offset:270px] lg:[--deck-offset:305px] [--peek-opacity:0.7]"
        style={{ perspective: '1100px', perspectiveOrigin: '50% 40%' }}
      >
        {/* Card track — clips lateral overflow */}
        <div className="relative overflow-hidden" style={{ height: '470px' }}>
          {CARDS.map((CardComp, i) => (
            <div key={i} style={cardStyle(i)}>
              <CardComp />
            </div>
          ))}
        </div>
      </div>

      {/* Dot navigation */}
      <div className="flex items-center justify-center gap-2 mt-4" role="tablist" aria-label="Přepínání karet">
        {[0, 1, 2].map(i => (
          <button
            key={i}
            role="tab"
            aria-selected={i === active}
            aria-label={`Karta ${i + 1}`}
            onClick={() => {
              if (i === active) return;
              const jump = (active + 2) % 3;
              const forwardJump = (i - active + 3) % 3 === 1 ? jump : -1;
              setJumping(forwardJump);
              setActive(i);
              if (jumpTimer.current) clearTimeout(jumpTimer.current);
              jumpTimer.current = setTimeout(() => setJumping(-1), 750);
            }}
            className={[
              'h-1.5 rounded-full transition-all duration-300 cursor-pointer border-0',
              i === active ? 'w-5 bg-brass' : 'w-1.5 hover:bg-dim',
            ].join(' ')}
            style={{ background: i === active ? undefined : 'var(--color-faint)' }}
          />
        ))}
      </div>
    </div>
  );
}
