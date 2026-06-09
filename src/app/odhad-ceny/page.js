import ToolShell from '@/components/tool-shell';

export const metadata = {
  title: 'Odhad ceny'
};

export default function PricePage() {
  return (
    <ToolShell
      description="Zadejte auto a AI porovná aktuální inzeráty z předních inzertních portálů. Během chvíle uvidíte reálnou tržní cenu pro prodej, nákup i rychlé ověření nabídky."
      iframeSrc="/legacy/ceny"
      title="Odhad ceny"
    />
  );
}