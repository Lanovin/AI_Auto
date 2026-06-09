import DealerAccessGate from '@/components/dealer-access-gate';
import LegacyToolFrame from '@/components/legacy-tool-frame';
import Header from '@/components/landing/Header';
import PageIntro from '../../components/PageIntro';

export default function ToolShell({ description, iframeSrc, title, accessLevel = 'public' }) {
  const frame = <LegacyToolFrame src={iframeSrc} title={title} />;
  const moduleTone = accessLevel === 'dealer' ? 'dealer' : 'people';
  const actions = accessLevel === 'dealer'
    ? [
        { href: '/profil?mode=dealer', label: 'Profil autobazaru' },
        { href: '/odhad-ceny', label: 'Oceňte si auto', variant: 'secondary' }
      ]
    : accessLevel === 'authenticated'
      ? [
          { href: '/profil', label: 'Profil' },
          { href: '/odhad-ceny', label: 'Oceňte si auto', variant: 'secondary' }
        ]
      : [{ href: '/profil?mode=dealer', label: 'Pro autobazary', variant: 'secondary' }];

  return (
    <main className="shell">
      <Header />

      <PageIntro
        actions={actions}
        description={description}
        eyebrow={accessLevel === 'dealer' ? 'Firemní modul' : accessLevel === 'authenticated' ? 'Přihlášený modul' : 'Retail modul'}
        hideSummary
        title={title}
        tone={moduleTone}
      />

      <section className="section tool-shell-section">
        <div className="container">
          {accessLevel === 'public' ? frame : <DealerAccessGate requiredRole={accessLevel}>{frame}</DealerAccessGate>}
        </div>
      </section>
    </main>
  );
}