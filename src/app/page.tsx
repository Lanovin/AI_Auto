import Header from '@/components/landing/Header';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import HowItWorks from '@/components/landing/HowItWorks';
import PricingPreview from '@/components/landing/PricingPreview';
import ProcessDemo from '@/components/landing/ProcessDemo';
import ScrollTeaser from '@/components/landing/ScrollTeaser';
import Footer from '@/components/landing/Footer';
import AnimateOnScroll from '@/components/animate-on-scroll';
import { SectionHead } from '@/components/landing/HowItWorks';
import { RichText } from '@/components/rich-text';
import { getSiteContent } from '@/lib/content/server';

// Texty z CMS i stav přihlášení čtou cookies → stránka je dynamická. Explicitně,
// ať build neloguje „couldn't be rendered statically“ při pokusu o prerender.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const t = await getSiteContent();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <PricingPreview />

        <section id="ukazka" className="scroll-mt-20 px-5.5 pb-24 pt-4 md:px-8 md:pb-32">
          <div className="mx-auto max-w-[1100px]">
            <AnimateOnScroll>
              <SectionHead eyebrow={t('demo.eyebrow')} title={<RichText>{t('demo.title')}</RichText>} />
            </AnimateOnScroll>
            <AnimateOnScroll delay={120}>
              <div className="mt-12">
                <ProcessDemo />
              </div>
              <p className="mt-6 max-w-[70ch] text-[13px] leading-relaxed text-faint">{t('demo.note')}</p>
            </AnimateOnScroll>
          </div>
        </section>
      </main>
      <Footer />
      <ScrollTeaser title={t('teaser.title')} button={t('teaser.button')} />
    </>
  );
}
