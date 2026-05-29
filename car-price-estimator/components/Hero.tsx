import CTAButton from './CTAButton';

const workflowPills = [
  { label: 'Retail', initials: 'R', background: 'bg-brand-50 text-brand-800' },
  { label: 'B2B', initials: 'B', background: 'bg-brand-100 text-brand-800' },
  { label: 'Garáž', initials: 'G', background: 'bg-brand-200 text-brand-900' }
];

const moduleCards = [
  {
    title: 'Odhad ceny',
    meta: 'Pro lidi i bazary',
    description: 'Vyhodnocení trhu nad jedním formulářem a jedním API klíčem.'
  },
  {
    title: 'Popisky',
    meta: 'Navazuje na ocenění',
    description: 'Přebírá data auta bez ručního přepisování do inzerátového textu.'
  },
  {
    title: 'Monitoring',
    meta: 'B2B modul',
    description: 'Uložené vozy jdou jedním klikem hlídat proti trhu a konkurenci.'
  },
  {
    title: 'Skaut + profil',
    meta: 'B2B workflow',
    description: 'Firemní režim drží scouting, importy a práci s garáží pohromadě.'
  }
];

type HeroProps = {
  tagline: string;
  subtitle: string;
  primaryCta: string;
  secondaryCta: string;
};

export default function Hero({ tagline, subtitle, primaryCta, secondaryCta }: HeroProps) {
  return (
    <section className="bg-[linear-gradient(180deg,#F4F8FD_0%,#FFFFFF_100%)] py-16 md:py-24" id="produkt">
      <div className="mx-auto grid max-w-300 gap-10 px-6 md:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] md:items-center md:gap-12 md:px-12">
        <div>
          <span className="inline-flex rounded-full bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-brand-800">
            AutoAI · Původní workflow v novém UI
          </span>
          <h1 className="mt-6 max-w-[12ch] text-[48px] font-medium leading-[1.1] tracking-[-0.02em] text-brand-900 md:text-[60px]">
            {tagline}
          </h1>
          <p className="mt-6 max-w-[90%] text-[16px] leading-[1.6] text-neutral-500">{subtitle}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <CTAButton ariaLabel="Přejít na ocenění auta" href="/odhad-ceny">
              {primaryCta}
            </CTAButton>
            <CTAButton ariaLabel="Přejít na dealer přihlášení" href="/profil?mode=dealer" variant="secondary">
              {secondaryCta}
            </CTAButton>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ul aria-label="Základní workflow AutoAI" className="flex -space-x-3">
              {workflowPills.map((avatar) => (
                <li
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-[13px] font-medium ${avatar.background}`}
                  key={avatar.label}
                >
                  <span aria-hidden="true">{avatar.initials}</span>
                  <span className="sr-only">{avatar.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-[15px] text-neutral-500">
              <span className="font-medium text-brand-900">1 auto zadáte jednou</span> a data pak tečou do dalších modulů
            </p>
          </div>
        </div>

        <aside
          aria-label="Přehled modulů AutoAI"
          className="rounded-xl border border-brand-100 bg-white p-6 shadow-card"
        >
          <div className="flex items-center justify-between gap-4 border-b border-brand-100/60 pb-4">
            <div>
              <p className="text-[15px] font-medium text-brand-900">Co je uvnitř</p>
              <p className="mt-1 text-[14px] text-neutral-500">Retail i bazarové workflow nad stejnými daty auta</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-brand-600">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-brand-600" />
              Opus 4.6
            </span>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-[44px] font-medium leading-none tracking-[-0.02em] text-brand-900 md:text-[52px]">5 modulů</p>
              <p className="mt-3 text-[15px] font-medium text-brand-600">1 sdílená garáž, 1 API klíč, 2 vstupní větve</p>
            </div>
            <div className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-medium text-brand-800">Retail + B2B</div>
          </div>

          <div className="mt-8 grid gap-3">
            {moduleCards.map((module) => (
              <div className="rounded-xl border border-brand-100/70 bg-brand-50/40 p-4" key={module.title}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-medium text-brand-900">{module.title}</p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-brand-600">
                    {module.meta}
                  </span>
                </div>
                <p className="mt-2 text-[14px] leading-[1.6] text-neutral-500">{module.description}</p>
              </div>
            ))}

            <div className="rounded-xl bg-brand-900 px-4 py-4 text-white">
              <p className="text-[14px] font-medium">Navazující tok dat</p>
              <p className="mt-2 text-[14px] leading-[1.6] text-brand-100">
                Odhad ceny může uložit auto do garáže i monitoringu. Popisky z těch samých údajů rovnou generují inzerát bez druhého formuláře.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}