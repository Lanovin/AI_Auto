import Header from '@/components/landing/Header';
import KontaktForm from './KontaktForm';

export const metadata = { title: 'Kontakt' };

export default function KontaktPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-paper" id="main">
        {/* Hero */}
        <section className="bg-[linear-gradient(180deg,#F4F8FD_0%,#FFFFFF_60%)] px-5.5 pb-12 pt-16 md:px-8">
          <div className="mx-auto max-w-310">
            <span className="inline-flex rounded-full border border-brass/20 bg-brass/10 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-widest text-brass">
              Kontakt
            </span>
            <h1 className="mt-4 text-[38px] font-bold leading-[1.1] tracking-tight text-ink md:text-[48px]">
              Napište nám
            </h1>
            <p className="mt-4 max-w-[50ch] text-[16px] leading-relaxed text-ink/60">
              Máte otázku, zájem o spolupráci nebo technický problém?
              Odpovídáme do 24 hodin v pracovní dny.
            </p>
          </div>
        </section>

        {/* Obsah */}
        <section className="px-5.5 pb-20 md:px-8">
          <div className="mx-auto max-w-310">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">

              {/* Formulář */}
              <KontaktForm />

              {/* Info panel */}
              <aside className="space-y-4 lg:pt-2">
                <div className="rounded-2xl border border-line bg-white p-6">
                  <p className="text-[12px] font-semibold uppercase tracking-widest text-brass">E-mail</p>
                  <p className="mt-2 text-[15px] font-medium text-ink">ahoj@cargent.cz</p>
                  <p className="mt-1 text-[13px] text-ink/50">Nejrychlejší způsob kontaktu</p>
                </div>

                <div className="rounded-2xl border border-line bg-white p-6">
                  <p className="text-[12px] font-semibold uppercase tracking-widest text-brass">Reakční doba</p>
                  <p className="mt-2 text-[15px] font-medium text-ink">Do 24 hodin</p>
                  <p className="mt-1 text-[13px] text-ink/50">V pracovní dny (Po–Pá)</p>
                </div>

                <div className="rounded-2xl border border-line bg-white p-6">
                  <p className="text-[12px] font-semibold uppercase tracking-widest text-brass">Autobazary</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink/70">
                    Máte zájem o API integraci nebo hromadné používání pro váš provoz?
                    Zmiňte to ve zprávě a připravíme nabídku na míru.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
