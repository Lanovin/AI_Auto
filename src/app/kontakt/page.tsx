import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import KontaktForm from './KontaktForm';

export const metadata = { title: 'Kontakt' };

export default function KontaktPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-paper" id="main">
        <section className="px-5.5 py-14 md:px-8 md:py-20">
          <div className="mx-auto max-w-275">
            {/* ── Editorial header ─────────────────────────────────── */}
            <div className="flex items-center gap-4">
              <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
                Kontakt
              </span>
              <span aria-hidden="true" className="h-px flex-1 bg-line-2" />
              <span className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                Odpovídáme do 24 h
              </span>
            </div>

            <h1 className="cargent-h1 mt-7 max-w-[16ch] text-[36px] md:text-[52px]">
              Napište <i>nám</i>
            </h1>
            <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-soft md:text-[17px]">
              Máte otázku, zájem o spolupráci nebo technický problém? Ozveme se
              do 24 hodin v pracovní dny.
            </p>

            <div aria-hidden="true" className="cargent-rule-double mt-10" />

            {/* ── Form + info ──────────────────────────────────────── */}
            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-14">
              <KontaktForm />

              <aside className="space-y-3 lg:pt-1">
                {[
                  {
                    label: 'E-mail',
                    value: 'ahoj@cargent.cz',
                    note: 'Nejrychlejší způsob kontaktu',
                  },
                  {
                    label: 'Reakční doba',
                    value: 'Do 24 hodin',
                    note: 'V pracovní dny (Po–Pá)',
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-line bg-surface p-5"
                  >
                    <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">
                      {item.label}
                    </p>
                    <p className="mt-2 text-[15px] font-medium text-ink">{item.value}</p>
                    <p className="mt-1 text-[13px] text-dim">{item.note}</p>
                  </div>
                ))}

                <div className="rounded-lg border border-line bg-paper-2 p-5">
                  <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">
                    Autobazary
                  </p>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
                    Máte zájem o API integraci nebo hromadné používání pro váš
                    provoz? Zmiňte to ve zprávě a připravíme nabídku na míru.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
