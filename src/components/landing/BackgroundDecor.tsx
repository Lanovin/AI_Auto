/**
 * Hero background — čistý data-driven podklad po vzoru brego.io:
 * jemná modrá záře za středem hera + decentní čtvercová mřížka,
 * která se ke spodnímu okraji rozpouští (radial mask).
 *
 * Všechno pointer-events: none a -z-10, ať nikdy nepřekáží obsahu.
 */
export default function BackgroundDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* ── Jemná mřížka — rozpouští se od středu dolů ─────────────── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(10, 27, 51, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(10, 27, 51, 0.05) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
          maskImage:
            'radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 70% at 50% 0%, black 30%, transparent 100%)',
        }}
      />

      {/* ── Modrá záře — za titulkem ───────────────────────────────── */}
      <div
        className="absolute left-1/2 top-[-220px] h-[620px] w-[920px] -translate-x-1/2 rounded-full opacity-60 blur-[130px]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.16), rgba(37, 99, 235, 0) 70%)',
        }}
      />

      {/* ── Druhá, slabší záře — pod ukázkovou kartou ──────────────── */}
      <div
        className="absolute bottom-[-260px] left-1/2 h-[480px] w-[760px] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(37, 99, 235, 0.10), rgba(37, 99, 235, 0) 70%)',
        }}
      />
    </div>
  );
}
