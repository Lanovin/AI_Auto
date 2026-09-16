import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import AnimateOnScroll from '@/components/animate-on-scroll';
import { SectionHead } from './HowItWorks';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';
import { getTokenPricing } from '@/lib/tokens-server';
import { ESTIMATOR_TIERS, TOKEN_VALUE_CZK, formatTokens } from '@/lib/tokens';
import { PLANS, ONE_TIME_PLAN_ORDER } from '@/lib/stripe/config';

/**
 * Ceník na úvodní stránce — co stojí jednotlivé úrovně ocenění (v tokenech
 * i v korunách) a za kolik se tokeny kupují. Živé ceny z admin ceníku.
 */
export default async function PricingPreview() {
  const t = await getSiteContent();
  const pricing = await getTokenPricing();
  const cheapest = PLANS[ONE_TIME_PLAN_ORDER[0]];
  const best = PLANS[ONE_TIME_PLAN_ORDER[ONE_TIME_PLAN_ORDER.length - 1]];

  return (
    <section id="cenik" className="scroll-mt-20 px-5.5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1100px]">
        <AnimateOnScroll>
          <SectionHead
            eyebrow={t('pricing.eyebrow')}
            title={<RichText>{t('pricing.title')}</RichText>}
            lead={<RichText>{t('pricing.subtitle')}</RichText>}
          />
        </AnimateOnScroll>

        <AnimateOnScroll delay={120}>
          <div className="mt-12 overflow-hidden border-t border-line">
            {ESTIMATOR_TIERS.map((tier) => {
              const cost = pricing[tier.feature];
              return (
                <div
                  key={tier.key}
                  className="grid gap-3 border-b border-line py-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_minmax(0,1.2fr)] md:items-baseline md:gap-8"
                >
                  <div>
                    <h3 className="text-[18px] font-bold tracking-tight text-ink">{tier.label}</h3>
                    <p className="mt-0.5 text-[13px] text-dim">{tier.tagline}</p>
                  </div>
                  <p className="text-[14.5px] leading-relaxed text-ink-soft">{tier.description}</p>
                  <div className="flex items-baseline gap-2 md:justify-end">
                    <span className="cargent-mono text-[20px] font-medium text-ink">
                      {cost === 0 ? 'Zdarma' : formatTokens(cost)}
                    </span>
                    {cost > 0 ? (
                      <span className="cargent-mono text-[13px] text-dim">≈ {(cost * TOKEN_VALUE_CZK).toLocaleString('cs-CZ')} Kč</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={200}>
          <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="max-w-[60ch] text-[14.5px] leading-relaxed text-ink-soft">
              Tokeny kupujete v balíčcích od {cheapest.priceCzk.toLocaleString('cs-CZ')} Kč ({cheapest.bonusTokens} tokenů)
              do {best.priceCzk.toLocaleString('cs-CZ')} Kč ({best.bonusTokens.toLocaleString('cs-CZ')} tokenů). Větší balíček = levnější token. Tokeny nevyprší.
            </p>
            <Link
              href="/cenik"
              className="group inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold text-brass transition-colors hover:text-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              Celý ceník a balíčky
              <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
