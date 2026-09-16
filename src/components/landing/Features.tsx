import AnimateOnScroll from '@/components/animate-on-scroll';
import { SectionHead } from './HowItWorks';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

/**
 * Features — „Vše pro přesné ocenění na jednom místě“ jako editorial seznam:
 * vlevo nadpis a úvodní odstavec, vpravo šest položek oddělených vlasovou
 * linkou. Bez karet, bez ikon v barevných čtvercích.
 */
export default async function Features() {
  const t = await getSiteContent();
  const features = [
    { title: t('features.list.0.title'), body: t('features.list.0.body') },
    { title: t('features.list.1.title'), body: t('features.list.1.body') },
    { title: t('features.list.2.title'), body: t('features.list.2.body') },
    { title: t('features.list.3.title'), body: t('features.list.3.body') },
    { title: t('features.list.4.title'), body: t('features.list.4.body') },
    { title: t('features.list.5.title'), body: t('features.list.5.body') },
  ];

  return (
    <section id="features" className="scroll-mt-20 px-5.5 py-20 md:px-8 md:py-28">
      <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <AnimateOnScroll>
            <SectionHead
              eyebrow={t('features.eyebrow')}
              title={<RichText>{t('features.title')}</RichText>}
              lead={<RichText>{t('features.intro')}</RichText>}
            />
          </AnimateOnScroll>
        </div>

        <dl className="border-t border-line">
          {features.map((f, i) => (
            <AnimateOnScroll key={f.title} delay={i * 70}>
              <div className="grid gap-2 border-b border-line py-6 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-6">
                <span className="cargent-mono pt-1 text-[12px] text-faint" aria-hidden="true">
                  0{i + 1}
                </span>
                <div>
                  <dt className="text-[17px] font-bold tracking-tight text-ink">{f.title}</dt>
                  <dd className="mt-1.5 max-w-[52ch] text-[15px] leading-relaxed text-ink-soft">
                    <RichText>{f.body}</RichText>
                  </dd>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </dl>
      </div>
    </section>
  );
}
