/**
 * Hero background motif — instead of the generic dotted/grid pattern that
 * commodity AI landing pages all use, Cargent shows a faint "instrument"
 * gauge in the top-right: concentric rings, tick marks, a thin needle.
 *
 * Combined with two soft radial glows (brass top-right, emerald bottom-left)
 * and a very subtle SVG film grain. All elements pointer-events: none and
 * z-index 0 so they never intercept clicks or hurt readability.
 */
export default function BackgroundDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* ── Brass glow — top right ─────────────────────────────────── */}
      <div
        className="absolute -top-40 -right-32 h-[640px] w-[640px] rounded-full opacity-60 blur-[120px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(176, 121, 29, 0.22), rgba(176, 121, 29, 0) 70%)',
        }}
      />

      {/* ── Emerald glow — bottom left ─────────────────────────────── */}
      <div
        className="absolute -bottom-48 -left-32 h-[560px] w-[560px] rounded-full opacity-50 blur-[120px]"
        style={{
          background:
            'radial-gradient(circle at center, rgba(28, 107, 87, 0.18), rgba(28, 107, 87, 0) 70%)',
        }}
      />

      {/* ── Gauge instrument — top right corner ────────────────────── */}
      <svg
        viewBox="0 0 480 480"
        className="absolute -top-16 right-[6%] h-[420px] w-[420px] opacity-40 md:h-[520px] md:w-[520px]"
        fill="none"
        stroke="currentColor"
      >
        {/* Outer ring — solid hairline (brass) */}
        <circle
          cx="240"
          cy="240"
          r="220"
          stroke="rgba(176, 121, 29, 0.32)"
          strokeWidth="1"
        />
        {/* Tick marks — dashed circle */}
        <circle
          cx="240"
          cy="240"
          r="200"
          stroke="rgba(176, 121, 29, 0.45)"
          strokeWidth="1.5"
          strokeDasharray="2 14"
        />
        {/* Middle ring */}
        <circle
          cx="240"
          cy="240"
          r="170"
          stroke="rgba(20, 23, 28, 0.10)"
          strokeWidth="1"
        />
        {/* Inner ring — emerald accent */}
        <circle
          cx="240"
          cy="240"
          r="120"
          stroke="rgba(28, 107, 87, 0.22)"
          strokeWidth="1"
        />

        {/* Needle — animated rotation (CSS) */}
        <g
          className="cargent-gauge-needle"
          style={{ ['--needle-deg' as string]: '32deg' }}
        >
          <line
            x1="240"
            y1="240"
            x2="240"
            y2="60"
            stroke="rgba(176, 121, 29, 0.7)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </g>

        {/* Centre dot */}
        <circle cx="240" cy="240" r="6" fill="rgba(176, 121, 29, 0.85)" />
        <circle
          cx="240"
          cy="240"
          r="14"
          stroke="rgba(176, 121, 29, 0.4)"
          strokeWidth="1"
        />
      </svg>

      {/* ── Film grain — SVG feTurbulence overlay ──────────────────── */}
      <svg
        className="cargent-grain absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="cargent-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cargent-noise)" />
      </svg>
    </div>
  );
}
