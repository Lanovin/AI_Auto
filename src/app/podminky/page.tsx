import LegalPage, { LegalSection } from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Obchodní podmínky',
  description: 'Obchodní podmínky služby Cargent — AI ocenění vozů.',
};

/**
 * NÁVRH obchodních podmínek — před spuštěním do produkce nechat zkontrolovat
 * advokátem. Místa označená [DOPLNIT] vyplňte údaji provozovatele.
 */
export default function PodminkyPage() {
  return (
    <LegalPage eyebrow="Právní dokumenty" title="Obchodní podmínky" updated="Účinnost od 10. 6. 2026">
      <LegalSection n="01" title="Provozovatel a kontakt">
        <p>
          Službu Cargent (dále jen „služba") provozuje [DOPLNIT: jméno / název společnosti],
          IČO [DOPLNIT], se sídlem [DOPLNIT] (dále jen „provozovatel").
          Kontakt: <a className="cargent-link text-ink" href="mailto:hello@cargent.cz">hello@cargent.cz</a>.
        </p>
      </LegalSection>

      <LegalSection n="02" title="Co služba dělá">
        <p>
          Cargent poskytuje <strong className="text-ink">informativní odhad tržní ceny</strong> ojetých
          vozidel. Odhad vzniká automatizovanou analýzou aktuálních veřejných inzerátů pomocí
          AI modelu a je prezentován jako cenové pásmo (min–max) s odkazy na srovnatelné nabídky.
        </p>
        <p>
          Výstup služby <strong className="text-ink">není znaleckým posudkem</strong> ve smyslu zákona
          č. 254/2019 Sb., o znalcích, není oceněním pro úřední, soudní, daňové ani pojistné účely
          a není nabídkou odkupu vozidla. Slouží výhradně jako orientační podklad pro vlastní
          rozhodování uživatele.
        </p>
      </LegalSection>

      <LegalSection n="03" title="Účet, tokeny a platby">
        <p>
          Část funkcí je dostupná bez registrace, plné využití vyžaduje účet. Placené akce se
          hradí tokeny; aktuální ceník v tokenech je zobrazen přímo u jednotlivých nástrojů.
          Orientační hodnota: 1 token ≈ 5 Kč.
        </p>
        <p>
          Platby zpracovává Stripe. Tokeny se připisují po úspěšné platbě; u předplatných se
          bonusové tokeny připisují při každém zúčtovacím období. Zakoupené tokeny jsou vázány
          na účet a nejsou převoditelné na peníze ani na jiný účet.
        </p>
      </LegalSection>

      <LegalSection n="04" title="Odstoupení od smlouvy">
        <p>
          Provedením placeného ocenění uživatel výslovně žádá o dodání digitálního obsahu před
          uplynutím lhůty pro odstoupení a bere na vědomí, že tím podle § 1837 písm. l) občanského
          zákoníku ztrácí právo odstoupit od smlouvy ohledně tohoto obsahu. U nespotřebovaných
          tokenů lze o vrácení požádat e-mailem do 14 dnů od nákupu.
        </p>
      </LegalSection>

      <LegalSection n="05" title="Odpovědnost a záruky">
        <p>
          Odhady vycházejí z veřejně dostupných dat v okamžiku dotazu a z povahy věci nemohou být
          zaručeně přesné. Provozovatel neodpovídá za rozhodnutí učiněná na základě výstupů služby
          (zejména koupi či prodej vozidla za konkrétní cenu) ani za dostupnost a obsah inzerátů
          třetích stran, na které výstupy odkazují.
        </p>
        <p>
          Ceny v inzerátech se mohou kdykoli změnit; cenové pásmo je proto vždy nutné chápat jako
          orientační rozsah, nikoli jako garantovanou hodnotu.
        </p>
      </LegalSection>

      <LegalSection n="06" title="Zákaz zneužití služby">
        <p>Uživatel se zavazuje, že nebude:</p>
        <ul>
          <li>používat službu k automatizované, systematické či hromadné extrakci dat (scraping výstupů, hromadné dotazy, roboti),</li>
          <li>obcházet denní limity počtu ocenění ani jiná technická omezení,</li>
          <li>dále prodávat, publikovat či licencovat výstupy služby jako vlastní datový produkt,</li>
          <li>sdílet účet či přístupové údaje třetím osobám za účelem obcházení zpoplatnění.</li>
        </ul>
        <p>
          Porušení tohoto článku je důvodem k okamžitému omezení nebo zrušení účtu bez náhrady
          nespotřebovaných tokenů.
        </p>
      </LegalSection>

      <LegalSection n="07" title="Duševní vlastnictví">
        <p>
          Texty, design a software služby jsou chráněny autorským právem provozovatele. Výstup
          ocenění smí uživatel využívat pro vlastní potřebu (včetně podnikatelské — např. ocenění
          vozů vlastního autobazaru); nesmí jej však hromadně publikovat jako náhradu služby.
        </p>
      </LegalSection>

      <LegalSection n="08" title="Změny podmínek a rozhodné právo">
        <p>
          Provozovatel může podmínky přiměřeně měnit; změna bude oznámena na webu a u podstatných
          změn e-mailem registrovaným uživatelům. Právní vztahy se řídí právem České republiky.
          K mimosoudnímu řešení spotřebitelských sporů je příslušná Česká obchodní inspekce
          (www.coi.cz).
        </p>
      </LegalSection>
    </LegalPage>
  );
}
