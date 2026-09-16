import { redirect } from 'next/navigation';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import LegacyToolFrame from '@/components/legacy-tool-frame';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';

export const metadata = { title: 'Firemní profil' };
export const dynamic = 'force-dynamic';

/**
 * /profil — firemní nástroje autobazaru (import vozů z webu, garáž).
 * Soukromé účty a hosté se přesměrují: účet → /dashboard, host → přihlášení.
 */
export default async function ProfilePage({ searchParams }) {
  const params = await searchParams;
  const wantsDealer = params?.mode === 'dealer' || params?.type === 'dealer';

  if (!hasSupabaseEnv()) redirect('/prihlaseni');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(wantsDealer ? '/registrace?type=dealer' : '/prihlaseni?next=%2Fprofil');
  }

  const accountType = user.user_metadata?.account_type === 'dealer' ? 'dealer' : 'person';
  if (accountType !== 'dealer') redirect('/dashboard');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-paper" id="main">
        <section className="px-5.5 pt-12 pb-6 md:px-8 md:pt-16">
          <div className="mx-auto max-w-275">
            <span className="cargent-mono text-[11px] uppercase tracking-[0.18em] text-brass">Firemní účet</span>
            <h1 className="cargent-h1 mt-4 text-[34px] md:text-[44px]">Firemní profil autobazaru</h1>
            <p className="mt-4 max-w-[62ch] text-[16px] leading-relaxed text-ink-soft">
              Import vozů z vašeho webu do garáže a nastavení firemních údajů. Přehled kreditu a historii najdete v účtu.
            </p>
          </div>
        </section>
        <section className="px-5.5 pb-20 md:px-8">
          <div className="mx-auto max-w-275">
            <LegacyToolFrame src="/legacy/profil" title="Profil autobazaru" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
