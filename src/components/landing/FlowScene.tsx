/**
 * FlowScene — hero animace: údaje o voze → AI prohledá inzeráty → tržní cena.
 * Autíčko projede od panáčka přes AI k ciferníku; každá stanice „ožije“, když
 * u ní auto stojí. Čistě CSS keyframes (globals.css, prefix .flow-*), žádný JS.
 *
 * Geometrie: stanice na třetinách (x = 167 / 500 / 833), cesta y = 250.
 * CSS proměnné --flow-mid / --flow-end = vzdálenosti mezi stanicemi.
 */
export default function FlowScene({ labels }: { labels: [string, string, string] }) {
  const stations = [167, 500, 833];
  const y = 140;
  const roadY = 250;

  return (
    <div className="mx-auto w-full max-w-[960px]">
      <svg
        viewBox="0 64 1000 236"
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={`${labels[0]}, ${labels[1]}, ${labels[2]}`}
        style={{ ['--flow-mid' as string]: '333px', ['--flow-end' as string]: '666px', ['--needle-deg' as string]: '38deg' }}
      >
        <defs>
          <clipPath id="flow-card-clip">
            <rect x="215" y="112" width="120" height="60" rx="6" />
          </clipPath>
        </defs>

        {/* ── Cesta ─────────────────────────────────────────────── */}
        <line x1={stations[0]} y1={roadY} x2={stations[2]} y2={roadY} stroke="rgba(10,27,51,0.12)" strokeWidth="2" strokeLinecap="round" />
        <line
          className="flow-line"
          x1={stations[0]} y1={roadY} x2={stations[2]} y2={roadY}
          stroke="var(--color-brass)" strokeWidth="2" strokeLinecap="round"
        />
        {stations.map((x) => (
          <circle key={x} cx={x} cy={roadY} r="4" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1.5" />
        ))}

        {/* ── Stanice 1: uživatel + údaje ───────────────────────── */}
        <g className="flow-station-1">
          <circle cx={stations[0]} cy={y} r="36" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1.5" />
          {/* panáček */}
          <circle cx={stations[0]} cy={y - 11} r="8" fill="none" stroke="var(--color-ink)" strokeWidth="1.8" />
          <path d={`M${stations[0] - 16} ${y + 16} a16 16 0 0 1 32 0`} fill="none" stroke="var(--color-ink)" strokeWidth="1.8" strokeLinecap="round" />
          {/* karta s údaji, které se „vypisují“ */}
          <rect x="215" y="112" width="120" height="60" rx="6" fill="var(--color-paper)" stroke="rgba(10,27,51,0.16)" strokeWidth="1.2" />
          <g clipPath="url(#flow-card-clip)">
            {[
              { w: 74, delay: '0s' },
              { w: 92, delay: '0.25s' },
              { w: 56, delay: '0.5s' },
            ].map((row, i) => (
              <rect
                key={i}
                className="flow-type"
                x="227" y={124 + i * 14} width={row.w} height="5" rx="2.5"
                fill={i === 1 ? 'var(--color-brass)' : 'rgba(10,27,51,0.28)'}
                style={{ animationDelay: row.delay }}
              />
            ))}
          </g>
          {/* spojka karta → stanice */}
          <line x1={stations[0] + 36} y1={y} x2="215" y2={y + 2} stroke="rgba(10,27,51,0.16)" strokeWidth="1.2" />
        </g>

        {/* ── Stanice 2: AI hledá inzeráty ──────────────────────── */}
        <g className="flow-station-2">
          <circle className="flow-pulse" cx={stations[1]} cy={y} r="36" fill="none" stroke="var(--color-brass)" strokeWidth="1.5" style={{ transformOrigin: `${stations[1]}px ${y}px` }} />
          <circle cx={stations[1]} cy={y} r="36" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1.5" />
          {/* jiskra / uzel */}
          <path
            d={`M${stations[1]} ${y - 15} L${stations[1] + 3.5} ${y - 3.5} L${stations[1] + 15} ${y} L${stations[1] + 3.5} ${y + 3.5} L${stations[1]} ${y + 15} L${stations[1] - 3.5} ${y + 3.5} L${stations[1] - 15} ${y} L${stations[1] - 3.5} ${y - 3.5} Z`}
            fill="var(--color-brass)"
          />
          {/* obíhající „inzeráty“ při hledání */}
          <g className="flow-orbit" style={{ transformOrigin: `${stations[1]}px ${y}px` }}>
            <circle cx={stations[1]} cy={y - 54} r="4" fill="var(--color-ink)" />
            <circle cx={stations[1] + 47} cy={y + 27} r="4" fill="var(--color-ink)" />
            <circle cx={stations[1] - 47} cy={y + 27} r="4" fill="var(--color-ink)" />
            <circle cx={stations[1]} cy={y - 54} r="9" fill="none" stroke="rgba(10,27,51,0.2)" strokeWidth="1" />
            <circle cx={stations[1] + 47} cy={y + 27} r="9" fill="none" stroke="rgba(10,27,51,0.2)" strokeWidth="1" />
            <circle cx={stations[1] - 47} cy={y + 27} r="9" fill="none" stroke="rgba(10,27,51,0.2)" strokeWidth="1" />
          </g>
        </g>

        {/* ── Stanice 3: ciferník s cenou ───────────────────────── */}
        <g className="flow-station-3">
          <circle cx={stations[2]} cy={y} r="36" fill="var(--color-paper)" stroke="var(--color-ink)" strokeWidth="1.5" />
          {/* stupnice */}
          <path d={`M${stations[2] - 22} ${y + 8} A22 22 0 0 1 ${stations[2] + 22} ${y + 8}`} fill="none" stroke="rgba(10,27,51,0.18)" strokeWidth="4" strokeLinecap="round" />
          <path d={`M${stations[2] - 22} ${y + 8} A22 22 0 0 1 ${stations[2] + 4} ${y - 13.6}`} fill="none" stroke="var(--color-brass)" strokeWidth="4" strokeLinecap="round" />
          {/* ručička */}
          <g className="flow-needle" style={{ transformOrigin: `${stations[2]}px ${y + 8}px` }}>
            <line x1={stations[2]} y1={y + 8} x2={stations[2]} y2={y - 14} stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" />
          </g>
          <circle cx={stations[2]} cy={y + 8} r="3" fill="var(--color-ink)" />
          {/* cena vpravo od stanice */}
          <g className="flow-price">
            <rect x={stations[2] - 62} y={y + 48} width="124" height="30" rx="6" fill="var(--color-paper)" stroke="rgba(10,27,51,0.16)" strokeWidth="1.2" />
            <text
              x={stations[2]} y={y + 68}
              textAnchor="middle"
              fontFamily="var(--font-mono)" fontSize="15" fontWeight="500" fill="var(--color-ink)"
              style={{ fontFeatureSettings: '"tnum" 1' }}
            >
              389 000 Kč
            </text>
          </g>
        </g>

        {/* ── Autíčko ───────────────────────────────────────────── */}
        <g transform={`translate(${stations[0] - 28} ${roadY - 24})`}>
        <g className="flow-car">
          <path
            d="M2 15 Q2 11 6 11 L11 11 L17 3.5 Q18 2 20 2 L36 2 Q38 2 39.5 3.5 L46 11 L52 12 Q56 12.5 56 16 L56 18 Q56 20 54 20 L2 20 Q0 20 0 18 L0 16 Q0 15 2 15 Z"
            fill="var(--color-ink)"
          />
          {/* okna */}
          <path d="M19 4 L33 4 L33 10 L14.5 10 Z" fill="var(--color-paper)" opacity="0.9" />
          <path d="M35.5 4 L37.5 4 L43.5 10 L35.5 10 Z" fill="var(--color-paper)" opacity="0.9" />
          {/* světlo */}
          <rect x="52.5" y="13.5" width="3" height="2.5" rx="1" fill="var(--color-brass)" />
          {/* kola */}
          {[13, 43].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy="20" r="5" fill="var(--color-ink)" />
              <circle cx={cx} cy="20" r="2.4" fill="var(--color-paper)" />
              <g className="flow-wheel" style={{ transformOrigin: `${cx}px 20px` }}>
                <line x1={cx - 2.4} y1="20" x2={cx + 2.4} y2="20" stroke="var(--color-ink)" strokeWidth="1" />
              </g>
            </g>
          ))}
        </g>
        </g>
      </svg>

      <ol className="mt-2 grid grid-cols-3 gap-3 text-center">
        {labels.map((label, i) => (
          <li key={label} className="flex flex-col items-center gap-1">
            <span className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">0{i + 1}</span>
            <span className="text-[13px] font-medium leading-snug text-ink-soft md:text-[14px]">{label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
