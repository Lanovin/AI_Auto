import AccessGate from '@/components/access-gate';
import LegacyToolFrame from '@/components/legacy-tool-frame';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

/**
 * Obal pro legacy nástroje (popisky, monitoring, skaut) — nadpis + iframe.
 * Přístup hlídá AccessGate podle typu účtu.
 */
export default function ToolShell({ description, iframeSrc, title, accessLevel = 'public' }) {
  const frame = <LegacyToolFrame src={iframeSrc} title={title} />;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper" id="main">
        <section className="px-5.5 pt-12 pb-6 md:px-8 md:pt-16">
          <div className="mx-auto max-w-275">
            <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-brass">
              {accessLevel === 'dealer' ? 'Nástroj pro autobazary' : accessLevel === 'authenticated' ? 'Po přihlášení' : 'Nástroj'}
            </span>
            <h1 className="cargent-h1 mt-4 text-[34px] md:text-[44px]">{title}</h1>
            <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink-soft">{description}</p>
          </div>
        </section>

        <section className="px-5.5 pb-20 md:px-8">
          <div className="mx-auto max-w-275">
            {accessLevel === 'public' ? frame : <AccessGate requiredRole={accessLevel}>{frame}</AccessGate>}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
