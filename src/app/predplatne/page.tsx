import Link from 'next/link';
import Header from '@/components/landing/Header';
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
  if (raw === 'tokens_100') return raw;
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

      <main className="min-h-screen bg-[linear-gradient(180deg,#F4F8FD_0%,#FFFFFF_38%,#FFFFFF_100%)]">
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-12">
          <section className="rounded-[28px] border border-brand-100 bg-white p-6 shadow-[0_18px_40px_rgba(24,95,165,0.06)] md:p-8">
            <Link
              href="/dashboard"
              className="text-[13px] text-neutral-500 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              ← Dashboard
            </Link>
            <p className="mt-4 text-[12px] font-medium uppercase tracking-[0.08em] text-brand-500">
              Předplatné &amp; tokeny
            </p>
            <h1 className="mt-2 text-[30px] font-medium tracking-tight text-brand-900 md:text-[36px]">
              Vyberte si plán
            </h1>
            <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-neutral-500">
              Testovací ceny (Stripe test mode). Platba probíhá v zabezpečeném Stripe checkoutu. Tokeny
              a přístupy se připisují automaticky po úspěšné platbě.
            </p>

            {!isAuthenticated ? (
              <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
                <p className="text-[14px] leading-relaxed text-brand-800">
                  Pro nákup je nutné se{' '}
                  <Link href="/prihlaseni?next=/predplatne" className="font-medium underline">
                    přihlásit
                  </Link>{' '}
                  nebo{' '}
                  <Link href="/registrace" className="font-medium underline">
                    založit účet
                  </Link>
                  . Pak se sem vraťte a vyberte si plán.
                </p>
              </div>
            ) : null}

            {profile?.tokens_balance != null ? (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-4 py-2 text-[13px] font-medium text-brand-700">
                <span className="text-[10px]">◈</span>
                Aktuální zůstatek: {profile.tokens_balance} tokenů
              </div>
            ) : null}
          </section>

          <section className="mt-6">
            <PricingPlans
              isAuthenticated={isAuthenticated}
              stripeReady={stripeReady}
              activeSubscriptions={activeSubscriptions}
              hasStripeCustomer={Boolean(profile?.stripe_customer_id)}
              initialStatus={initialStatus}
              initialStatusPlan={initialStatusPlan}
            />
          </section>

          <section className="mt-6 rounded-3xl border border-brand-100 bg-white p-6">
            <h2 className="text-[18px] font-medium text-brand-900">Jak to funguje</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-neutral-600">
              <li>Klikněte na <strong>Předplatit / Koupit</strong>. Otevře se Stripe checkout.</li>
              <li>
                Dokončete platbu v testovacím režimu. Použijte testovací kartu{' '}
                <code className="rounded bg-brand-50 px-1.5 py-0.5 text-[12px]">4242 4242 4242 4242</code>{' '}
                s libovolným budoucím datem a CVC.
              </li>
              <li>
                Stripe pošle webhook na <code className="rounded bg-brand-50 px-1.5 py-0.5 text-[12px]">/api/stripe/webhook</code>{' '}
                a tokeny se připíšou na váš účet.
              </li>
              <li>
                Předplatné spravujte v zákaznickém portálu (níže) nebo přes{' '}
                <code className="rounded bg-brand-50 px-1.5 py-0.5 text-[12px]">stripe billing portal</code>.
              </li>
            </ol>
          </section>
        </div>
      </main>
    </>
  );
}
