import { getSiteContent } from '@/lib/content/server';

/**
 * TrustStrip — sociální důkaz po vzoru brego.io:
 *   • nahoře řádek inzertních portálů, ze kterých čerpáme (textové
 *     wordmarky — obdoba „logo stripu", ale pravdivá: žádní smyšlení
 *     klienti),
 *   • pod ním čtyři klíčové statistiky jako bílé karty na světlém pásu.
 */
const PORTALS = [
  'Sauto.cz',
  'TipCars',
  'AutoScout24',
  'mobile.de',
  'Otomoto',
  'Willhaben',
  'La Centrale',
];

export default async function TrustStrip() {
  const t = await getSiteContent();
  const items = [
    { stat: t('trust.0.stat'), label: t('trust.0.label') },
    { stat: t('trust.1.stat'), label: t('trust.1.label') },
    { stat: t('trust.2.stat'), label: t('trust.2.label') },
    { stat: t('trust.3.stat'), label: t('trust.3.label') },
  ];

  return (
    <section
      aria-label="Zdroje dat a klíčové statistiky"
      className="border-y border-line bg-paper-2/70 px-[22px] py-14 md:px-8 md:py-16"
    >
      <div className="mx-auto max-w-[1240px]">
        {/* ── Portály — textové wordmarky ──────────────────────────── */}
        <p className="text-center text-[12px] font-medium uppercase tracking-[0.16em] text-faint">
          Čerpáme z předních inzertních portálů
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {PORTALS.map((name) => (
            <li
              key={name}
              className="text-[17px] font-bold tracking-tight text-dim transition-colors hover:text-ink"
            >
              {name}
            </li>
          ))}
        </ul>

        {/* ── Statistiky — karty ───────────────────────────────────── */}
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {items.map((item) => {
            const hasDigit = /\d/.test(item.stat);
            return (
            <div
              key={item.label}
              className="rounded-[14px] border border-line bg-surface px-6 py-6"
              style={{ boxShadow: 'var(--shadow-cargent-card)' }}
            >
              <span className={`cargent-mono block font-medium leading-none md:text-[30px] ${hasDigit ? 'text-[26px] text-brass' : 'text-[18px] text-ink-soft'}`}>
                {item.stat}
              </span>
              <span className="mt-2.5 block text-[13px] leading-snug text-dim">
                {item.label}
              </span>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
