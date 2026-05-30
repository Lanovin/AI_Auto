'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PageIntro from '../../components/PageIntro';
import LegacyToolFrame from '@/components/legacy-tool-frame';
import {
  clearAppSession,
  setAppRole
} from '@/lib/app-session';
import { createClient } from '@/lib/supabase/client';
import { useClientAuthState } from '@/lib/client-auth';

const personLinks = [
  { label: 'Odhad ceny', href: '/odhad-ceny' },
  { label: 'Skaut nabídek', href: '/skaut' }
];

const dealerLinks = [
  { label: 'Monitoring trhu', href: '/monitoring' },
  { label: 'Popisky', href: '/popisky' },
  { label: 'Skaut', href: '/skaut' }
];

const realAccountPlans = {
  person: {
    label: 'Soukromá osoba',
    badge: 'Osobní účet',
    registerHref: '/registrace',
    registerLabel: 'Registrovat osobní účet',
    description: 'Dashboard, historie ocenění a skaut nabídek v jednom přihlášení.',
    bullets: [
      'Přehled ocenění a kreditu v dashboardu',
      'Skaut nabídek navazující na ocenění',
      'Jeden účet pro všechny osobní workflow kroky',
    ],
  },
  dealer: {
    label: 'Autobazar',
    badge: 'Firemní účet',
    registerHref: '/registrace?type=dealer',
    registerLabel: 'Registrovat firemní účet',
    description: 'Monitoring, popisky, skaut a firemní profil v jedné B2B větvi.',
    bullets: [
      'Monitoring trhu a konkurenčních cen',
      'Popisky inzerátů nad stejnými daty auta',
      'Firemní profil a rozšířený přístup k modulům',
    ],
  },
};

const liveModules = [
  {
    label: 'Dashboard a historie',
    access: 'authenticated',
    description: 'Přehled kreditu, posledních ocenění a hlavních akcí v účtu.',
  },
  {
    label: 'Skaut nabídek',
    access: 'authenticated',
    description: 'Navazuje na přihlášení a pomáhá hledat výhodné nabídky.',
  },
  {
    label: 'Monitoring trhu',
    access: 'dealer',
    description: 'Firemní přístup ke sledování cen a konkurenčního watchlistu.',
  },
  {
    label: 'Popisky inzerátů',
    access: 'dealer',
    description: 'B2B generátor popisků navázaný na vaše data o vozech.',
  },
];

function getModuleState(access, role) {
  if (access === 'authenticated') {
    return role === 'guest'
      ? { label: 'Po přihlášení', className: 'bg-white text-brand-700 border border-brand-100' }
      : { label: 'Dostupné nyní', className: 'bg-brand-50 text-brand-700 border border-brand-100' };
  }

  return role === 'dealer'
    ? { label: 'Součást firemního účtu', className: 'bg-brand-100 text-brand-800 border border-brand-100' }
    : { label: 'Jen pro autobazary', className: 'bg-amber-50 text-amber-700 border border-amber-100' };
}

