/**
 * HowItWorks — tři kroky jako čistý text na bílé ploše: velké číslo,
 * nadpis, odstavec. Žádné karty ani pruhy; dělí je jen vlasové linky.
 */
import AnimateOnScroll from '@/components/animate-on-scroll';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

export default async function HowItWorks() {
  const t = await getSiteContent();
  const steps = [
    { n: '01', title: t('how.step.0.title'), body: t('how.step.0.body') },
    { n: '02', title: t('how.step.1.title'), body: t('how.step.1.body') },
    { n: '03', title: t('how.step.2.title'), body: t('how.step.2.body') },
  ];

  return (
    <section id="how" className="scroll-mt-20 px-5.5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1100px]">
        <AnimateOnScroll>
          <SectionHead eyebrow={t('how.eyebrow')} title={<RichText>{t('how.title')}</RichText>} />
        </AnimateOnScroll>

        <div className="mt-12 grid gap-0 border-t border-line md:grid-cols-3 md:gap-10">
          {steps.map((step, i) => (
            <AnimateOnScroll key={step.n} delay={i * 110}>
              <article className="border-b border-line py-7 md:border-b-0 md:pt-8">
                <span className="cargent-ghost-num block text-[52px] leading-none md:text-[64px]" aria-hidden="true">
                  {step.n}
                </span>
                <h3 className="mt-4 text-[20px] font-bold tracking-tight text-ink md:text-[22px]">
                  <span className="sr-only">Krok {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2.5 max-w-[40ch] text-[15px] leading-relaxed text-ink-soft">
                  <RichText>{step.body}</RichText>
                </p>
              </article>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section header (sdílený napříč sekcemi) ─────────────────────────────
export function SectionHead({
  eyebrow,
  title,
  align = 'left',
  lead,
}: {
  eyebrow: string;
  title: React.ReactNode;
  align?: 'left' | 'center';
  lead?: React.ReactNode;
}) {
  const cleanEyebrow = eyebrow.replace(/^[—–-]\s*/, '');

  return (
    <header className={['flex flex-col gap-4', align === 'center' ? 'items-center text-center' : ''].join(' ')}>
      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">{cleanEyebrow}</span>
      <h2 className={['cargent-h2 text-[30px] md:text-[42px]', align === 'center' ? 'max-w-[22ch]' : 'max-w-[20ch]'].join(' ')}>
        {title}
      </h2>
      {lead ? <p className="max-w-[58ch] text-[16px] leading-relaxed text-ink-soft md:text-[17px]">{lead}</p> : null}
    </header>
  );
}
