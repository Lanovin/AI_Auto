import Link from 'next/link';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import PricingPlans from '@/components/pricing-plans';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { isStripeConfigured, type PlanKey } from '@/lib/stripe/config';

export const metadata = { title: 'Předplatné & tokeny' };
export const dynamic = 'force-dynamic';

interface ProfileRow {
  stripe_customer_id?: string | null;
  dealer_subscription_status?: string | null;
  monitoring_subscription_status?: string | null;
  tokens_balance?: number | null;
}

function isActiveStatus(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trialing';
}

function parseStatus(value: string | string[] | undefined): 'success' | 'cancelled' | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'success' || raw === 'cancelled') return raw;
  return null;
}

function parsePlan(value: string | string[] | undefined): PlanKey | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === 'balicek_1000' || raw === 'balicek_2000' || raw === 'balicek_5000') return raw;
  return null;
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PricingPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const initialStatus = parseStatus(resolvedParams.status);
  const initialStatusPlan = parsePlan(resolvedParams.plan);

  const stripeReady = isStripeConfigured();

  let isAuthenticated = false;
  let profile: ProfileRow | null = null;

  if (hasSupabaseEnv()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        isAuthenticated = true;
        const { data } = await supabase
          .from('profiles')
          .select(
            'stripe_customer_id, dealer_subscription_status, monitoring_subscription_status, tokens_balance',
          )
          .eq('id', user.id)
          .maybeSingle();
        profile = (data as ProfileRow | null) ?? null;
      }
    } catch (err) {
      // Supabase down or schema not migrated yet — render the page anyway with
      // unauthenticated UI so users see the plans.
      console.error('[predplatne] profile lookup failed:', err);
    }
  }

  const activeSubscriptions = {
    dealer: isActiveStatus(profile?.dealer_subscription_status),
    monitoring: isActiveStatus(profile?.monitoring_subscription_status),
  };

  return (
    <>
      <Header />

      <main className="min-h-screen bg-paper" id="main">
        <div className="mx-auto max-w-4xl px-5.5 py-14 md:px-8 md:py-20">
          {/* ── Editorial header ──────────────────────────────────── */}
          <Link
            href="/dashboard"
            className="cargent-link text-[13px] text-dim hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          >
            ← Dashboard
          </Link>

          <div className="mt-6 flex items-center gap-4">
            <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
              Předplatné &amp; tokeny
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-line-2" />
          </div>

          <h1 className="cargent-h1 mt-7 text-[36px] md:text-[48px]">
            Vyberte si <i>plán</i>
          </h1>
          <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-ink-soft">
            Platba probíhá v zabezpečeném Stripe checkoutu. Tokeny a přístupy se
            připisují automaticky po úspěšné platbě.
          </p>

          {!isAuthenticated ? (
            <div className="mt-6 rounded-lg border border-line bg-paper-2 p-4">
              <p className="text-[14px] leading-relaxed text-ink-soft">
                Pro nákup je nutné se{' '}
                <Link href="/prihlaseni?next=/predplatne" className="cargent-link font-medium text-brass">
                  přihlásit
                </Link>{' '}
                nebo{' '}
                <Link href="/registrace" className="cargent-link font-medium text-brass">
                  založit účet
                </Link>
                . Pak se sem vraťte a vyberte si plán.
              </p>
            </div>
          ) : null}

          {profile?.tokens_balance != null ? (
            <p className="mt-6 text-[14px] text-dim">
              Aktuální zůstatek:{' '}
              <span className="cargent-mono font-medium text-ink">
                {profile.tokens_balance} tokenů
              </span>
            </p>
          ) : null}

          <div aria-hidden="true" className="cargent-rule-double mt-10" />

          <section className="mt-10">
            <PricingPlans
              isAuthenticated={isAuthenticated}
              stripeReady={stripeReady}
              activeSubscriptions={activeSubscriptions}
              hasStripeCustomer={Boolean(profile?.stripe_customer_id)}
              initialStatus={initialStatus}
              initialStatusPlan={initialStatusPlan}
            />
          </section>

          <section className="mt-10 rounded-lg border border-line bg-surface p-6">
            <p className="cargent-mono text-[11px] uppercase tracking-[0.16em] text-brass">Postup</p>
            <h2 className="cargent-h3 mt-1 text-[18px]">Jak to funguje</h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-ink-soft marker:text-faint">
              <li>Klikněte na <strong className="text-ink">Předplatit / Koupit</strong>. Otevře se Stripe checkout.</li>
              <li>
                Dokončete platbu. V testovacím režimu použijte kartu{' '}
                <code className="cargent-mono rounded bg-paper-2 px-1.5 py-0.5 text-[12px]">4242 4242 4242 4242</code>{' '}
                s libovolným budoucím datem a CVC.
              </li>
              <li>
                Stripe pošle webhook na <code className="cargent-mono rounded bg-paper-2 px-1.5 py-0.5 text-[12px]">/api/stripe/webhook</code>{' '}
                a tokeny se připíšou na váš účet.
              </li>
              <li>
                Předplatné spravujte v zákaznickém portálu (níže) nebo přes{' '}
                <code className="cargent-mono rounded bg-paper-2 px-1.5 py-0.5 text-[12px]">stripe billing portal</code>.
              </li>
            </ol>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
