import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SectionHead } from './HowItWorks';

/**
 * "Čtyři nástroje, jedno přihlášení" — direct service access.
 *
 * Replaces the abstract Segments ("Pro koho") section. Instead of describing
 * audiences in the abstract (consumers, dealers, banks, insurers), this lists
 * the actual TOOLS the platform provides, each linking straight to the route.
 *
 * Cards are full-card links: hover lifts the card and slides the arrow.
 * Badge in the corner signals access tier (free / login / dealer).
 */
const services = [
  {
    title: 'Odhad ceny',
    description:
      'Reálná tržní cena auta s intervalem spolehlivosti — projde inzeráty Sauto, TipCars i ověřenou historii.',
    href: '/odhad-ceny',
    cta: 'Spustit odhad',
    audience: 'Zdarma',
    badgeTone: 'free' as const,
  },
  {
    title: 'Skaut nabídek',
    description:
      'Hledá podhodnocená auta podle vašich kritérií a posílá upozornění na nové výhodné nabídky.',
    href: '/skaut',
    cta: 'Otevřít skauta',
    audience: 'Po přihlášení',
    badgeTone: 'auth' as const,
  },
  {
    title: 'Monitoring trhu',
    description:
      'Sledujte cenové pohyby konkurence, přidávejte auta na watchlist a dostávejte přehled o dění na trhu.',
    href: '/monitoring',
    cta: 'Spustit monitoring',
    audience: 'Pro autobazary',
    badgeTone: 'dealer' as const,
  },
  {
    title: 'Generátor popisků',
    description:
      'AI prodejní popisek inzerátu za 10 sekund — vezme data o autě a vygeneruje text vhodný k inzerci.',
    href: '/popisky',
    cta: 'Generovat popis',
    audience: 'Pro autobazary',
    badgeTone: 'dealer' as const,
  },
];

const badgeStyles = {
  free:   'border border-emerald/30 bg-emerald/10 text-emerald',
  auth:   'border border-line bg-paper-2 text-ink-soft',
  dealer: 'border border-brass/30 bg-brass/10 text-brass',
} as const;

export default function Services() {
  return (
    <section id="services" className="bg-paper-2 px-[22px] py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-[1240px]">
        <SectionHead
          eyebrow="Naše nástroje"
          title={
            <>
              Čtyři nástroje,
              <br />
              <i>jedno přihlášení.</i>
            </>
          }
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {services.map((service) => (
            <Link
              key={service.title}
              href={service.href}
              aria-label={`${service.title} — ${service.cta}`}
              className="group flex flex-col rounded-[22px] border border-line bg-surface p-7 shadow-cargent-card transition-all duration-200 hover:-translate-y-1 hover:border-line-2 hover:shadow-cargent-2 focus-visible:-translate-y-1 focus-visible:border-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper-2 md:p-8"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="cargent-h3 text-[22px] md:text-[26px]">{service.title}</h3>
                <span
                  className={[
                    'shrink-0 rounded-[6px] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em]',
                    badgeStyles[service.badgeTone],
                  ].join(' ')}
                >
                  {service.audience}
                </span>
              </div>

              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink-soft">
                {service.description}
              </p>

              <span className="mt-6 inline-flex items-center gap-2 text-[14px] font-medium text-brass transition-colors group-hover:text-brass-2">
                {service.cta}
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
