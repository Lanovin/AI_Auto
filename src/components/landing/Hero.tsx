import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import BackgroundDecor from './BackgroundDecor';
import CardDeck from './CardDeck';
import ExplodedCar from './ExplodedCar';
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
        {/* ── Nadpis ───────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center">
          <span
            className="animate-fade-up inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-dim"
            style={{ animationDelay: '0ms' }}
          >
            <span className="h-px w-5 bg-brass" aria-hidden="true" />
            {t('hero.eyebrow').replace(/^[—–-]\s*/, '')}
          </span>

          <h1
            className="animate-rise-soft cargent-h1 mt-6"
            style={{ animationDelay: '100ms', fontSize: 'clamp(40px, 5.6vw, 74px)', letterSpacing: '-0.036em' }}
          >
            <RichText>{t('hero.title')}</RichText>
          </h1>

          <p
            className="animate-rise-soft mt-5 max-w-[58ch] text-[16px] leading-relaxed text-ink-soft md:text-[17px]"
            style={{ animationDelay: '220ms' }}
          >
            <RichText>{t('hero.subtitle')}</RichText>
          </p>
        </div>

        {/* ── Rozložené auto s cenovkami a součtem ─────────────────── */}
        <div
          className="animate-rise-soft mt-10 md:mt-14"
          style={{ animationDelay: '340ms' }}
        >
          <ExplodedCar caption={t('hero.car_caption')} />
        </div>

        {/* ── Upoutávka na ocenění ─────────────────────────────────── */}
        <div
          className="mt-16 rounded-[20px] border border-line bg-paper-2/70 px-6 py-10 md:mt-20 md:px-12 md:py-14"
        >
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <span className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-dim">
                <span className="h-px w-5 bg-brass" aria-hidden="true" />
                {t('hero.teaser.eyebrow')}
              </span>
              <h2
                className="cargent-h2 mt-5"
                style={{ fontSize: 'clamp(30px, 3.8vw, 48px)' }}
              >
                <RichText>{t('hero.teaser.title')}</RichText>
              </h2>
              <p className="mt-4 max-w-[52ch] text-[16px] leading-relaxed text-ink-soft">
                <RichText>{t('hero.teaser.body')}</RichText>
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5 lg:justify-start">
                <Link
                  href="/odhad-ceny"
                  style={{ color: '#FFFFFF' }}
                  className="group inline-flex items-center gap-2.5 rounded-md bg-brass py-3.5 pl-7 pr-6 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  {t('hero.cta_primary')}
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
                <Link
                  href="#how"
                  className="inline-flex items-center gap-2 rounded-md border border-line-2 bg-surface px-7 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
                >
                  {t('hero.cta_secondary')}
                </Link>
              </div>

              <p className="mt-4 text-[13px] text-faint">{t('hero.microcopy')}</p>
            </div>

            <dl className="grid grid-cols-3 gap-4 lg:grid-cols-1 lg:gap-0">
              {metrics.map((m, i) => (
                <div
                  key={m.label}
                  className={[
                    'flex flex-col items-center gap-1 text-center lg:flex-row lg:items-baseline lg:justify-between lg:gap-6 lg:text-left',
                    i > 0 ? 'lg:border-t lg:border-line' : '',
                    'lg:py-5',
                  ].join(' ')}
                >
                  <dt className="order-2 text-[12.5px] text-dim lg:order-1 lg:text-[14px]">
                    {m.label}
                  </dt>
                  <dd className="cargent-mono order-1 text-[24px] font-medium leading-none text-ink md:text-[30px] lg:order-2">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── Ukázka ocenění ───────────────────────────────────────── */}
        <div className="mt-14 md:mt-16">
          <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
            {t('hero.deck_caption')}
          </p>
          <CardDeck />
        </div>
      </div>
    </section>
  );
}
