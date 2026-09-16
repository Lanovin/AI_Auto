import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import FlowScene from './FlowScene';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

/**
 * Hero — čistá bílá plocha, nadpis na střed a pod ním animace toku:
 * údaje → AI → cena (autíčko projede celou cestu). Žádné karty, žádné pruhy.
 */
export default async function Hero() {
  const t = await getSiteContent();

  return (
    <section id="main" className="px-5.5 pb-10 pt-12 md:px-8 md:pb-16 md:pt-20">
      <div className="mx-auto flex max-w-[760px] flex-col items-center text-center">
        <span
          className="animate-fade-up inline-flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-brass"
          style={{ animationDelay: '0ms' }}
        >
          {t('hero.eyebrow')}
        </span>

        <h1
          className="animate-rise-soft cargent-h1 mt-5"
          style={{ animationDelay: '80ms', fontSize: 'clamp(38px, 6vw, 68px)', letterSpacing: '-0.034em' }}
        >
          <RichText>{t('hero.title')}</RichText>
        </h1>

        <p
          className="animate-rise-soft mt-5 max-w-[56ch] text-[16px] leading-relaxed text-ink-soft md:text-[17px]"
          style={{ animationDelay: '180ms' }}
        >
          <RichText>{t('hero.subtitle')}</RichText>
        </p>

        <div
          className="animate-rise-soft mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: '260ms' }}
        >
          <Link
            href="/odhad-ceny"
            className="group inline-flex items-center gap-2.5 rounded-md bg-brass py-3.5 pl-7 pr-6 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {t('hero.cta_primary')}
            <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            href="#how"
            className="inline-flex items-center rounded-md border border-line-2 px-7 py-3.5 text-[15px] font-semibold text-ink transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            {t('hero.cta_secondary')}
          </Link>
        </div>

        <p className="animate-rise-soft mt-4 text-[13px] text-faint" style={{ animationDelay: '320ms' }}>
          {t('hero.microcopy')}
        </p>
      </div>

      <div className="animate-fade-up mt-8 md:mt-10" style={{ animationDelay: '420ms' }}>
        <FlowScene labels={[t('hero.flow.0'), t('hero.flow.1'), t('hero.flow.2')]} />
      </div>
    </section>
  );
}
