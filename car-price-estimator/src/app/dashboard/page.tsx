import Link from 'next/link';
import { redirect } from 'next/navigation';
import Navbar from '../../../components/Navbar';
import { createClient } from '@/lib/supabase/server';
import { getScanHistory } from '@/lib/supabase/user-data';

export const metadata = { title: 'Můj účet' };

type AccountType = 'person' | 'dealer';
type ToolAccess = 'public' | 'authenticated' | 'dealer';

const TOOLS: Array<{
  label: string;
  href: string;
  badge: string;
  access: ToolAccess;
  description: string;
}> = [
  {
    label: 'Odhad ceny',
    href: '/odhad-ceny',
    badge: 'Zdarma',
    access: 'public',
    description: 'Veřejný vstup do ocenění a navazujících dat o voze.',
  },
  {
    label: 'Skaut nabídek',
    href: '/skaut',
    badge: 'Po přihlášení',
    access: 'authenticated',
    description: 'Filtrace podhodnocených nabídek jako další krok po ocenění.',
  },
  {
    label: 'Monitoring trhu',
    href: '/monitoring',
    badge: 'Autobazary',
    access: 'dealer',
    description: 'Sledování trhu a watchlist konkurence pro firemní workflow.',
  },
  {
    label: 'Popisky',
    href: '/popisky',
    badge: 'Autobazary',
    access: 'dealer',
    description: 'Firemní generátor popisků navázaný na stejné údaje o autě.',
  },
];

const TIER_LABELS: Record<string, string> = {
  quick: 'Rychlý',
  standard: 'Standardní',
  detailed: 'Detailní',
  expert: 'Expertní',
};

