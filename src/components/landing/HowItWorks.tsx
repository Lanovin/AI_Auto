/**
 * HowItWorks — tři kroky jako čisté bílé karty na světlém pásu
 * (look brego.io): modrý číselný badge, tučný nadpis, krátký text.
 * Texty zůstávají napojené na admin CMS.
 */
import AnimateOnScroll from '@/components/animate-on-scroll';
import { getSiteContent } from '@/lib/content/server';
import { RichText } from '@/components/rich-text';

export default async function HowItWorks() {
  const t = await getSiteContent();
  const steps = [
    { n: '1', title: t('how.step.0.title'), body: t('how.step.0.body') },
    { n: '2', title: t('how.step.1.title'), body: t('how.step.1.body') },
    { n: '3', title: t('how.step.2.title'), body: t('how.step.2.body') },
  ];

  return (
    <section
      id="how"
      className="border-y border-line bg-paper-2/70 px-[22px] py-20 md:px-8 md:py-28"
    >
      <div className="mx-auto max-w-[1240px]">
        <AnimateOnScroll>
          <SectionHead
            eyebrow={t('how.eyebrow')}
            title={<RichText>{t('how.title')}</RichText>}
            align="center"
          />
        </AnimateOnScroll>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((step, i) => (
            <AnimateOnScroll key={step.n} delay={i * 130}>
              <article
                className="group relative h-full rounded-[16px] border border-line bg-surface p-8 transition-[border-color] duration-300 hover:border-brass/40"
                style={{ boxShadow: 'var(--shadow-cargent-card)' }}
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brass text-[15px] font-bold text-white"
                  aria-hidden="true"
                >
                  {step.n}
                </span>

                <h3 className="mt-5 text-[20px] font-bold tracking-tight text-ink md:text-[22px]">
                  {step.title}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-dim">
                  <RichText>{step.body}</RichText>
                </p>

                {/* Modrá linka — roste na hover */}
                <span
                  aria-hidden="true"
                  className="mt-6 block h-[2px] w-10 rounded-full bg-brass/40 transition-[width] duration-500 group-hover:w-20"
                />
              </article>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section header (used by Features, Engine, HowItWorks) ──────────────
export function SectionHead({
  eyebrow,
  title,
  align = 'left',
}: {
  eyebrow: string;
  title: React.ReactNode;
  align?: 'left' | 'center';
}) {
  const cleanEyebrow = eyebrow.replace(/^[—–-]\s*/, '');

  return (
    <header
      className={[
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : '',
      ].join(' ')}
    >
      <span className="text-[12px] font-semibold uppercase tracking-[0.16em] text-brass">
        {cleanEyebrow}
      </span>
      <h2
        className={[
          'cargent-h2 text-[32px] md:text-[42px]',
          align === 'center' ? 'max-w-[24ch]' : 'max-w-[20ch]',
        ].join(' ')}
      >
        {title}
      </h2>
    </header>
  );
}