export default function ProfileHub({ preferredMode = 'person' }) {
  const { ready, role, isSupabaseAuthenticated, email, fullName, companyName } = useClientAuthState();
  const [guestPlan, setGuestPlan] = useState(preferredMode === 'dealer' ? 'dealer' : 'person');

  useEffect(() => {
    setGuestPlan(preferredMode === 'dealer' ? 'dealer' : 'person');
  }, [preferredMode]);

  const selectedGuestPlan = realAccountPlans[guestPlan];
  const activePlan = realAccountPlans[role === 'dealer' ? 'dealer' : 'person'];
  const isGuest = role === 'guest';
  const isDealer = role === 'dealer';
  const isDemoSession = !isSupabaseAuthenticated && !isGuest;
  const heroTone = isGuest ? (guestPlan === 'dealer' ? 'dealer' : 'people') : (isDealer ? 'dealer' : 'people');
  const accountName = isDealer
    ? companyName || 'Firemní účet AutoAI'
    : fullName || (email ? email.split('@')[0] : 'Účet AutoAI');
  const accountSummaryBadge = isGuest
    ? selectedGuestPlan.badge
    : isDemoSession
      ? 'Lokální demo'
      : isDealer
        ? 'Firemní účet'
        : 'Osobní účet';
  const accountSummaryTitle = isGuest
    ? `Vyberte vstup pro ${selectedGuestPlan.label.toLowerCase()}`
    : isDemoSession
      ? `Aktivní demo: ${isDealer ? 'autobazar' : 'souromý účet'}`
      : accountName;
  const accountSummaryText = isGuest
    ? 'Reálný účet a demo jsou teď oddělené. Registrace vytváří skutečný AutoAI účet, demo zůstává jen jako lokální ukázka v tomto prohlížeči.'
    : isDemoSession
      ? 'Demo režim je vhodný pro rychlou ukázku modulů, ale neukládá profil ani nepoužívá přihlášení přes e-mail.'
      : isDealer
        ? 'Firemní účet spojuje monitoring, popisky, skauta a firemní profil v jedné přihlášené větvi.'
        : 'Osobní účet drží historii ocenění, kredit a skauta pohromadě pod jedním přihlášením.';
  const accountSummaryItems = isGuest
    ? selectedGuestPlan.bullets
    : isDemoSession
      ? [
        'Data zůstávají pouze v tomto prohlížeči.',
        'Role přepínáte bez registrace a bez serverového účtu.',
        'Kdykoliv můžete přejít na reálný účet.',
      ]
      : isDealer
        ? [
          'Monitoring a popisky jsou navázané na stejný firemní účet.',
          companyName ? 'Firemní identita je v účtu vyplněná.' : 'Doplňte název autobazaru a účet bude působit kompletně.',
          'Firemní profil může dál navazovat na původní legacy workflow.',
        ]
        : [
          'Dashboard, historie ocenění a kredit běží pod jedním e-mailem.',
          fullName ? 'Osobní profil je v účtu doplněný.' : 'Doplňte jméno, aby účet působil osobněji.',
          'Skaut nabídek je připravený jako navazující krok po ocenění.',
        ];
  const stats = isGuest
    ? [
      { value: guestPlan === 'dealer' ? 'B2B' : 'Retail', label: 'Doporučená větev' },
      { value: '2', label: 'Typy účtu' },
      { value: 'Demo + live', label: 'Možnosti vstupu' },
    ]
    : [
      { value: isDemoSession ? 'Demo' : 'Live', label: 'Režim' },
      { value: isDealer ? 'Autobazar' : 'Osobní', label: 'Typ účtu' },
      { value: isSupabaseAuthenticated ? 'E-mail' : 'Browser', label: 'Identita' },
    ];

  const progressItems = isDemoSession
    ? [
      {
        title: 'Demo spuštěno',
        done: true,
        detail: 'Relace běží lokálně a můžete hned zkoušet dostupné moduly.',
      },
      {
        title: 'Data v prohlížeči',
        done: true,
        detail: 'Nic se neváže k e-mailu ani ke skutečnému účtu.',
      },
      {
        title: 'Převod do účtu',
        done: false,
        detail: 'Pro trvalý profil a dashboard si založte reálný účet.',
      },
    ]
    : [
      {
        title: 'Účet vytvořen',
        done: true,
        detail: 'Přihlášení přes e-mail je aktivní a připravené pro další kroky.',
      },
      {
        title: isDealer ? 'Firemní identita' : 'Profil doplněn',
        done: isDealer ? Boolean(companyName) : Boolean(fullName),
        detail: isDealer
          ? 'Doplňte název autobazaru a účet bude působit kompletně.'
          : 'Doplňte jméno, aby bylo jasné, komu účet patří.',
      },
      {
        title: 'Nástroje aktivní',
        done: true,
        detail: isDealer
          ? 'Monitoring, popisky i skaut jsou připravené uvnitř účtu.'
          : 'Dashboard a skaut už jsou připravené k použití.',
      },
    ];

  const introTitle = isGuest
    ? guestPlan === 'dealer'
      ? 'Firemní účet nebo demo pro autobazary'
      : 'Účet AutoAI pro soukromé použití i další kroky'
    : isDemoSession
      ? isDealer
        ? 'Lokální demo autobazaru'
        : 'Lokální demo soukromého účtu'
      : isDealer
        ? 'Firemní profil autobazaru'
        : 'Účet AutoAI';

  const introDescription = isGuest
    ? guestPlan === 'dealer'
      ? 'Založte si firemní účet pro monitoring, popisky a firemní profil. Pokud chcete jen rychlou ukázku, spusťte lokální demo bez registrace.'
      : 'Osobní účet drží dashboard, historii ocenění a skauta v jedné větvi. Demo zůstává oddělené jako lokální ukázka bez registrace.'
    : isDemoSession
      ? 'Tahle relace je ukázková a běží jen v tomto prohlížeči. Skutečný účet si vytvoříte registrací a dostanete vlastní dashboard.'
      : isDealer
        ? 'Jste přihlášeni do firemního účtu. Odtud se dostanete do dashboardu, firemních modulů i do původního firemního profilu.'
        : 'Jste přihlášeni do osobního účtu. Odtud otevřete dashboard, navazující skaut i správu přístupů.';

  async function handleLogout() {
    clearAppSession();

    if (isSupabaseAuthenticated) {
      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign('/prihlaseni');
      return;
    }

    window.location.assign('/profil');
  }

  if (!ready) {
    return (
      <section className="section">
        <div className="container">
          <article className="notice-card">
            <strong>Načítám stav účtu</strong>
            <p>Ověřuji přihlášení, typ účtu a dostupné moduly pro tuto relaci.</p>
          </article>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageIntro
        actionsSlot={
          <div className="hero-actions">
            {isGuest ? (
              <>
                <Link className="hero-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={selectedGuestPlan.registerHref}>
                  {selectedGuestPlan.registerLabel}
                </Link>
                <Link className="hero-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href="/prihlaseni">
                  Přihlásit se
                </Link>
              </>
            ) : (
              <>
                <Link className="hero-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href="/dashboard">
                  Otevřít účet
                </Link>
                <Link className="hero-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={isDealer ? '/monitoring' : '/skaut'}>
                  {isDealer ? 'Otevřít monitoring' : 'Otevřít skauta'}
                </Link>
                <button className="hero-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" onClick={() => void handleLogout()} type="button">
                  Odhlásit se
                </button>
              </>
            )}
          </div>
        }
        description={introDescription}
        eyebrow={isGuest ? 'Účet a přístupy' : isDemoSession ? 'Lokální demo' : 'Přihlášený účet'}
        stats={stats}
        summaryBadge={accountSummaryBadge}
        summaryItems={accountSummaryItems}
        summaryText={accountSummaryText}
        summaryTitle={accountSummaryTitle}
        title={introTitle}
        tone={heroTone}
      />

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          {isGuest ? (
            <>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <article className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.08)]">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Reálný účet AutoAI</p>
                      <h2 className="mt-2 text-[26px] font-medium tracking-tight text-brand-900">Vyberte si, jaký účet chcete založit</h2>
                    </div>
                    <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium text-brand-700">
                      Live účet
                    </span>
                  </div>

                  <div aria-label="Výběr typu účtu" className="mt-5 grid gap-3 md:grid-cols-2" role="group">
                    {Object.entries(realAccountPlans).map(([planKey, plan]) => {
                      const isSelected = guestPlan === planKey;

                      return (
                        <button
                          key={planKey}
                          aria-pressed={isSelected}
                          className={`rounded-3xl border p-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${
                            isSelected
                              ? 'border-brand-300 bg-brand-50 shadow-[0_12px_24px_rgba(24,95,165,0.08)]'
                              : 'border-brand-100 bg-white hover:border-brand-200 hover:bg-brand-50/40'
                          }`}
                          onClick={() => setGuestPlan(planKey)}
                          type="button"
                        >
                          <span className="inline-flex rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-medium text-brand-700">
                            {plan.badge}
                          </span>
                          <h3 className="mt-3 text-[20px] font-medium text-brand-900">{plan.label}</h3>
                          <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{plan.description}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-3xl border border-brand-100 bg-brand-50/50 p-5">
                    <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Doporučený výsledek</p>
                    <h3 className="mt-2 text-[22px] font-medium text-brand-900">{selectedGuestPlan.label}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">{selectedGuestPlan.description}</p>
                    <ul className="mt-4 flex flex-col gap-2 text-[14px] text-neutral-600">
                      {selectedGuestPlan.bullets.map((item) => (
                        <li key={item} className="rounded-2xl border border-brand-100 bg-white px-4 py-3">
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link className="rounded-full bg-brand-600 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={selectedGuestPlan.registerHref}>
                        {selectedGuestPlan.registerLabel}
                      </Link>
                      <Link className="rounded-full border border-brand-100 px-5 py-3 text-[14px] font-medium text-neutral-600 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href="/prihlaseni">
                        Už účet mám
                      </Link>
                    </div>
                  </div>
                </article>

                <article className="rounded-[28px] border border-brand-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#F5F9FF_100%)] p-6 shadow-[0_18px_40px_rgba(24,95,165,0.08)]">
                  <span className="inline-flex rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-medium text-brand-700">
                    Ukázka bez registrace
                  </span>
                  <h2 className="mt-4 text-[24px] font-medium tracking-tight text-brand-900">Chci si to nejdřív osahat</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">
                    Demo režim zůstává k dispozici, ale je teď jasně oddělený od reálného účtu. Hodí se pro rychlou ukázku bez e-mailu a bez serverového profilu.
                  </p>
                  <div className="mt-5 grid gap-3">
                    <button className="rounded-full bg-brand-600 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" onClick={() => setAppRole('person')} type="button">
                      Spustit demo pro člověka
                    </button>
                    <button className="rounded-full border border-brand-100 px-5 py-3 text-[14px] font-medium text-brand-700 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" onClick={() => setAppRole('dealer')} type="button">
                      Spustit demo autobazaru
                    </button>
                  </div>
                  <div className="mt-5 rounded-3xl border border-brand-100 bg-white p-4">
                    <p className="text-[13px] leading-relaxed text-neutral-500">
                      Demo data zůstávají pouze v tomto prohlížeči. Pokud chcete dashboard, historii a trvalý účet, založte si reálný AutoAI účet.
                    </p>
                  </div>
                </article>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {Object.entries(realAccountPlans).map(([planKey, plan]) => (
                  <article key={planKey} className={`rounded-[28px] border p-5 ${guestPlan === planKey ? 'border-brand-200 bg-brand-50/60' : 'border-brand-100 bg-white'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">{plan.badge}</p>
                        <h3 className="mt-2 text-[22px] font-medium text-brand-900">{plan.label}</h3>
                      </div>
                      <span className="rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-medium text-neutral-600">
                        {planKey === 'dealer' ? 'B2B' : 'Retail'}
                      </span>
                    </div>
                    <p className="mt-3 text-[15px] leading-relaxed text-neutral-500">{plan.description}</p>
                    <ul className="mt-4 flex flex-col gap-2 text-[14px] text-neutral-600">
                      {plan.bullets.map((item) => (
                        <li key={item} className="rounded-2xl border border-brand-100 bg-white px-4 py-3">
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link className="rounded-full bg-brand-600 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={plan.registerHref}>
                        {plan.registerLabel}
                      </Link>
                      <Link className="rounded-full border border-brand-100 px-5 py-3 text-[14px] font-medium text-neutral-600 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href="/prihlaseni">
                        Přihlásit se
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <article className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.08)]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Přehled účtu</p>
                      <h2 className="mt-2 text-[26px] font-medium tracking-tight text-brand-900">
                        {isDemoSession ? 'Relace běží v demo režimu' : 'Účet a přístupová vrstva'}
                      </h2>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                      isDemoSession ? 'border border-amber-100 bg-amber-50 text-amber-700' : 'border border-brand-100 bg-brand-50 text-brand-700'
                    }`}>
                      {isDemoSession ? 'Demo' : 'Přihlášeno'}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    <article className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Typ účtu</p>
                      <strong className="mt-2 block text-[18px] font-medium text-brand-900">
                        {isDealer ? 'Autobazar' : 'Soukromá osoba'}
                      </strong>
                      <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
                        {isDemoSession ? 'Lokálně simulovaný přístup bez skutečného účtu.' : 'Skutečný AutoAI účet s přihlášením přes e-mail a heslo.'}
                      </p>
                    </article>

                    <article className="rounded-2xl border border-brand-100 bg-white p-4">
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Primární identita</p>
                      <strong className="mt-2 block text-[18px] font-medium text-brand-900">
                        {accountName}
                      </strong>
                      <p className="mt-2 wrap-break-word text-[14px] leading-relaxed text-neutral-500">
                        {email ?? 'Demo relace bez e-mailové identity'}
                      </p>
                    </article>

                    <article className="rounded-2xl border border-brand-100 bg-white p-4">
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Další doporučený krok</p>
                      <strong className="mt-2 block text-[18px] font-medium text-brand-900">
                        {isDealer ? 'Monitoring a firemní profil' : 'Dashboard a skaut nabídek'}
                      </strong>
                      <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
                        {isDemoSession
                          ? 'Vyzkoušejte si moduly, nebo převeďte relaci do reálného účtu.'
                          : 'Účet teď vede přímo do dashboardu a navazujících modulů bez míchání demo režimu.'}
                      </p>
                    </article>

                    <article className="rounded-2xl border border-brand-100 bg-white p-4">
                      <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Stav profilu</p>
                      <strong className="mt-2 block text-[18px] font-medium text-brand-900">
                        {isDealer ? (companyName ? 'Firemní identita vyplněná' : 'Chybí název autobazaru') : (fullName ? 'Osobní profil doplněný' : 'Doplňte jméno v účtu')}
                      </strong>
                      <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
                        {isDealer
                          ? 'Firemní údaje pomáhají odlišit reálný B2B účet od lokální ukázky.'
                          : 'Osobní údaje pomáhají, aby účet nepůsobil jako anonymní technická schránka.'}
                      </p>
                    </article>
                  </div>

                  <section aria-labelledby="profile-progress-heading" className="mt-5">
                    <h2 className="sr-only" id="profile-progress-heading">Postup nastavení účtu</h2>
                    <div className="grid gap-3 md:grid-cols-3">
                      {progressItems.map((item) => (
                        <article key={item.title} className="rounded-2xl border border-brand-100 bg-white p-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-medium ${
                            item.done ? 'bg-brand-50 text-brand-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.done ? 'Hotovo' : 'Další krok'}
                          </span>
                          <strong className="mt-3 block text-[16px] font-medium text-brand-900">{item.title}</strong>
                          <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{item.detail}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </article>

                <article className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.08)]">
                  <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Dostupné moduly</p>
                  <h2 className="mt-2 text-[24px] font-medium tracking-tight text-brand-900">Co je teď skutečně odemčené</h2>
                  <div className="mt-4 space-y-3">
                    {liveModules.map((module) => {
                      const moduleState = getModuleState(module.access, role);

                      return (
                        <article key={module.label} className="rounded-2xl border border-brand-100 bg-brand-50/35 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <strong className="text-[15px] font-medium text-brand-900">{module.label}</strong>
                              <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">{module.description}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${moduleState.className}`}>
                              {moduleState.label}
                            </span>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link className="rounded-full bg-brand-600 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={isDemoSession ? activePlan.registerHref : '/dashboard'}>
                      {isDemoSession ? 'Vytvořit reálný účet' : 'Otevřít dashboard'}
                    </Link>
                    <Link className="rounded-full border border-brand-100 px-5 py-3 text-[14px] font-medium text-neutral-600 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={isDealer ? '/monitoring' : '/skaut'}>
                      {isDealer ? 'Monitoring trhu' : 'Skaut nabídek'}
                    </Link>
                  </div>
                </article>
              </div>

              {isDemoSession ? (
                <article className="mt-4 rounded-[28px] border border-brand-100 bg-[linear-gradient(180deg,#FFFFFF_0%,#F5F9FF_100%)] p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)]">
                  <span className="inline-flex rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-medium text-brand-700">
                    Převod z demo režimu
                  </span>
                  <h2 className="mt-4 text-[24px] font-medium tracking-tight text-brand-900">Chcete z toho udělat skutečný účet?</h2>
                  <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-neutral-500">
                    Demo zůstává dobré na rychlou ukázku, ale dashboard, historie a serverový profil získáte až po registraci. Typ účtu zůstane stejný, jen se přesune do reálného AutoAI účtu.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link className="rounded-full bg-brand-600 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={activePlan.registerHref}>
                      {activePlan.registerLabel}
                    </Link>
                    <Link className="rounded-full border border-brand-100 px-5 py-3 text-[14px] font-medium text-neutral-600 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href="/prihlaseni">
                      Už reálný účet mám
                    </Link>
                  </div>
                </article>
              ) : null}

              {isDealer ? (
                <div style={{ marginTop: 22 }}>
                  <div className="section-header">
                    <h2 className="section-title" style={{ fontFamily: 'var(--font-heading)' }}>
                      Firemní profil autobazaru
                    </h2>
                    <p className="section-text">
                      Původní firemní profil zůstává k dispozici, ale teď je jasně zasazený do stejné účetové větve jako dashboard a firemní moduly.
                    </p>
                  </div>
                  <LegacyToolFrame src="/legacy/profil" title="Profil autobazaru" />
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}