import LegalPage, { LegalSection } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Ochrana osobních údajů',
  description: 'Zásady zpracování osobních údajů služby Cargent (GDPR).',
};

/**
 * NÁVRH zásad ochrany osobních údajů — před produkčním nasazením nechat
 * zkontrolovat advokátem. Místa označená [DOPLNIT] vyplňte údaji správce.
 */
export default function OchranaUdajuPage() {
  return (
    <LegalPage
      eyebrow="Právní dokumenty"
      title={<>Ochrana osobních <i>údajů</i></>}
      updated="Aktualizováno 10. 6. 2026"
    >
      <LegalSection n="01" title="Správce údajů">
        <p>
          Správcem osobních údajů je [DOPLNIT: jméno / název společnosti], IČO [DOPLNIT],
          se sídlem [DOPLNIT]. Kontakt pro záležitosti ochrany údajů:{' '}
          <a className="cargent-link text-ink" href="mailto:hello@cargent.cz">hello@cargent.cz</a>.
        </p>
      </LegalSection>

      <LegalSection n="02" title="Jaké údaje zpracováváme">
        <ul>
          <li><strong className="text-ink">Údaje účtu</strong> — e-mail, volitelně jméno či název firmy.</li>
          <li><strong className="text-ink">Údaje o vozidlech</strong>, které sami zadáte — značka, model, rok, nájezd, výbava, stav, volitelně VIN. VIN může být ve spojení s dalšími údaji osobním údajem; zadáváte jej dobrovolně.</li>
          <li><strong className="text-ink">Historie ocenění</strong> — zadané parametry vozu, zvolený typ posudku a souhrnné výsledky (cenové pásmo, počet inzerátů). Historie neobsahuje odkazy ani data z cizích inzerátů.</li>
          <li><strong className="text-ink">Platební údaje</strong> — zpracovává je výhradně Stripe; čísla karet k nám nedoputují.</li>
          <li><strong className="text-ink">Technické údaje</strong> — IP adresa a logy nezbytné pro provoz a bezpečnost.</li>
        </ul>
        <p>
          <strong className="text-ink">Neukládáme osobní údaje prodejců z inzerátů.</strong> AI model
          má výslovně zakázáno extrahovat jména, telefony, e-maily či adresy z inzerátů a server
          navíc tyto vzory z výsledků filtruje.
        </p>
      </LegalSection>

      <LegalSection n="03" title="Účely a právní základy">
        <ul>
          <li>Poskytování služby (účet, ocenění, historie) — plnění smlouvy, čl. 6 odst. 1 písm. b) GDPR.</li>
          <li>Fakturace a účetnictví — právní povinnost, čl. 6 odst. 1 písm. c).</li>
          <li>Bezpečnost, prevence zneužití (denní limity, logy) — oprávněný zájem, čl. 6 odst. 1 písm. f).</li>
          <li>Obchodní sdělení registrovaným uživatelům — oprávněný zájem s možností kdykoli se odhlásit.</li>
        </ul>
      </LegalSection>

      <LegalSection n="04" title="Příjemci a zpracovatelé">
        <p>Údaje zpracováváme pomocí těchto poskytovatelů:</p>
        <ul>
          <li><strong className="text-ink">Supabase</strong> — databáze účtů a uživatelských dat (EU region).</li>
          <li><strong className="text-ink">Neon</strong> — anonymní sdílená cache výsledků skenů (EU region, bez vazby na účet).</li>
          <li><strong className="text-ink">Vercel</strong> — hosting aplikace.</li>
          <li><strong className="text-ink">Stripe</strong> — platby a fakturace.</li>
          <li><strong className="text-ink">Anthropic</strong> — AI analýza a webové vyhledávání. Zadané parametry vozu se předávají ke zpracování do USA na základě standardních smluvních doložek (SCC), případně rámce EU-U.S. Data Privacy Framework.</li>
        </ul>
      </LegalSection>

      <LegalSection n="05" title="Doby uchování">
        <ul>
          <li>Sdílená cache výsledků skenů: <strong className="text-ink">max. 14 dní</strong>, poté se automaticky maže. Cache není vázána na účet.</li>
          <li>Historie ocenění: do smazání uživatelem (přímo v dashboardu) nebo do zrušení účtu.</li>
          <li>Údaje účtu: po dobu existence účtu.</li>
          <li>Účetní doklady: po dobu stanovenou zákonem (10 let).</li>
        </ul>
      </LegalSection>

      <LegalSection n="06" title="Vaše práva">
        <p>
          Máte právo na přístup ke svým údajům, jejich opravu, výmaz, omezení zpracování,
          přenositelnost a právo vznést námitku. Historii ocenění můžete kdykoli smazat sami
          v dashboardu; o výmaz celého účtu požádejte e-mailem na{' '}
          <a className="cargent-link text-ink" href="mailto:hello@cargent.cz">hello@cargent.cz</a> —
          vyřídíme jej do 30 dnů. Dozorovým úřadem je Úřad pro ochranu osobních údajů (uoou.gov.cz).
        </p>
      </LegalSection>

      <LegalSection n="07" title="Cookies a lokální úložiště">
        <p>
          Používáme pouze technicky nezbytné cookies (přihlašovací session) a lokální úložiště
          prohlížeče pro funkce aplikace (např. rozpracované zadání vozu, zůstatek demo tokenů).
          Marketingové ani sledovací cookies nenasazujeme; pokud se to změní, budeme předem žádat
          o souhlas.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
