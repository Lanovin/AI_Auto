'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

/**
 * ProcessDemo — simulovaný průběh ocenění: údaje se vyplní → klik → čekání
 * (fáze hledání) → cena „vyskočí“. Nic nevolá, nespotřebuje kredit.
 * Spouští se, když je vidět; po dokončení se sama zopakuje.
 */

type Phase = 'typing' | 'click' | 'waiting' | 'result';

const FIELDS = [
  { label: 'Značka', value: 'Škoda' },
  { label: 'Model', value: 'Octavia Combi' },
  { label: 'Rok výroby', value: '2019' },
  { label: 'Najeto', value: '98 000 km' },
  { label: 'Palivo', value: 'Diesel' },
  { label: 'Převodovka', value: 'DSG' },
];

const STAGES = [
  'Prohledávám Sauto.cz…',
  'Prohledávám TipCars a AutoScout24…',
  'Nalezeno 14 srovnatelných inzerátů',
  'Přepočítávám na nájezd a rok, vyřazuji odlehlé…',
];

const LISTINGS = [
  { portal: 'Sauto.cz', spec: '2019 · 91 000 km · DSG', price: '395 000' },
  { portal: 'TipCars', spec: '2019 · 104 000 km · DSG', price: '379 000' },
  { portal: 'AutoScout24', spec: '2018 · 96 000 km · DSG', price: '369 000' },
];

const STEPS: Array<{ key: Phase; label: string }> = [
  { key: 'typing', label: 'Zadání údajů' },
  { key: 'click', label: 'Spuštění' },
  { key: 'waiting', label: 'Prohledání trhu' },
  { key: 'result', label: 'Cena' },
];

