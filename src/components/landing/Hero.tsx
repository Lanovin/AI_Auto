import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BackgroundDecor from './BackgroundDecor';
import CardDeck from './CardDeck';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

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
      className="relative isolate overflow-hidden pb-16 pt-14 md:pb-24 md:pt-20"
    >
      <BackgroundDecor />

      <div className="mx-auto max-w-310 px-5.5 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,1fr)] gap-10 lg:gap-12 xl:gap-16 items-center">

          {/* ── LEFT: text column ──────────────────────────────────────── */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">

            {/* Eyebrow chip */}
            <span
              className="animate-fade-up inline-flex items-center gap-2.5 rounded-full border border-line bg-surface px-4 py-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-soft shadow-[0_1px_2px_rgba(10,27,51,0.05)]"
              style={{ animationDelay: '0ms' }}
            >
              <span className="cargent-pulse h-1.5 w-1.5 rounded-full bg-brass" aria-hidden="true" />
              {t('hero.eyebrow').replace(/^[—–-]\s*/, '')}
            </span>

            {/* Headline */}
            <h1
              className="animate-rise-soft cargent-h1 mt-6"
              style={{ animationDelay: '100ms', fontSize: 'clamp(34px, 4.8vw, 62px)' }}
            >
              <RichText>{t('hero.title')}</RichText>
            </h1>

            <p
              className="animate-rise-soft mt-5 max-w-[50ch] text-[16px] leading-relaxed text-ink-soft md:text-[17px]"
              style={{ animationDelay: '220ms' }}
            >
              <RichText>{t('hero.subtitle')}</RichText>
            </p>

            {/* CTA row */}
            <div
              className="animate-rise-soft mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3.5"
              style={{ animationDelay: '320ms' }}
            >
              <Link
                href="/odhad-ceny"
                style={{ color: '#FFFFFF' }}
                className="group inline-flex items-center gap-2.5 rounded-full bg-brass py-3.5 pl-7 pr-6 text-[15px] font-semibold text-white shadow-[0_8px_24px_-10px_rgba(37,99,235,0.55)] transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {t('hero.cta_primary')}
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="#how"
                className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface px-7 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
              >
                {t('hero.cta_secondary')}
              </Link>
            </div>

            <p
              className="animate-rise-soft mt-4 text-[13px] text-faint"
              style={{ animationDelay: '380ms' }}
            >
              {t('hero.microcopy')}
            </p>

            {/* Metric row */}
            <dl
              className="animate-rise-soft mt-10 flex flex-wrap items-stretch justify-center lg:justify-start gap-y-5"
              style={{ animationDelay: '460ms' }}
            >
              {metrics.map((m, i) => (
                <div
                  key={m.label}
                  className={[
                    'flex flex-col items-center lg:items-start gap-1 px-7 lg:px-8',
                    i > 0 ? 'border-l border-line' : '',
                    i === 0 ? 'pl-0' : '',
                  ].join(' ')}
                >
                  <dd className="cargent-mono order-1 text-[24px] font-medium leading-none text-ink md:text-[28px]">
                    {m.value}
                  </dd>
                  <dt className="order-2 mt-1.5 text-[12.5px] text-dim">{m.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* ── RIGHT: card carousel ───────────────────────────────────── */}
          <div
            className="animate-rise-soft w-full"
            style={{ animationDelay: '500ms' }}
          >
            <CardDeck />
          </div>

        </div>
      </div>
    </section>
  );
}
