import Header from '@/components/landing/Header';
import ProfileHub from '@/components/profile-hub';
import PromoRedeem from '@/components/promo-redeem';

export const metadata = {
  title: 'Účet a přístupy'
};

export default async function ProfilePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const preferredMode = resolvedSearchParams?.mode === 'dealer' || resolvedSearchParams?.type === 'dealer' ? 'dealer' : 'person';

  return (
    <>
      <Header />
      <main className="shell" id="main">
        <ProfileHub preferredMode={preferredMode} />
        <PromoRedeem />
      </main>
    </>
  );
}