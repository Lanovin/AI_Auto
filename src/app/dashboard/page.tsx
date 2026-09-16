import Link from 'next/link';
import { redirect } from 'next/navigation';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import { createClient } from '@/lib/supabase/server';
import { getScanHistory } from '@/lib/supabase/user-data';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { isStripeConfigured } from '@/lib/stripe/config';
import { formatTokens, TOKEN_VALUE_CZK } from '@/lib/tokens';
import ScanHistoryList from '@/components/dashboard/ScanHistoryList';
import BillingHistory from '@/components/dashboard/BillingHistory';
import RedeemCode from '@/components/dashboard/RedeemCode';

export const metadata = { title: 'Můj účet' };
export const dynamic = 'force-dynamic';

type AccountType = 'person' | 'dealer';

const TOOLS: Array<{ label: string; href: string; access: 'all' | 'dealer'; description: string }> = [
  { label: 'Odhad ceny', href: '/odhad-ceny', access: 'all', description: 'Tržní cena z aktuálních inzerátů.' },
  { label: 'Skaut nabídek', href: '/skaut', access: 'all', description: 'Hledání podhodnocených nabídek.' },
  { label: 'Monitoring trhu', href: '/monitoring', access: 'dealer', description: 'Sledování cen a watchlist konkurence.' },
  { label: 'Popisky inzerátů', href: '/popisky', access: 'dealer', description: 'Generátor textů k inzerátům.' },
  { label: 'Firemní profil', href: '/profil', access: 'dealer', description: 'Import vozů z vašeho webu do garáže.' },
];

export default async function DashboardPage() {
  if (!hasSupabaseEnv()) redirect('/prihlaseni');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/prihlaseni?next=/dashboard');

  const [profileResult, history] = await Promise.all([
    supabase.from('profiles').select('tokens_balance, full_name, company_name, stripe_customer_id, dealer_subscription_status, dealer_subscription_until').eq('id', user.id).maybeSingle(),
    getScanHistory(8),
  ]);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const accountType: AccountType = meta.account_type === 'dealer' ? 'dealer' : 'person';
  const profile = profileResult.data as {
    tokens_balance?: number; full_name?: string; company_name?: string; stripe_customer_id?: string | null;
    dealer_subscription_status?: string | null; dealer_subscription_until?: string | null;
  } | null;
  const balance = profile?.tokens_balance ?? 0;
  const fullName = profile?.full_name || (typeof meta.full_name === 'string' ? meta.full_name : '') || (typeof meta.name === 'string' ? meta.name : '');
  const companyName = profile?.company_name || (typeof meta.company_name === 'string' ? meta.company_name : '');
  const title = accountType === 'dealer' ? companyName || 'Firemní účet' : fullName ? `Ahoj, ${fullName.split(' ')[0]}` : 'Můj účet';
  const subActive = profile?.dealer_subscription_status === 'active' || profile?.dealer_subscription_status === 'trialing';
  const subUntil = profile?.dealer_subscription_until ? new Date(profile.dealer_subscription_until).toLocaleDateString('cs-CZ') : null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper" id="main">
        <div className="mx-auto max-w-275 px-5.5 py-12 md:px-8 md:py-16">
          {/* ── Hlavička ───────────────────────────────────────── */}
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-brass">
                {accountType === 'dealer' ? 'Firemní účet · autobazar' : 'Osobní účet'}
              </span>
              <h1 className="cargent-h1 mt-3 text-[32px] md:text-[42px]">{title}</h1>
              <p className="mt-2 text-[14px] text-dim">{user.email}</p>
            </div>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="rounded-md border border-line-2 px-4 py-2.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-brass hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                Odhlásit se
              </button>
            </form>
          </div>

          {/* ── Kredit + akce ──────────────────────────────────── */}
          <div className="mt-10 grid gap-8 border-y border-line py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
            <div>
              <p className="text-[13px] text-dim">Kredit</p>
              <p className="cargent-mono mt-1 text-[44px] font-medium leading-none text-ink">
                {balance.toLocaleString('cs-CZ')} <span className="text-[16px] text-ink-soft">tokenů</span>
              </p>
              <p className="mt-2 text-[13px] text-dim">≈ {(balance * TOKEN_VALUE_CZK).toLocaleString('cs-CZ')} Kč · 1 token ≈ {TOKEN_VALUE_CZK} Kč</p>
              {balance <= 10 ? <p className="mt-2 text-[13px] font-medium text-negative">Nízký kredit — dobijte, ať vás nezastaví uprostřed práce.</p> : null}
              <Link
                href="/cenik"
                className="mt-4 inline-flex rounded-md bg-brass px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                Dobít kredit
              </Link>
            </div>

            <div>
              <p className="text-[13px] text-dim">Předplatné</p>
              {subActive ? (
                <>
                  <p className="mt-1 text-[17px] font-semibold text-emerald">Aktivní</p>
                  <p className="mt-1 text-[13px] text-dim">Tokeny se připisují každý měsíc{subUntil ? `, další období do ${subUntil}` : ''}.</p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-[17px] font-semibold text-ink">Žádné</p>
                  <p className="mt-1 text-[13px] text-dim">Kupujete jednorázové balíčky. Předplatné najdete v ceníku, pokud je nabízíme.</p>
                </>
              )}
              {profile?.stripe_customer_id && isStripeConfigured() ? (
                <Link href="/cenik" className="cargent-link mt-3 inline-block text-[13px] font-medium text-brass">Platby a faktury</Link>
              ) : null}
            </div>

            <RedeemCode />
          </div>

          {/* ── Historie ──────────────────────────────────────── */}
          <section className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-[20px] font-bold tracking-tight text-ink">Poslední ocenění</h2>
              <Link href="/odhad-ceny" className="cargent-link text-[14px] font-medium text-brass">Nové ocenění</Link>
            </div>
            <ScanHistoryList history={history} />
          </section>

          {/* ── Nástroje ──────────────────────────────────────── */}
          <section className="mt-12">
            <h2 className="text-[20px] font-bold tracking-tight text-ink">Nástroje</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {TOOLS.map((tool) => {
                const locked = tool.access === 'dealer' && accountType !== 'dealer';
                return (
                  <li key={tool.href} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
                    <div>
                      {locked ? (
                        <span className="text-[15px] font-semibold text-faint">{tool.label}</span>
                      ) : (
                        <Link href={tool.href} className="cargent-link text-[15px] font-semibold text-ink hover:text-brass">{tool.label}</Link>
                      )}
                      <p className="text-[13px] text-dim">{tool.description}</p>
                    </div>
                    <span className="cargent-mono text-[11px] uppercase tracking-[0.12em] text-faint">
                      {locked ? 'Jen firemní účty' : tool.access === 'dealer' ? 'Firemní' : 'Dostupné'}
                    </span>
                  </li>
                );
              })}
            </ul>
            {accountType !== 'dealer' ? (
              <p className="mt-3 text-[13px] text-dim">
                Jste autobazar? <Link href="/kontakt" className="cargent-link text-brass">Napište nám</Link> a účet převedeme na firemní.
              </p>
            ) : null}
          </section>

          <BillingHistory />

          <p className="mt-10 text-[12px] text-faint">ID účtu: <span className="cargent-mono">{user.id}</span></p>
        </div>
      </main>
      <Footer />
    </>
  );
}
