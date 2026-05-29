import ToolShell from '@/components/tool-shell';

export const metadata = {
  title: 'Skaut'
};

export default function ScoutPage() {
  return (
    <ToolShell
      accessLevel="authenticated"
      description="Skaut nabídek je dostupný po přihlášení a pomáhá hledat podhodnocená auta pro soukromé uživatele i autobazary."
      iframeSrc="/legacy/skaut"
      title="Skaut"
    />
  );
}