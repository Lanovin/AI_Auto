import ToolShell from '@/components/tool-shell';

export const metadata = {
  title: 'Monitoring'
};

export default function MonitoringPage() {
  return (
    <ToolShell
      accessLevel="dealer"
      description="Monitoring trhu běží v původní logice, ale je zasazený do stejného vizuálního jazyka a navazuje na uložená auta z ocenění i profilu."
      iframeSrc="/legacy/monitoring"
      title="Monitoring"
    />
  );
}