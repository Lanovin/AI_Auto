import LegalPage, { LegalSection } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Zdroje dat a metodika',
  description: 'Jak Cargent získává tržní data, jak vzniká ocenění a jak respektujeme práva inzertních portálů.',
};

export default function ZdrojeDatPage() {
  return (
    <LegalPage
      eyebrow="Transparentnost"
      title={<>Zdroje dat a <i>metodika</i></>}
      updated="Aktualizováno 10. 6. 2026"
    >
      <LegalSection n="01" title="Jak ocenění vzniká">
        <p>
          Po zadání parametrů vozu provede AI model (Anthropic Claude) živé webové vyhledávání,
          najde aktuální inzeráty srovnatelných vozů a z jejich cen odvodí doporučené cenové
          pásmo. Každý výsledek obsahuje odkazy na konkrétní inzeráty, ze kterých vychází —
          odhad si tedy můžete sami ověřit.
        </p>
        <p>
          U opakovaných dotazů na stejný typ vozu používáme navíc vlastní historické statistiky
          (mediány z dřívějších ocenění) jako kontrolu věrohodnosti — odhad je díky tomu odolnější
          vůči náhodným výkyvům nabídky.
        </p>
      </LegalSection>

      <LegalSection n="02" title="Jak s daty nakládáme">
        <p>
          <strong className="text-ink">Data získáváme prostřednictvím vyhledávací infrastruktury
          Anthropic. Neukládáme kopie inzerátů ani nebudujeme katalog cizích nabídek — uchováváme
          pouze vlastní odvozené statistiky (průměry, mediány, cenová pásma) a krátkodobou
          technickou cache výsledků, která se automaticky maže po 14 dnech.</strong>
        </p>
        <p>
          Z každého inzerátu přebíráme jen minimum faktických údajů nutných pro cenové srovnání:
          portál, odkaz, cenu a krátký titulek vozu. Osobní údaje prodejců (jména, telefony,
          e-maily) nezpracováváme — model je má zakázáno extrahovat a server je navíc filtruje.
        </p>
      </LegalSection>

      <LegalSection n="03" title="Prohledávané portály">
        <p>České srovnání: Sauto.cz, TipCars.cz, AutoScout24.cz.</p>
        <p>
          Mezinárodní srovnání navíc: mobile.de a AutoScout24.de (Německo), otomoto.pl (Polsko),
          lacentrale.fr (Francie), willhaben.at (Rakousko).
        </p>
        <p>
          Odkazy na inzeráty vedou vždy na původní stránku portálu — návštěvnost a kontakt
          na prodejce zůstávají portálům.
        </p>
      </LegalSection>

      <LegalSection n="04" title="Respekt k právům pořizovatelů databází">
        <p>
          Inzertní databáze požívají ochrany zvláštního práva pořizovatele databáze (směrnice
          96/9/ES, § 88 a násl. autorského zákona). Naše opatření:
        </p>
        <ul>
          <li>žádný plošný scraping — pouze cílené vyhledání několika srovnatelných inzerátů pro konkrétní dotaz uživatele,</li>
          <li>krátkodobá cache (max. 14 dní) místo trvalého ukládání,</li>
          <li>dlouhodobě uchováváme jen vlastní vypočtené agregáty, nikdy obsah inzerátů,</li>
          <li>denní limit počtu ocenění na uživatele proti hromadné extrakci,</li>
          <li>viditelná atribuce a odkazy na původní inzeráty.</li>
        </ul>
      </LegalSection>

      <LegalSection n="05" title="Omezení a přesnost">
        <p>
          Odhad je informativní — vychází z nabídkových cen (ne z realizovaných prodejů) a z dat
          dostupných v okamžiku dotazu. Skutečná prodejní cena se může lišit podle stavu vozu,
          regionu a vyjednávání. Proto vždy uvádíme pásmo min–max, nikoli jediné číslo.
        </p>
      </LegalSection>

      <LegalSection n="06" title="Kontakt pro provozovatele portálů">
        <p>
          Jste-li provozovatelem inzertního portálu a máte k našemu nakládání s daty dotaz nebo
          námitku, napište nám na{' '}
          <a className="cargent-link text-ink" href="mailto:hello@cargent.cz">hello@cargent.cz</a>.
          Ozveme se nejpozději do 5 pracovních dnů.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
