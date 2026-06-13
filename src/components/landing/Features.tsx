import {
  BarChart3,
  Globe,
  History,
  Link2,
  Radar,
  Timer,
} from 'lucide-react';
import AnimateOnScroll from '@/components/animate-on-scroll';
import { SectionHead } from './HowItWorks';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

/**
 * Features — „přehled platformy" po vzoru brego.io: mřížka karet
 * s ikonou v modrém chipu, nadpisem a krátkým popisem. Texty jdou
 * z admin CMS (registry skupina „Přehled platformy"), ikony jsou
 * záměrně napevno — patří k designu, ne k obsahu.
 */
export default async function Features() {
  const t = await getSiteContent();
  const features = [
    { icon: Radar, title: t('features.0.title'), body: t('features.0.body') },
    { icon: BarChart3, title: t('features.1.title'), body: t('features.1.body') },
    { icon: Globe, title: t('features.2.title'), body: t('features.2.body') },
    { icon: Link2, title: t('features.3.title'), body: t('features.3.body') },
    { icon: History, title: t('features.4.title'), body: t('features.4.body') },
    { icon: Timer, title: t('features.5.title'), body: t('features.5.body') },
  ];

  return (
    <section id="features" className="px-[22px] py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1240px]">
        <AnimateOnScroll>
          <SectionHead
            eyebrow={t('features.eyebrow')}
            title={<RichText>{t('features.title')}</RichText>}
            align="center"
          />
        </AnimateOnScroll>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <AnimateOnScroll key={f.title} delay={i * 90}>
                <article
                  className="group h-full rounded-[16px] border border-line bg-surface p-7 transition-[border-color,box-shadow] duration-300 hover:border-brass/40"
                  style={{ boxShadow: 'var(--shadow-cargent-card)' }}
                >
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-brass/10 text-brass transition-colors duration-300 group-hover:bg-brass group-hover:text-white"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 text-[17px] font-bold tracking-tight text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-dim">
                    <RichText>{f.body}</RichText>
                  </p>
                </article>
              </AnimateOnScroll>
            );
          })}
        </div>
      </div>
    </section>
  );
}
