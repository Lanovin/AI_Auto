import { BarChart3, ShieldCheck, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type FeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const featureItems: FeatureItem[] = [
  {
    title: 'Odhad ceny nad trhem',
    description: 'Stejný formulář obslouží rychlou cenu i detailní posudek podle zvoleného rozsahu.',
    icon: BarChart3
  },
  {
    title: 'Popisky bez přepisování',
    description: 'Údaje o autě se ukládají sdíleně, takže z ocenění rovnou pokračujete do inzerátového textu.',
    icon: Zap
  },
  {
    title: 'Monitoring a skaut pro bazary',
    description: 'Firemní větev přidává sledování konkurence, scouting a práci s profilem bez rozbití retail toku.',
    icon: ShieldCheck
  }
];

type FeaturesProps = {
  brandName: string;
};

export default function Features({ brandName }: FeaturesProps) {
  return (
    <section className="py-16 md:py-24" id="reseni">
      <div className="mx-auto max-w-300 px-6 md:px-12">
        <div className="max-w-[680px]">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-brand-600">Co v {brandName} opravdu běží</p>
          <h2 className="mt-4 text-[28px] font-medium leading-[1.2] text-brand-900 md:text-[32px]">Původní funkce projektu poskládané do jedné cesty</h2>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {featureItems.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                className="rounded-xl border border-[rgba(0,0,0,0.08)] bg-white p-6 shadow-card"
                key={feature.title}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-[16px] font-medium text-brand-900">{feature.title}</h3>
                <p className="mt-3 max-w-[24ch] text-[15px] leading-[1.6] text-neutral-500">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}