function getToolStatus(access: ToolAccess, accountType: AccountType) {
  if (access === 'public') {
    return {
      label: 'Dostupné nyní',
      className: 'border border-emerald-100 bg-emerald-50 text-emerald-700',
    };
  }

  if (access === 'authenticated') {
    return {
      label: 'Součást účtu',
      className: 'border border-brand-100 bg-brand-50 text-brand-700',
    };
  }

  return accountType === 'dealer'
    ? {
      label: 'Součást firemního účtu',
      className: 'border border-brand-100 bg-brand-100 text-brand-800',
    }
    : {
      label: 'Jen pro autobazary',
      className: 'border border-amber-100 bg-amber-50 text-amber-700',
    };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/prihlaseni?next=/dashboard');

  const [profileResult, history] = await Promise.all([
    supabase.from('profiles').select('tokens_balance, full_name, company_name').eq('id', user.id).maybeSingle(),
    getScanHistory(5),
  ]);

  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const accountType: AccountType = userMetadata.account_type === 'dealer' ? 'dealer' : 'person';
  const metadataFullName = typeof userMetadata.full_name === 'string' ? userMetadata.full_name : '';
  const metadataCompanyName = typeof userMetadata.company_name === 'string' ? userMetadata.company_name : '';
  const profileData = profileResult.data as { tokens_balance?: number; full_name?: string; company_name?: string } | null;
  const balance = profileData?.tokens_balance ?? 0;
  const fullName = profileData?.full_name ?? metadataFullName;
  const companyName = profileData?.company_name ?? metadataCompanyName;
  const profileIdentity = accountType === 'dealer' ? companyName : fullName;
  const pageTitle = accountType === 'dealer'
    ? companyName || 'Firemní účet AutoAI'
    : fullName
      ? `Ahoj, ${fullName.split(' ')[0]}`
      : 'Můj účet AutoAI';
  const identityReady = accountType === 'dealer' ? Boolean(companyName) : Boolean(fullName);
  const profileHref = accountType === 'dealer' ? '/profil?mode=dealer' : '/profil';
  const nextAction = accountType === 'dealer'
    ? {
      href: identityReady ? '/monitoring' : profileHref,
      label: identityReady ? 'Otevřít monitoring' : 'Dokončit firemní profil',
      detail: identityReady
        ? 'Firemní workflow je připravené a navazuje na stejné přihlášení.'
        : 'Doplňte název autobazaru a firemní identitu v profilu.',
    }
    : {
      href: history.length > 0 ? '/skaut' : '/odhad-ceny',
      label: history.length > 0 ? 'Otevřít skauta' : 'Spustit první odhad',
      detail: history.length > 0
        ? 'Skaut navazuje na přihlášený účet a historii ocenění.'
        : 'Začněte oceněním a účet se začne plnit reálnými daty.',
    };

  const progressItems = [
    {
      title: 'Účet vytvořen',
      done: true,
      detail: 'E-mailové přihlášení je aktivní a připravené pro další práci.',
    },
    {
      title: accountType === 'dealer' ? 'Firemní identita' : 'Profil doplněn',
      done: identityReady,
      detail: accountType === 'dealer'
        ? 'Doplňte název autobazaru, aby účet působil kompletně.'
        : 'Doplňte jméno, aby účet nepůsobil anonymně.',
    },
    {
      title: 'Nástroje aktivní',
      done: history.length > 0 || accountType === 'dealer',
      detail: history.length > 0
        ? 'V historii už jsou první ocenění a účet začíná žít.'
        : accountType === 'dealer'
          ? 'Firemní moduly jsou připravené i bez historie ocenění.'
          : 'Spusťte první ocenění a dashboard získá obsah.',
    },
  ];

  return (
    <>
      <Navbar brandName="AutoAI" />

      <main className="min-h-screen bg-[linear-gradient(180deg,#F4F8FD_0%,#FFFFFF_38%,#FFFFFF_100%)]" id="main">
        <div className="mx-auto max-w-6xl px-6 py-10 md:px-10 md:py-12">
          <section className="rounded-4xl border border-brand-100 bg-white/95 p-6 shadow-[0_24px_60px_rgba(24,95,165,0.08)] md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Link href="/" className="text-[13px] text-neutral-500 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">
                  ← AutoAI
                </Link>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                    accountType === 'dealer' ? 'border border-brand-100 bg-brand-100 text-brand-800' : 'border border-brand-100 bg-brand-50 text-brand-700'
                  }`}>
                    {accountType === 'dealer' ? 'Autobazar' : 'Soukromá osoba'}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                    identityReady ? 'border border-emerald-100 bg-emerald-50 text-emerald-700' : 'border border-amber-100 bg-amber-50 text-amber-700'
                  }`}>
                    {identityReady ? 'Profil připraven' : 'Chybí údaje'}
                  </span>
                </div>
                <h1 className="mt-4 text-[30px] font-medium tracking-tight text-brand-900 md:text-[38px]">
                  {pageTitle}
                </h1>
                <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-neutral-500">
                  {accountType === 'dealer'
                    ? 'Firemní účet spojuje monitoring, popisky, skauta a účetovou administraci do jedné přihlášené větve.'
                    : 'Osobní účet drží historii ocenění, kredit a rychlý přechod do navazujících modulů bez míchání s demo režimem.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-left sm:text-right">
                  <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Přihlášený e-mail</p>
                  <p className="mt-1 wrap-break-word text-[14px] font-medium text-brand-900">{user.email}</p>
                </div>
                <form action="/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-full border border-brand-100 px-5 py-2.5 text-[13px] font-medium text-neutral-600 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                  >
                    Odhlásit se
                  </button>
                </form>
              </div>
            </div>

            <section aria-labelledby="dashboard-progress-heading" className="mt-8">
              <h2 className="sr-only" id="dashboard-progress-heading">Postup nastavení účtu</h2>
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
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Poslední ocenění</p>
                  <h2 className="mt-2 text-[24px] font-medium tracking-tight text-brand-900">Co se v účtu dělo naposledy</h2>
                </div>
                <Link className="text-[14px] font-medium text-brand-600 transition-colors hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={profileHref}>
                  Profil a přístupy
                </Link>
              </div>

              {history.length === 0 ? (
                <div className="mt-5 rounded-3xl border border-dashed border-brand-100 bg-brand-50/40 p-5">
                  <p className="text-[15px] leading-relaxed text-neutral-500">
                    Zatím tu není žádné ocenění. Začněte na{' '}
                    <Link href="/odhad-ceny" className="font-medium text-brand-600 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2">
                      odhadu ceny
                    </Link>
                    {' '}a účet začne dávat smysl i v historii.
                  </p>
                </div>
              ) : (
                <ul className="mt-5 flex flex-col gap-3">
                  {history.map((scan) => {
                    const car = scan.car_data as {
                      brand?: string;
                      model?: string;
                      year?: number;
                      mileage?: number;
                    };
                    const price = scan.average_price
                      ? `${Number(scan.average_price).toLocaleString('cs-CZ')} Kč`
                      : '—';
                    const km = car.mileage
                      ? `${Number(car.mileage).toLocaleString('cs-CZ')} km`
                      : null;
                    const date = new Date(scan.created_at).toLocaleDateString('cs-CZ', {
                      day: 'numeric',
                      month: 'short',
                    });

                    return (
                      <li
                        key={scan.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-brand-100 px-4 py-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-medium text-brand-900">
                            {[car.brand, car.model, car.year].filter(Boolean).join(' ')}
                            {km && <span className="ml-2 font-normal text-neutral-400">{km}</span>}
                          </p>
                          <p className="mt-1 text-[12px] text-neutral-400">
                            {TIER_LABELS[scan.tier] ?? scan.tier} · {date}
                            {scan.tokens_spent > 0 && ` · ${scan.tokens_spent} T`}
                          </p>
                        </div>
                        <span className="shrink-0 whitespace-nowrap text-[14px] font-medium tabular-nums text-brand-700">{price}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <aside className="space-y-4">
              <article className="rounded-[28px] border border-brand-100 bg-[linear-gradient(160deg,#FFFFFF_0%,#F5F9FF_100%)] p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)]">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Kredit</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-[46px] font-medium leading-none tabular-nums text-brand-900">{balance}</span>
                  <span className="mb-1 text-[15px] text-neutral-500">tokenů</span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">
                  1 token = $0.10 · rychlý odhad stojí 4 T, expertní 20 T.
                </p>
                {balance <= 10 ? (
                  <p className="mt-3 text-[13px] font-medium text-amber-600">
                    Nízký kredit. Dashboard už to hlídá, další krok bude dobití.
                  </p>
                ) : null}
                <Link
                  href="/predplatne"
                  className="mt-4 inline-flex rounded-full bg-brand-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                >
                  Předplatné &amp; tokeny
                </Link>
              </article>

              <article className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)]">
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Přehled účtu</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-3">
                    <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Identita</p>
                    <p className="mt-2 text-[14px] font-medium text-brand-900">{profileIdentity || 'Zatím bez doplněného názvu'}</p>
                  </div>
                  <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3">
                    <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Typ účtu</p>
                    <p className="mt-2 text-[14px] font-medium text-brand-900">{accountType === 'dealer' ? 'Autobazar' : 'Soukromá osoba'}</p>
                  </div>
                  <div className="rounded-2xl border border-brand-100 bg-white px-4 py-3">
                    <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Další krok</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">{nextAction.detail}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="rounded-full bg-brand-600 px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={nextAction.href}>
                    {nextAction.label}
                  </Link>
                  <Link className="rounded-full border border-brand-100 px-5 py-3 text-[14px] font-medium text-neutral-600 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={profileHref}>
                    Profil a přístupy
                  </Link>
                </div>
              </article>
            </aside>
          </div>

          <section className="mt-6 rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">Dostupné moduly</p>
                <h2 className="mt-2 text-[24px] font-medium tracking-tight text-brand-900">Přehled přístupů podle typu účtu</h2>
              </div>
              <Link className="text-[14px] font-medium text-brand-600 transition-colors hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={profileHref}>
                Spravovat profil
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {TOOLS.map((tool) => {
                const status = getToolStatus(tool.access, accountType);

                return (
                  <Link
                    aria-label={`${tool.label} — ${status.label}`}
                    key={tool.href}
                    href={tool.href}
                    className="rounded-2xl border border-brand-100 bg-brand-50/35 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-500">{tool.badge}</span>
                        <h3 className="mt-2 text-[16px] font-medium text-brand-900">{tool.label}</h3>
                      </div>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">{tool.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="mt-6 rounded-3xl border border-brand-100 bg-white px-4 py-3">
            <p className="wrap-break-word text-[12px] text-neutral-500">
              ID účtu: <span className="font-mono text-neutral-500">{user.id}</span>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
