import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import AnimateOnScroll from '@/components/animate-on-scroll';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

/**
 * Final CTA — tmavě modrý panel po vzoru enterprise sekcí brego.io:
 * navy podklad s jemnou modrou září, bílý titulek se světle modrým
 * akcentem a bílé tlačítko.
 */
export default async function CTA() {
  const t = await getSiteContent();
  return (
    <section className="px-[22px] py-20 md:px-8 md:py-28">
      <div
        className="relative mx-auto max-w-[1240px] overflow-hidden rounded-[24px] bg-ink px-6 py-16 md:px-12 md:py-24"
        style={{ boxShadow: 'var(--shadow-cargent)' }}
      >
        {/* Modrá záře v panelu */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[680px] -translate-x-1/2 -translate-y-1/3 opacity-60 blur-[120px]"
          style={{ background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.45), rgba(37,99,235,0) 70%)' }}
        />

        <div className="relative mx-auto max-w-[680px] text-center">
          <AnimateOnScroll>
            <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8FB0FF]">
              {t('cta.eyebrow').replace(/^[—–-]\s*/, '')}
            </span>
          </AnimateOnScroll>

          <AnimateOnScroll delay={100}>
            <h2
              className="cargent-h2 mt-6 text-[36px] md:text-[52px]"
              style={{ color: '#FFFFFF', ['--color-brass' as string]: '#8FB0FF' }}
            >
              <RichText>{t('cta.title')}</RichText>
            </h2>
          </AnimateOnScroll>

          <AnimateOnScroll delay={200}>
            <p className="mx-auto mt-5 max-w-[44ch] text-[16px] leading-relaxed text-[#B8C4D9] md:text-[17px]">
              <RichText>{t('cta.subtitle')}</RichText>
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={300}>
            <div className="mt-10 flex flex-col items-center gap-5">
              <Link
                href="/odhad-ceny"
                style={{ color: 'var(--color-ink)' }}
                className="group inline-flex items-center gap-2.5 rounded-full bg-white py-4 pl-8 pr-6 text-[16px] font-semibold transition-colors hover:bg-[#E8EEF9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              >
                {t('cta.button')}
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 text-brass transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#8093B0]">
                {t('cta.microcopy')}
              </p>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