export default function ProcessDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [typed, setTyped] = useState(0);
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Časová osa jedné smyčky
  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setPhase('result'); setTyped(FIELDS.length); setStage(STAGES.length - 1); setProgress(100);
      return;
    }
    const timers: number[] = [];
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(fn, ms));

    setPhase('typing'); setTyped(0); setStage(0); setProgress(0);
    FIELDS.forEach((_, i) => at(350 + i * 420, () => setTyped(i + 1)));
    const tClick = 350 + FIELDS.length * 420 + 500;
    at(tClick, () => setPhase('click'));
    const tWait = tClick + 700;
    at(tWait, () => setPhase('waiting'));
    const waitMs = 4200;
    STAGES.forEach((_, i) => at(tWait + (i * waitMs) / STAGES.length, () => setStage(i)));
    for (let p = 0; p <= 20; p++) at(tWait + (p * waitMs) / 20, () => setProgress(Math.min(95, p * 5)));
    const tResult = tWait + waitMs;
    at(tResult, () => { setProgress(100); setPhase('result'); });
    at(tResult + 6500, () => setRun((r) => r + 1));

    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [inView, run, reduced]);

  const activeIndex = STEPS.findIndex((s) => s.key === phase);

  return (
    <div ref={rootRef} className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-14">
      {/* ── Kroky ─────────────────────────────────────────────── */}
      <ol className="flex flex-row gap-4 lg:flex-col lg:gap-0 lg:border-l lg:border-line" aria-label="Fáze ocenění">
        {STEPS.map((s, i) => {
          const state = i < activeIndex ? 'done' : i === activeIndex ? 'active' : 'todo';
          return (
            <li
              key={s.key}
              className={[
                'flex items-center gap-3 lg:-ml-px lg:border-l-2 lg:py-3.5 lg:pl-5',
                state === 'active' ? 'lg:border-brass' : state === 'done' ? 'lg:border-ink' : 'lg:border-transparent',
              ].join(' ')}
              aria-current={state === 'active' ? 'step' : undefined}
            >
              <span
                className={[
                  'cargent-mono text-[11px] uppercase tracking-[0.14em]',
                  state === 'active' ? 'text-brass' : state === 'done' ? 'text-ink' : 'text-faint',
                ].join(' ')}
              >
                0{i + 1}
              </span>
              <span className={['text-[14px] font-medium', state === 'todo' ? 'text-faint' : 'text-ink'].join(' ')}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* ── Obrazovka ─────────────────────────────────────────── */}
      <div className="relative rounded-lg border border-line bg-surface p-5 md:p-7" style={{ boxShadow: 'var(--shadow-cargent-card)' }} aria-live="polite">
        <div className="flex items-center justify-between gap-3">
          <span className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-dim">
            {phase === 'result' ? 'Výsledek' : 'Odhad ceny · Standardní'}
          </span>
          <button
            type="button"
            onClick={() => setRun((r) => r + 1)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-dim transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            aria-label="Přehrát ukázku znovu"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Znovu
          </button>
        </div>

        {phase !== 'result' ? (
          <div className="mt-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {FIELDS.map((f, i) => {
                const filled = i < typed;
                const typingNow = i === typed && phase === 'typing';
                return (
                  <div key={f.label} className="border-b border-line pb-2">
                    <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{f.label}</dt>
                    <dd className="mt-1 min-h-[22px] text-[15px] font-medium text-ink">
                      {filled ? f.value : typingNow ? <span className="cargent-caret inline-block h-[16px] w-[2px] bg-brass align-middle" /> : ''}
                    </dd>
                  </div>
                );
              })}
            </dl>

            <div className="mt-6 flex flex-col gap-4">
              <div
                className={[
                  'inline-flex w-fit items-center gap-2 rounded-md px-6 py-3 text-[15px] font-semibold text-white transition-all duration-200',
                  phase === 'click' ? 'scale-[0.97] bg-brass-2' : phase === 'waiting' ? 'bg-brass/70' : 'bg-brass',
                ].join(' ')}
                aria-hidden="true"
              >
                {phase === 'waiting' ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Prohledávám trh…
                  </>
                ) : (
                  'Odhadnout cenu'
                )}
              </div>

              {phase === 'waiting' ? (
                <div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-paper-2">
                    <div className="h-full rounded-full bg-brass transition-[width] duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-2.5 text-[13.5px] text-ink-soft">{STAGES[stage]}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="cargent-price-pop">
              <p className="text-[12px] text-dim">Tržní cena · Škoda Octavia Combi 2019</p>
              <p className="cargent-mono mt-1 text-[40px] font-medium leading-none text-ink md:text-[46px]">
                389 000 <span className="text-[20px] text-ink-soft">Kč</span>
              </p>
              <p className="cargent-mono mt-2 text-[13px] text-dim">pásmo 362 000 – 415 000 Kč</p>
              <Gauge />
              <p className="cargent-mono text-[11px] text-faint">14 inzerátů · vážený medián</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-faint">Srovnatelné inzeráty</p>
              <ul className="mt-2 border-t border-line">
                {LISTINGS.map((l) => (
                  <li key={l.portal} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 text-[13.5px]">
                    <span>
                      <span className="font-medium text-ink">{l.portal}</span>
                      <span className="ml-2 text-dim">{l.spec}</span>
                    </span>
                    <span className="cargent-mono shrink-0 text-ink">{l.price} Kč</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-faint">+ 11 dalších · ukázková data</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Gauge() {
  return (
    <svg viewBox="0 0 160 90" className="mt-4 h-auto w-[170px]" aria-hidden="true">
      <path d="M14 82 A66 66 0 0 1 146 82" fill="none" stroke="rgba(10,27,51,0.12)" strokeWidth="8" strokeLinecap="round" />
      <path d="M14 82 A66 66 0 0 1 108 22" fill="none" stroke="var(--color-brass)" strokeWidth="8" strokeLinecap="round" />
      <g className="cargent-gauge-needle" style={{ transformOrigin: '80px 82px', ['--needle-deg' as string]: '34deg' }}>
        <line x1="80" y1="82" x2="80" y2="30" stroke="var(--color-ink)" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <circle cx="80" cy="82" r="4" fill="var(--color-ink)" />
    </svg>
  );
}
