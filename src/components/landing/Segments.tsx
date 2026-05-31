import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * Segments — dvě jasně oddělené cesty pro B2C a B2B.
 *
 * UX princip: uživatel si musí okamžitě poznat, kde je.
 * Místo 4 nástrojů prezentovaných stejnou vahou ukazujeme
 * 2 různé role s vlastním copywritingem a vlastní cestou.
 *
 * B2C karta: vizuálně dominantnější (prodávám / kupuji auto)
 * B2B karta: jasný signál pro firemní zákazníky (autobazar, dealer)
 *
 * Pod kartami: sekundární přehled konkrétních nástrojů
 * pro ty, kteří se chtějí proklikat přímo.
 */

const consumerBenefits = [
  'Zjistím, za kolik se moje auto prodá',
  'Ověřím, jestli je nabídka výhodná',
  'Nemusím se přihlašovat',
];

const dealerBenefits = [
  'Monitoring cen konkurence',
  'Generátor prodejních popisků',
  'API pro vlastní systémy',
];

const allTools = [
  { label: 'Odhad ceny',         href: '/odhad-ceny',  audience: 'Zdarma'      },
  { label: 'Skaut nabídek',      href: '/skaut',        audience: 'Přihlásit se' },
  { label: 'Monitoring trhu',    href: '/monitoring',   audience: 'Autobazary'  },
  { label: 'Generátor popisků',  href: '/popisky',      audience: 'Autobazary'  },
];

export default function Segments() {
  return (
    <section id="who" className="px-[22px] py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1240px]">
        {/* Section label */}
        <p className="cargent-mono mb-8 text-center text-[11px] uppercase tracking-[0.14em] text-brass">
          — Pro koho je Cargent
        </p>

        {/* Two-path grid */}
        <div className="grid gap-5 md:grid-cols-2">

          {/* ── B2C card — dominant ───────────────────────────────── */}
          <article
            className="flex flex-col rounded-[22px] border border-line bg-surface p-7 md:p-9"
            style={{ boxShadow: 'var(--shadow-cargent)' }}
          >
            <span
              className="inline-flex self-start rounded-[8px] border border-emerald/30 px-3 py-1 text-[12px] font-medium text-emerald"
              style={{ backgroundColor: 'rgba(28,107,87,0.08)' }}
            >
              Pro každého
            </span>

            <h2 className="cargent-h2 mt-5 text-[32px] md:text-[38px]">
              Prodáváte nebo
              <br />
              <i>kupujete auto?</i>
            </h2>

            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Zadejte značku, rok a najeto. Do 30 sekund uvidíte, za kolik se
              srovnatelná auta prodávají právě teď — a co ovlivňuje cenu
              vašeho konkrétního vozu.
            </p>

            <ul className="mt-6 flex flex-col gap-2.5">
              {consumerBenefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[14px] text-ink-soft">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Link
                href="/odhad-ceny"
                style={{ color: '#FFFFFF' }}
                className="group inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-3 text-[14px] font-medium text-white transition-colors hover:bg-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                Ocenit auto zdarma
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </article>

          {/* ── B2B card ──────────────────────────────────────────── */}
          <article
            id="dealers"
            className="flex flex-col rounded-[22px] border border-line bg-paper-2 p-7 md:p-9"
            style={{ boxShadow: 'var(--shadow-cargent-card)' }}
          >
            <span
              className="inline-flex self-start rounded-[8px] border border-brass/30 px-3 py-1 text-[12px] font-medium text-brass"
              style={{ backgroundColor: 'rgba(176,121,29,0.08)' }}
            >
              Pro autobazary
            </span>

            <h2 className="cargent-h2 mt-5 text-[32px] md:text-[38px]">
              Vedete bazar
              <br />
              <i>nebo flotilu?</i>
            </h2>

            <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
              Monitoring cen konkurence, hromadné oceňování i generátor
              prodejních popisků. Nebo napojte Cargent přímo do svého
              systému přes API.
            </p>

            <ul className="mt-6 flex flex-col gap-2.5">
              {dealerBenefits.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[14px] text-ink-soft">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden="true" />
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#api"
                style={{ backgroundColor: 'rgba(176,121,29,0.10)' }}
                className="group inline-flex items-center gap-2 rounded-[10px] border border-brass/40 px-5 py-3 text-[14px] font-medium text-brass transition-colors hover:bg-brass/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                Zjistit více pro firmy
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link
                href="/monitoring"
                className="rounded-[10px] border border-line px-5 py-3 text-[14px] font-medium text-ink-soft transition-colors hover:border-line-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                Vyzkoušet monitoring
              </Link>
            </div>
          </article>
        </div>

        {/* ── All tools — secondary, compact ────────────────────── */}
        <div className="mt-6 rounded-[18px] border border-line bg-paper-2/60 p-4 md:p-5">
          <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.10em] text-faint">
            Všechny nástroje
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {allTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group flex flex-col gap-1 rounded-[12px] border border-line bg-surface px-4 py-3 transition-colors hover:border-brass/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
              >
                <span className="text-[14px] font-medium text-ink transition-colors group-hover:text-brass">
                  {tool.label}
                </span>
                <span className="text-[11px] text-faint">{tool.audience}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
