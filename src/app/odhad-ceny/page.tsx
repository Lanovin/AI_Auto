import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import EstimatorForm from '@/components/estimator/EstimatorForm';
import { getSessionUser, getTokenBalance, getTokenPricing } from '@/lib/tokens-server';
import { isAdminAuthenticated } from '@/lib/admin/auth';

export const metadata = {
  title: 'Odhad ceny',
  description: 'Zadejte auto a získejte tržní cenu z aktuálních inzerátů — s pásmem, výkupní cenou a odkazy na zdroje.',
};
export const dynamic = 'force-dynamic';

export default async function PricePage() {
  const [pricing, user, isAdmin] = await Promise.all([getTokenPricing(), getSessionUser(), isAdminAuthenticated()]);
  const balance = user ? await getTokenBalance() : null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper" id="main">
        <section className="px-5.5 pt-12 pb-8 md:px-8 md:pt-16">
          <div className="mx-auto max-w-275">
            <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-brass">Odhad ceny</span>
            <h1 className="cargent-h1 mt-4 text-[34px] md:text-[46px]">Kolik stojí vaše auto</h1>
            <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink-soft">
              Zadáte auto, AI prohledá aktuální inzeráty a spočítá tržní cenu z těch srovnatelných. U každé ceny vidíte inzeráty, ze kterých vychází.
            </p>
          </div>
        </section>

        <section className="px-5.5 pb-24 md:px-8">
          <div className="mx-auto max-w-275">
            <EstimatorForm
              pricing={pricing}
              isAuthenticated={Boolean(user)}
              isAdmin={isAdmin}
              balance={balance}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
