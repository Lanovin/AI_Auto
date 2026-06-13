import AnimateOnScroll from '@/components/animate-on-scroll';
import { SectionHead } from './HowItWorks';
import {
  COMPARABLES,
  COMPARABLES_TOTAL,
  MEDIAN_PRICE,
  formatCzk,
  formatKm,
} from '@/data/demo';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

/**
 * Engine — „Proč věřit naší ceně?", data-driven look po vzoru brego.io.
 *
 * Levý sloupec: důvody důvěry jako řádky s modrým stat chipem.
 * Pravý sloupec: tabulka srovnatelných vozů jako čistá produktová
 * karta — mono čísla, vlasové linky, zvýrazněný medián v patičce.
 */
export default async function Engine() {
  const t = await getSiteContent();
  const trustReasons = [
    { stat: t('engine.reason.0.stat'), title: t('engine.reason.0.title'), body: t('engine.reason.0.body') },
    { stat: t('engine.reason.1.stat'), title: t('engine.reason.1.title'), body: t('engine.reason.1.body') },
    { stat: t('engine.reason.2.stat'), title: t('engine.reason.2.title'), body: t('engine.reason.2.body') },
    { stat: t('engine.reason.3.stat'), title: t('engine.reason.3.title'), body: t('engine.reason.3.body') },
  ];

  return (
    <section id="engine" className="px-[22px] py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1240px] items-start gap-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20">

        {/* ── Left: trust reasons ──────────────────────────────────── */}
        <div className="lg:sticky lg:top-24">
          <AnimateOnScroll>
            <SectionHead
              eyebrow={t('engine.eyebrow')}
              title={<RichText>{t('engine.title')}</RichText>}
            />
          </AnimateOnScroll>

          <AnimateOnScroll delay={120}>
            <ul className="mt-10">
              {trustReasons.map((r) => (
                <li
                  key={r.title}
                  className="group border-b border-line py-5 transition-[padding] duration-300 first:border-t hover:pl-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-[15px] font-bold tracking-tight text-ink">
                      {r.title}
                    </h3>
                    <span className="cargent-mono shrink-0 rounded-full bg-brass/10 px-3 py-1 text-[13px] font-medium text-brass">
                      {r.stat}
                    </span>
                  </div>
                  <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-dim">
                    <RichText>{r.body}</RichText>
                  </p>
                </li>
              ))}
            </ul>
          </AnimateOnScroll>
        </div>

        {/* ── Right: comparables — clean data card ─────────────────── */}
        <AnimateOnScroll delay={180}>
          <article
            className="rounded-[16px] border border-line bg-surface px-6 py-5 md:px-7 md:py-6"
            style={{ boxShadow: 'var(--shadow-cargent-2)' }}
          >
            <header className="flex items-baseline justify-between gap-3">
              <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-faint">
                {t('engine.table_caption')}
              </p>
              <p className="cargent-mono shrink-0 rounded-full bg-paper-2 px-3 py-1 text-[11px] text-ink-soft">
                <span className="font-medium text-ink">{COMPARABLES_TOTAL}</span> inzerátů
              </p>
            </header>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-line-2 text-[10px] uppercase tracking-[0.14em] text-faint">
                    <th className="py-3 pr-4 text-left font-semibold">Vůz</th>
                    <th className="px-2 py-3 text-right font-semibold">Najeto</th>
                    <th className="px-2 py-3 text-right font-semibold">Cena</th>
                    <th className="py-3 pl-2 text-right font-semibold">Odchylka</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARABLES.map((row, i) => {
                    const dev = row.deviationPct;
                    const positive = dev > 0;
                    return (
                      <tr
                        key={i}
                        className="border-b border-line transition-colors last:border-b-0 hover:bg-paper-2/60"
                      >
                        <td className="py-3.5 pr-4 font-medium text-ink">{row.vehicle}</td>
                        <td className="cargent-mono px-2 py-3.5 text-right tabular-nums text-dim">
                          {formatKm(row.mileage)}
                        </td>
                        <td className="cargent-mono px-2 py-3.5 text-right font-medium tabular-nums text-ink">
                          {formatCzk(row.price)}
                        </td>
                        <td
                          className={[
                            'cargent-mono py-3.5 pl-2 text-right font-medium tabular-nums',
                            positive ? 'text-emerald' : 'text-negative',
                          ].join(' ')}
                        >
                          {positive ? '+' : '−'}{Math.abs(dev).toFixed(1)}&thinsp;%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <footer className="mt-5 flex items-center justify-between gap-4 rounded-[12px] bg-brass/[0.07] px-4 py-3.5">
              <span className="text-[12px] font-medium text-ink-soft">
                Doporučená cena dle mediánu
              </span>
              <span className="cargent-mono shrink-0 text-[17px] font-medium tabular-nums text-brass">
                {formatCzk(MEDIAN_PRICE)} Kč
              </span>
            </footer>
          </article>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
