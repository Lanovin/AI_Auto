import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/landing/Header';
import { createClient } from '@/lib/supabase/server';
import { getScanHistory } from '@/lib/supabase/user-data';
import ScanHistoryList from '@/components/dashboard/ScanHistoryList';
import BillingHistory from '@/components/dashboard/BillingHistory';
import RedeemCode from '@/components/dashboard/RedeemCode';

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

function getToolStatus(access: ToolAccess, accountType: AccountType) {
  if (access === 'public') {
    return {
      label: 'Dostupné nyní',
      className: 'border border-emerald/25 bg-emerald/8 text-emerald',
    };
  }

  if (access === 'authenticated') {
    return {
      label: 'Součást účtu',
      className: 'border border-brass/25 bg-brass/8 text-brass',
    };
  }

  return accountType === 'dealer'
    ? {
      label: 'Součást firemního účtu',
      className: 'border border-ink/15 bg-ink/5 text-ink',
    }
    : {
      label: 'Jen pro autobazary',
      className: 'border border-line bg-paper-2 text-dim',
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
    ? companyName || 'Firemní účet'
    : fullName
      ? `Ahoj, ${fullName.split(' ')[0]}`
      : 'Můj účet';
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
      <Header />

      <main className="min-h-screen bg-paper" id="main">
        <div className="mx-auto max-w-6xl px-5.5 py-12 md:px-8">
          <section className="rounded-xl border border-line bg-surface p-6 md:p-8" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <Link href="/" className="cargent-link text-[13px] text-dim hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2">
                  ← Domů
                </Link>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="cargent-mono rounded-md border border-line bg-paper-2 px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                    {accountType === 'dealer' ? 'Autobazar' : 'Soukromá osoba'}
                  </span>
                  <span className={`cargent-mono rounded-md px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] ${
                    identityReady ? 'border border-emerald/25 bg-emerald/8 text-emerald' : 'border border-line bg-paper-2 text-dim'
                  }`}>
                    {identityReady ? 'Profil připraven' : 'Chybí údaje'}
                  </span>
                </div>
                <h1 className="cargent-h1 mt-5 text-[30px] md:text-[40px]">
                  {pageTitle}
                </h1>
                <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
                  {accountType === 'dealer'
                    ? 'Firemní účet spojuje monitoring, popisky, skauta a účetovou administraci do jedné přihlášené větve.'
                    : 'Osobní účet drží historii ocenění, kredit a rychlý přechod do navazujících modulů bez míchání s demo režimem.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:items-end">
                <div className="rounded-lg border border-line bg-paper-2 px-4 py-3 text-left sm:text-right">
                  <p className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-dim">Přihlášený e-mail</p>
                  <p className="mt-1 wrap-break-word text-[14px] font-medium text-ink">{user.email}</p>
                </div>
                <form action="/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-md border border-line-2 px-5 py-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
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
                  <article key={item.title} className="rounded-lg border border-line bg-paper-2 p-4">
                    <span className={`cargent-mono inline-flex rounded-md px-2.5 py-1 text-[11px] uppercase tracking-[0.1em] ${
                      item.done ? 'border border-emerald/25 bg-emerald/8 text-emerald' : 'border border-brass/25 bg-brass/8 text-brass'
                    }`}>
                      {item.done ? 'Hotovo' : 'Další krok'}
                    </span>
                    <strong className="mt-3 block text-[16px] font-semibold text-ink">{item.title}</strong>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{item.detail}</p>
                  </article>
                ))}
              </div>
            </section>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <section className="rounded-xl border border-line bg-surface p-6" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">Poslední ocenění</p>
                  <h2 className="cargent-h2 mt-2 text-[24px]">Co se v účtu dělo naposledy</h2>
                </div>
                <Link className="cargent-link text-[14px] font-medium text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2" href={profileHref}>
                  Profil a přístupy
                </Link>
              </div>

              <ScanHistoryList history={history} />
            </section>

            <aside className="space-y-4">
              <article className="rounded-xl border border-line bg-paper-2 p-6" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
                <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">Kredit</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="cargent-mono text-[46px] font-medium leading-none text-ink">{balance}</span>
                  <span className="mb-1 text-[15px] text-dim">tokenů</span>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">
                  1 token ≈ 5 Kč · aktuální ceny jednotlivých akcí najdete v ceníku.
                </p>
                {balance <= 10 ? (
                  <p className="mt-3 text-[13px] font-medium text-negative">
                    Nízký kredit. Dashboard už to hlídá, další krok bude dobití.
                  </p>
                ) : null}
                <Link
                  href="/predplatne"
                  className="mt-4 inline-flex rounded-md bg-brass px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                >
                  Předplatné &amp; tokeny
                </Link>
              </article>

              <RedeemCode />

              <article className="rounded-xl border border-line bg-surface p-6" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
                <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">Přehled účtu</p>
                <div className="mt-4 space-y-3">
                  <div className="rounded-lg border border-line bg-paper-2 px-4 py-3">
                    <p className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-dim">Identita</p>
                    <p className="mt-2 text-[14px] font-medium text-ink">{profileIdentity || 'Zatím bez doplněného názvu'}</p>
                  </div>
                  <div className="rounded-lg border border-line px-4 py-3">
                    <p className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-dim">Typ účtu</p>
                    <p className="mt-2 text-[14px] font-medium text-ink">{accountType === 'dealer' ? 'Autobazar' : 'Soukromá osoba'}</p>
                  </div>
                  <div className="rounded-lg border border-line px-4 py-3">
                    <p className="cargent-mono text-[11px] uppercase tracking-[0.14em] text-dim">Další krok</p>
                    <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{nextAction.detail}</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="rounded-md bg-brass px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2" href={nextAction.href}>
                    {nextAction.label}
                  </Link>
                  <Link className="rounded-md border border-line-2 px-5 py-3 text-[14px] font-semibold text-ink-soft transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2" href={profileHref}>
                    Profil a přístupy
                  </Link>
                </div>
              </article>
            </aside>
          </div>

          <section className="mt-6 rounded-xl border border-line bg-surface p-6" style={{ boxShadow: 'var(--shadow-cargent-card)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">Dostupné moduly</p>
                <h2 className="cargent-h2 mt-2 text-[24px]">Přehled přístupů podle typu účtu</h2>
              </div>
              <Link className="cargent-link text-[14px] font-medium text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2" href={profileHref}>
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
                    className="rounded-lg border border-line bg-paper-2 p-4 transition-colors hover:border-brass/40 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="cargent-mono text-[11px] uppercase tracking-[0.1em] text-dim">{tool.badge}</span>
                        <h3 className="mt-2 text-[16px] font-semibold text-ink">{tool.label}</h3>
                      </div>
                      <span className={`cargent-mono shrink-0 rounded-md px-2.5 py-1 text-[11px] uppercase tracking-[0.08em] ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{tool.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <BillingHistory />

          <section className="mt-6 rounded-lg border border-line bg-surface px-4 py-3">
            <p className="wrap-break-word text-[12px] text-dim">
              ID účtu: <span className="cargent-mono text-dim">{user.id}</span>
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
