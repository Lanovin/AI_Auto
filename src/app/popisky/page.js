import ToolShell from '@/components/tool-shell';

export const metadata = {
  title: 'Popisky'
};

export default function DescriptionsPage() {
  return (
    <ToolShell
      accessLevel="dealer"
      description="Generátor popisků navazuje na uložená data auta a po odemčení B2B větve zachovává původní generování i práci s garáží."
      iframeSrc="/legacy/popisky"
      title="Popisky"
    />
  );
}