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
      updated="Aktualizováno 5. 10. 2026"
    >
      <LegalSection n="01" title="Jak ocenění vzniká">
        <p>
          Postupujeme jako zkušený výkupčí. Na Sauto.cz vyhledáme ojeté vozy se stejnou
          značkou a modelem, podobným rokem a nájezdem, stejným palivem a převodovkou (a když
          výkon znáte, i s podobným výkonem). Pokud je srovnatelných vozů málo, filtry postupně
          rozšíříme.
        </p>
        <p>
          Cenu každého nalezeného vozu přepočteme na rok a nájezd oceňovaného vozu, vyřadíme
          odlehlé hodnoty a z mediánu a kvartilů vznikne cenové pásmo. AI model (Anthropic
          Claude) pak konkrétní vůz zařadí do pásma podle výbavy, stavu a historie oproti
          nejpodobnějším vozům. U vzácných modelů a při mezinárodním srovnání model navíc
          prohledá web. Každý výsledek obsahuje odkazy na srovnávané inzeráty a odkaz na
          stejné hledání na Sauto.cz, takže si odhad můžete sami ověřit.
        </p>
        <p>
          U opakovaných dotazů na stejný typ vozu používáme navíc vlastní historické statistiky
          (mediány z dřívějších ocenění) jako kontrolu věrohodnosti — odhad je díky tomu odolnější
          vůči náhodným výkyvům nabídky.
        </p>
      </LegalSection>

      <LegalSection n="02" title="Jak s daty nakládáme">
        <p>
          <strong className="text-ink">Nabídku Sauto.cz čteme několika cílenými dotazy na
          každé ocenění, stejně jako při ručním hledání na webu, a pod vlastní identifikací
          (User-Agent Cargent). Ostatní portály prohledáváme přes vyhledávací infrastrukturu
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
