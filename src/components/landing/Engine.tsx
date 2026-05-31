import { SectionHead } from './HowItWorks';
import {
  COMPARABLES,
  COMPARABLES_TOTAL,
  MEDIAN_PRICE,
  formatCzk,
  formatKm,
} from '@/data/demo';

/**
 * Engine — přepracován na "Proč věřit naší ceně?".
 *
 * Původní framing: "Oceňovací engine · Přesnost, kterou lze změřit"
 * → zdůrazňoval technologii a akademické metriky (MAE, MAPE, R²).
 *
 * Nový framing: sociální důkaz + konkrétní ukázka dat.
 * Levý sloupec: 4 lidsky formulované důvody důvěry (ne akademické metriky).
 * Pravý sloupec: tabulka srovnatelných vozů (beze změny — vizuálně funguje).
 */

const trustReasons = [
  {
    stat: '180 000+',
    title: 'Reálných prodejů v databázi',
    body: 'Trénujeme na uzavřených inzerátech, ne jen na nabídkách. Víme, za kolik se auto skutečně prodalo.',
  },
  {
    stat: '± 4 %',
    title: 'Průměrná odchylka od prodejní ceny',
    body: 'U 9 z 10 ocenění se reálná prodejní cena vejde do našeho doporučeného pásma.',
  },
  {
    stat: '10+',
    title: 'Zdrojů dat najednou',
    body: 'Sauto, TipCars, AutoScout24 a další. Nevidíte jen jeden portál — vidíte celý trh.',
  },
  {
    stat: 'Cebia',
    title: 'Ověřená historie vozidla',
    body: 'Při ocenění zohledňujeme ověřenou historii z Cebia — nájezd, počet majitelů, havárie.',
  },
];

export default function Engine() {
  return (
    <section
      id="engine"
      className="border-y border-line bg-paper-2 px-[22px] py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto grid max-w-[1240px] gap-14 lg:grid-cols-2 lg:gap-20">

        {/* ── Left: trust reasons ──────────────────────────────────── */}
        <div className="flex flex-col">
          <SectionHead
            eyebrow="Proč věřit naší ceně"
            title={
              <>
                Čísla, která
                <br />
                <i>něco znamenají.</i>
              </>
            }
          />

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {trustReasons.map((r) => (
              <article key={r.title} className="flex flex-col gap-2 rounded-[16px] border border-line bg-surface p-5">
                <span className="cargent-mono text-[28px] font-medium text-brass">
                  {r.stat}
                </span>
                <h3 className="text-[14px] font-semibold text-ink">{r.title}</h3>
                <p className="text-[13px] leading-relaxed text-ink-soft">{r.body}</p>
              </article>
            ))}
          </div>
        </div>

        {/* ── Right: comparables table ─────────────────────────────── */}
        <article
          className="rounded-[22px] border border-line bg-surface p-6 md:p-7"
          style={{ boxShadow: 'var(--shadow-cargent-card)' }}
        >
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-brass">
                Srovnatelné vozy v analýze
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">
                Ukázka z{' '}
                <span className="cargent-mono font-medium text-ink">{COMPARABLES_TOTAL}</span>
                {' '}nalezených inzerátů
              </p>
            </div>
            <span className="cargent-pulse h-2 w-2 shrink-0 rounded-full bg-emerald" aria-hidden="true" />
          </header>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-[0.10em] text-faint">
                  <th className="py-2.5 pr-4 text-left font-medium">Vůz</th>
                  <th className="py-2.5 px-2 text-right font-medium">Najeto</th>
                  <th className="py-2.5 px-2 text-right font-medium">Cena</th>
                  <th className="py-2.5 pl-2 text-right font-medium">Odchylka</th>
                </tr>
              </thead>
              <tbody>
                {COMPARABLES.map((row, i) => {
                  const dev = row.deviationPct;
                  const positive = dev > 0;
                  return (
                    <tr key={i} className="border-b border-line last:border-b-0">
                      <td className="py-3 pr-4 text-ink">{row.vehicle}</td>
                      <td className="cargent-mono py-3 px-2 text-right text-ink-soft tabular-nums">
                        {formatKm(row.mileage)}
                      </td>
                      <td className="cargent-mono py-3 px-2 text-right font-medium text-ink tabular-nums">
                        {formatCzk(row.price)}
                      </td>
                      <td className={['cargent-mono py-3 pl-2 text-right font-medium tabular-nums', positive ? 'text-emerald' : 'text-[#9C3A2A]'].join(' ')}>
                        {positive ? '+' : '−'}{Math.abs(dev).toFixed(1)}&thinsp;%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="mt-5 flex items-center justify-between gap-3 rounded-[12px] border border-dashed border-line-2 bg-paper-2/40 px-4 py-3">
            <span className="text-[12px] text-ink-soft">Doporučená cena na základě mediánu</span>
            <span className="cargent-mono text-[15px] font-medium text-brass tabular-nums">
              → {formatCzk(MEDIAN_PRICE)} Kč
            </span>
          </footer>
        </article>
      </div>
    </section>
  );
}
