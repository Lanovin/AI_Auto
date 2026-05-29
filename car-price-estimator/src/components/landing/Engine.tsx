import CountUp from './CountUp';
import { SectionHead } from './HowItWorks';
import {
  COMPARABLES,
  COMPARABLES_TOTAL,
  ENGINE_METRICS,
  MEDIAN_PRICE,
  formatCzk,
  formatKm,
} from '@/data/demo';

/**
 * "Oceňovací engine" — the only section with paper-2 background.
 * Two columns: copy + metrics on the left, comparables table on the right.
 *
 * The table is the showpiece: thin hairlines, right-aligned mono values,
 * colour-coded deviations, footer with median. Demonstrates that data
 * on a light background can be read cleanly without needing decoration.
 */
export default function Engine() {
  return (
    <section
      id="engine"
      className="border-y border-[color:var(--color-line)] bg-paper-2 px-[22px] py-24 md:px-8 md:py-32"
    >
      <div className="mx-auto grid max-w-[1240px] gap-14 lg:grid-cols-2 lg:gap-20">
        {/* ── Left: copy + metrics ────────────────────────────────── */}
        <div className="flex flex-col">
          <SectionHead
            eyebrow="Oceňovací engine"
            title={
              <>
                Přesnost, kterou
                <br />
                lze <i>změřit.</i>
              </>
            }
          />

          <div className="mt-7 flex max-w-[58ch] flex-col gap-4 text-[15px] leading-relaxed text-ink-soft md:text-[16px]">
            <p>
              Cargent neukáže jen číslo. Sleduje{' '}
              <span className="font-semibold text-ink">MAE, MAPE i R²</span> napříč
              segmenty a verzemi modelu, ať si můžete ověřit, jak moc tomu
              odhadu věřit.
            </p>
            <p>
              Tréninkový set obsahuje statisíce reálných uzavřených inzerátů a
              hloubku datových bodů na vůz, kterou běžné kalkulačky cen nemají.
              Žádné &ldquo;cena podle průměru roku&rdquo;.
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-[color:var(--color-line)] pt-8">
            {ENGINE_METRICS.map((m) => (
              <div key={m.label} className="flex flex-col gap-1.5">
                <dt className="text-[11px] uppercase tracking-[0.10em] text-faint">
                  {m.label}
                </dt>
                <dd className="cargent-mono text-[28px] font-medium leading-none text-ink md:text-[34px]">
                  <CountUp value={m.value} precision={m.precision} />
                  <span className="ml-0.5 text-[18px] text-ink-soft md:text-[20px]">
                    {m.suffix}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Right: comparables data table ───────────────────────── */}
        <article
          className="rounded-[22px] border border-[color:var(--color-line)] bg-surface p-6 md:p-7"
          style={{ boxShadow: 'var(--shadow-cargent-card)' }}
        >
          <header className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.10em] text-brass">
                Srovnatelné vozy v analýze
              </p>
              <p className="mt-1 text-[13px] text-ink-soft">
                Top 5 z{' '}
                <span className="cargent-mono font-medium text-ink">{COMPARABLES_TOTAL}</span>{' '}
                · po očištění odlehlých hodnot
              </p>
            </div>
            <span className="cargent-pulse h-2 w-2 shrink-0 rounded-full bg-emerald" aria-hidden="true" />
          </header>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[color:var(--color-line)] text-[11px] uppercase tracking-[0.10em] text-faint">
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
                    <tr
                      key={i}
                      className="border-b border-[color:var(--color-line)] last:border-b-0"
                    >
                      <td className="py-3 pr-4 text-ink">{row.vehicle}</td>
                      <td className="cargent-mono py-3 px-2 text-right text-ink-soft tabular-nums">
                        {formatKm(row.mileage)}
                      </td>
                      <td className="cargent-mono py-3 px-2 text-right font-medium text-ink tabular-nums">
                        {formatCzk(row.price)}
                      </td>
                      <td
                        className={[
                          'cargent-mono py-3 pl-2 text-right font-medium tabular-nums',
                          positive ? 'text-emerald' : 'text-[#9C3A2A]',
                        ].join(' ')}
                      >
                        {positive ? '+' : '−'}
                        {Math.abs(dev).toFixed(1)}&thinsp;%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="mt-5 flex items-center justify-between gap-3 rounded-[12px] border border-dashed border-[color:var(--color-line-2)] bg-paper-2/40 px-4 py-3">
            <span className="text-[12px] text-ink-soft">
              Medián trhu po očištění odlehlých hodnot
            </span>
            <span className="cargent-mono text-[15px] font-medium text-brass tabular-nums">
              → {formatCzk(MEDIAN_PRICE)} Kč
            </span>
          </footer>
        </article>
      </div>
    </section>
  );
}
