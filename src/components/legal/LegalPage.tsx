import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

/**
 * Sdílená kostra právních stránek (/podminky, /ochrana-udaju, /zdroje-dat).
 * Editorialní typografie konzistentní s landing page.
 */
export default function LegalPage({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main id="main" className="px-[22px] py-14 md:px-8 md:py-20">
        <article className="mx-auto max-w-[760px]">
          <div className="flex items-center gap-4">
            <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              {eyebrow}
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-line-2" />
            <span className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-faint">
              {updated}
            </span>
          </div>

          <h1 className="cargent-h1 mt-7 text-[36px] md:text-[48px]">{title}</h1>

          <div aria-hidden="true" className="cargent-rule-double mt-8" />

          <div className="cargent-legal mt-8 text-[15px] leading-relaxed text-ink-soft">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

/** Číslovaná sekce právního textu. */
export function LegalSection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="cargent-h3 flex items-baseline gap-3 text-[21px] text-ink">
        <span className="cargent-mono text-[12px] text-brass" aria-hidden="true">{n}</span>
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
