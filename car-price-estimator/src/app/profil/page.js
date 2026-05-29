import Navbar from '../../../components/Navbar';
import ProfileHub from '@/components/profile-hub';

export const metadata = {
  title: 'Účet a přístupy'
};

export default async function ProfilePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const preferredMode = resolvedSearchParams?.mode === 'dealer' || resolvedSearchParams?.type === 'dealer' ? 'dealer' : 'person';

  return (
    <>
      <Navbar brandName="AutoAI" />
      <main className="shell" id="main">
        <ProfileHub preferredMode={preferredMode} />
      </main>
    </>
  );
}