import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BackgroundDecor from './BackgroundDecor';
import Instrument from './Instrument';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

/**
 * Hero — čistý data-driven layout po vzoru brego.io:
 *   • centrovaný eyebrow chip s pulzující tečkou,
 *   • masivní tučný grotesk titulek s modrým akcentem,
 *   • dvojice CTA (plná modrá + ghost),
 *   • řádek metrik se svislými předěly,
 *   • pod tím ukázková karta ocenění (Instrument) v prezentačním rámu.
 */
export default async function Hero() {
  const t = await getSiteContent();
  const metrics = [
    { value: t('hero.metric.0.value'), label: t('hero.metric.0.label') },
    { value: t('hero.metric.1.value'), label: t('hero.metric.1.label') },
    { value: t('hero.metric.2.value'), label: t('hero.metric.2.label') },
  ];

  return (
    <section
      id="main"
      className="relative isolate overflow-hidden pb-20 pt-16 md:pb-28 md:pt-24"
    >
      <BackgroundDecor />

      <div className="mx-auto max-w-[1240px] px-[22px] md:px-8">
        <div className="mx-auto flex max-w-[820px] flex-col items-center text-center">
          {/* ── Eyebrow chip ─────────────────────────────────────────── */}
          <span
            className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-soft shadow-[0_1px_2px_rgba(10,27,51,0.05)]"
            style={{ animationDelay: '0ms' }}
          >
            <span className="cargent-pulse h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
            {t('hero.eyebrow').replace(/^[—–-]\s*/, '')}
          </span>

          {/* ── Headline ─────────────────────────────────────────────── */}
          <h1
            className="animate-rise-soft cargent-h1 mt-7"
            style={{ animationDelay: '100ms', fontSize: 'clamp(38px, 5.6vw, 72px)' }}
          >
            <RichText>{t('hero.title')}</RichText>
          </h1>

          <p
            className="animate-rise-soft mt-6 max-w-[54ch] text-[16px] leading-relaxed text-ink-soft md:text-[18px]"
            style={{ animationDelay: '220ms' }}
          >
            <RichText>{t('hero.subtitle')}</RichText>
          </p>

          {/* ── CTA row ──────────────────────────────────────────────── */}
          <div
            className="animate-rise-soft mt-9 flex flex-wrap items-center justify-center gap-4"
            style={{ animationDelay: '320ms' }}
          >
            <Link
              href="/odhad-ceny"
              style={{ color: '#FFFFFF' }}
              className="group inline-flex items-center gap-2.5 rounded-full bg-brass py-4 pl-7 pr-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(37,99,235,0.55)] transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              {t('hero.cta_primary')}
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
              />
            </Link>
            <Link
              href="#how"
              className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface px-7 py-4 text-[15px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              {t('hero.cta_secondary')}
            </Link>
          </div>

          <p
            className="animate-rise-soft mt-5 text-[13px] text-faint"
            style={{ animationDelay: '380ms' }}
          >
            {t('hero.microcopy')}
          </p>

          {/* ── Metric row — inline stats with dividers ──────────────── */}
          <dl
            className="animate-rise-soft mt-12 flex flex-wrap items-stretch justify-center gap-y-6"
            style={{ animationDelay: '460ms' }}
          >
            {metrics.map((m, i) => (
              <div
                key={m.label}
                className={[
                  'flex flex-col items-center gap-1 px-8 md:px-10',
                  i > 0 ? 'border-l border-line' : '',
                ].join(' ')}
              >
                <dd className="cargent-mono order-1 text-[26px] font-medium leading-none text-ink md:text-[30px]">
                  {m.value}
                </dd>
                <dt className="order-2 mt-1.5 text-[13px] text-dim">{m.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Product showcase — ukázka výsledku v prezentačním rámu ── */}
        <div
          className="animate-rise-soft mx-auto mt-16 max-w-[640px] md:mt-20"
          style={{ animationDelay: '560ms' }}
        >
          <div
            className="rounded-[24px] border border-line bg-paper-2/70 p-3 md:p-4"
            style={{ boxShadow: 'var(--shadow-cargent)' }}
          >
            <Instrument />
          </div>
        </div>
      </div>
    </section>
  );
}
