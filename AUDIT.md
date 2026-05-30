# AUDIT.md

Audit projektu AutoAI k datu 2026-05-08.

Metoda:
- statická revize všech souborů v repozitáři
- cílené prohledání rizikových patternů (`alert`, `confirm`, `prompt`, `innerHTML`, `localStorage`, inline skripty/styly, error handling)
- syntaktická kontrola přes editor: bez nalezených syntax/lint chyb

Poznámka:
- audit je read-only; v této fázi nebylo nic opravováno
- neprováděl jsem reálné API volání proti Anthropic, protože v repu není testovací klíč a MVP má běžet v BYOK režimu

Shrnutí:
- 6x blocker
- 14x major
- 8x minor
- 6x nice-to-have

## 🔴 Blocker

### B1. Garáž může přepsat jiné auto se stejnou značkou, modelem a rokem
- Soubory: `shared.js:69-72`, `app.js:692-697`, `shared.js:410-421`
- Popis: `CarGarage.findMatch()` deduplikuje jen podle `brand + model + year`. Pokud má bazar dvě stejné Octavie 2020 s jiným nájezdem nebo historií, druhé auto se při autosavu/importe může napojit na stejné ID a přepsat data prvního. To je přímý rozpor s cílem „jedno auto, čtyři nástroje, žádné přepisování“.
- Návrh řešení: zavést formální schéma auta s vlastním `id`, nepoužívat implicitní deduplikaci bez potvrzení uživatele, případně deduplikovat až podle širšího fingerprintu (`brand/model/year/mileage/sourceUrl`) a vždy s možností „uložit jako nové auto“.
- Odhad: 4-6 h

### B2. Produkt slibuje automatické scany každých 3,5 dne, ale ve statice je nespouští na pozadí
- Soubory: `index.html:117-119`, `index.html:197`, `market-monitor.html:616`, `market-monitor.html:673-684`, `market-monitor.html:1493-1555`
- Popis: landing i monitoring tvrdí, že systém „automaticky skenuje trh každé 3,5 dne“ a „běží sám“. Ve skutečnosti se scan spustí jen při načtení stránky a jen pokud od posledního scanu uběhl interval. UI to dokonce explicitně potvrzuje textem „Při dalším načtení stránky“.
- Návrh řešení: pro MVP přepsat copy na poctivou verzi a změnit feature na připomínku + uložení času posledního scanu. Skutečný background scan přesunout do roadmapy s backendem.
- Odhad: 3-5 h

### B3. Fotografie v odhadu ceny jsou mrtvý feature
- Soubory: `ceny.html:376-385`, `style.css:396-485`, `app.js: n/a (žádný handler pro photoInput/photoUploadArea/FileReader/canvas)`
- Popis: UI nabízí upload fotek, preview grid i copy o analýze fotografií, ale v `app.js` není žádná obsluha výběru souborů, validace, komprese, thumbnail render, reorder ani posílání obrázků do API. Uživatel vidí hotový feature, který fakticky neexistuje.
- Návrh řešení: buď feature dočasně skrýt, nebo ho dotáhnout end-to-end včetně validace, komprese, preview, mazání, reorderu a multimodálního payloadu.
- Odhad: 6-10 h

### B4. Akce „Monitoring“ v kartě garáže na landing page je de facto mrtvé tlačítko
- Soubory: `index.html:244`, `app.js:127-135`, `popisky.js:117-124`, `market-monitor.html:1591-1651`
- Popis: `index.html` posílá uživatele na `market-monitor.html#garage=<id>`, ale monitoring ten hash nikde nenačítá. Naopak `ceny` a `popisky` deep-link z garáže podporují. Výsledek: jedna ze tří hlavních akcí z garáže nefunguje podle očekávání.
- Návrh řešení: doplnit do monitoringu stejný hash loader jako v `app.js` a `popisky.js`, nebo akci změnit na bezpečný flow přes picker/předvyplnění stavu.
- Odhad: 1-2 h

### B5. Komunikace o API klíči je rozporná a chybí cesta, jak klíč smazat
- Soubory: `README.md:51`, `ceny.html:66`, `popisky.html:79`, `market-monitor.html:484`, `app.js:106,510`, `profil.html:326,400,508`, `skaut.html:431,678`
- Popis: README, ceny a popisky tvrdí, že klíč „se nikam neukládá“ a zůstává jen v paměti. Monitoring a skaut naopak správně říkají, že se ukládá do prohlížeče. Kód skutečně používá `localStorage`, ale nikde neexistuje tlačítko „smazat klíč“ ani `localStorage.removeItem('anthropic_api_key')`. To je problém důvěry i bezpečnostní komunikace.
- Návrh řešení: sjednotit copy, přidat viditelnou správu klíče (zobrazit / skrýt / smazat), validaci formátu `sk-ant-...` a jasné vysvětlení BYOK modelu.
- Odhad: 2-4 h

### B6. Volání Anthropic API jsou křehká a nesplňují požadavek na robustní error handling
- Soubory: `app.js:401-419`, `popisky.js:230-248`, `skaut.html:518-536`, `market-monitor.html:920-947`, `market-monitor.html:1404-1433`, `profil.html:355-383`
- Popis: v repu je několik ručně psaných `fetch()` klientů, ale nikde není timeout, retry/backoff, parsování `retry-after`, rozlišení 401/429/529, síťových chyb ani debug log. V praxi se běžné produkční chyby projeví jako generická hláška nebo `alert()`, bez doporučení co dělat dál.
- Návrh řešení: sjednotit vše do jednoho `claudeClient.js`, přidat timeout přes `AbortController`, retry jen pro 429/5xx, mapované české chybové stavy, debug log a kontrolu vlastního token budgetu ještě před requestem.
- Odhad: 6-10 h

## 🟠 Major

### M1. Neexistuje jeden zdroj pravdy pro značky, modely a další enumy
- Soubory: `app.js:17-40`, `popisky.js:18-41`, `skaut.html:376-398`, `ceny.html:120-144`, `popisky.html:191-215`, `market-monitor.html:531-555`
- Popis: seznamy značek/modelů jsou duplikované v několika souborech a navíc nejsou stejné. Skaut má zkrácenou databázi, formuláře mají vlastní hard-coded `<option>` bloky. To zaručuje drift a nekonzistentní UX.
- Návrh řešení: přesunout data do `data/brands.js` a ostatní volby do sdíleného modulu/enums souboru.
- Odhad: 4-6 h

### M2. Architektura je silně duplikovaná a velká část logiky žije inline v HTML
- Soubory: `index.html:222`, `market-monitor.html:11,708`, `skaut.html:11,356`, `profil.html:11,283`, `popisky.html:11`
- Popis: navigace, footer, page-specific styly i logika jsou rozkopírované po stránkách. To zpomalí každou další změnu a téměř jistě bude produkovat regrese mezi nástroji.
- Návrh řešení: vytáhnout shared CSS do `assets/css`, JS do `assets/js/shared` a page entry-pointů, sjednotit nav/footer přes partials nebo jednoduchý build krok.
- Odhad: 6-12 h

### M3. Token budget není globální a dvě klíčové stránky se do něj vůbec nepočítají
- Soubory: `profil.html:381`, `skaut.html:688`, `market-monitor.html:953,1439`, `app.js: n/a`, `popisky.js: n/a`
- Popis: `TokenTracker.record()` se volá jen v monitoringu, skautu a importu profilu. Odhad ceny a generátor popisků spotřebu do globální evidence neposílají. Dashboard na `index.html` neexistuje.
- Návrh řešení: sjednotit recording pro všechny nástroje, přidat měsíční reset, varování nad 80 % a globální přehled na landing page.
- Odhad: 3-5 h

### M4. Chybí onboarding pro první návštěvu i pro stav „bez API klíče“
- Soubory: `index.html:35-43`, `ceny.html`, `popisky.html`, `market-monitor.html`, `skaut.html` (repo-wide absence)
- Popis: novému uživateli nikdo nevysvětlí první kroky. Neexistuje welcome modal, sekce „První kroky“, overlay bez klíče ani first-visit flag v `localStorage`.
- Návrh řešení: přidat onboarding sekci na landing page, prvonávštěvnický modal a blokující overlay na tool stránkách, pokud klíč chybí.
- Odhad: 4-6 h

### M5. Validace formulářů je mělká a nekonzistentní
- Soubory: `app.js:159-181`, `popisky.js:201-222`, `skaut.html:672-676`, `ceny.html:155,190,217,228`, `skaut.html:224-252,474-487`
- Popis: ceny/popisky kontrolují v JS jen pár povinných polí, skaut prakticky jen `budgetMax`. Chybí inline hlášky pod poli, validace při blur, pořadí `budgetMin <= budgetMax`, `yearFrom <= yearTo`, rozumné doménové limity pro km/výkon/spotřebu a validace API klíče ještě před requestem.
- Návrh řešení: zavést sdílenou validační vrstvu pro formuláře a jednotný způsob zobrazování chyb.
- Odhad: 4-6 h

### M6. UX je plné `alert()`, `confirm()` a `prompt()`
- Soubory: `app.js:80,564,590,597,666`, `market-monitor.html:802,1031,1050,1116,1155,1298,1305,1358,1622`, `profil.html:402,408,435,526`, `skaut.html:648,674,675`, `popisky.js:85`
- Popis: systémové dialogy blokují flow, jsou nekonzistentní mezi prohlížeči a na mobilu působí nehotově. U custom modelu se navíc používá `prompt()`, což je slabý UX i a11y.
- Návrh řešení: nahradit vše vlastním toast/inline/modal systémem a zrušit `prompt()` ve prospěch běžného inputu.
- Odhad: 3-5 h

### M7. Mobilní použitelnost je slabá i bez reálného testování
- Soubory: `style.css:1186-1194`, `market-monitor.html:377-383`
- Popis: pod 800 px se schová celá hlavní navigace kromě CTA „Začít“, takže mezi nástroji nejde pohodlně přecházet. Monitoring drží dva sloupce i na šířce 768 px, což je na menších tabletech a větších telefonech zbytečně natěsno.
- Návrh řešení: navrhnout mobilní menu, zpřísnit breakpointy, otestovat 360 px / 414 px / 768 px a upravit spacing formulářů.
- Odhad: 4-6 h

### M8. Přístupnost je rozpracovaná, ale ne dotažená
- Soubory: `style.css:253-258`, `style.css:1273-1283`, `index.html:238`, `market-monitor.html:1241`, `profil.html:259`, `repo-wide absence of prefers-reduced-motion`
- Popis: inputy mají labely, což je plus, ale fokus styly jsou jen pro input/select/textarea. Tlačítka a odkazy nemají explicitní `:focus-visible`, ikonová tlačítka spoléhají na symbol a `title`, chybí `aria-label` a nikde se nerespektuje `prefers-reduced-motion`.
- Návrh řešení: doplnit focus systém pro všechny interaktivní prvky, `aria-label` pro ikonová tlačítka a reduced-motion variantu animací.
- Odhad: 4-6 h

### M9. Vrstva pro výsledky je nedostatečná pro produkční použití
- Soubory: `app.js:436-493`, `skaut.html:548-580`, `ceny.html:442-444`, `popisky.html:411-415`, `skaut.html:340-343`, `skaut.html:698`
- Popis: markdown se renderuje domácím regex rendererem, ne přes `marked` + `DOMPurify`. Chybí streaming, export do PDF/Markdown, historie výsledků pro ceny/popisky a skaut ukládá jen poslední textový výstup ořezaný na 5000 znaků.
- Návrh řešení: vytvořit sdílený result renderer, použít bezpečné markdown knihovny, přidat exporty a per-tool historii.
- Odhad: 6-10 h

### M10. Landing page nemá empty state pro garáž
- Soubory: `index.html:144`, `index.html:225-231`
- Popis: pokud uživatel nemá žádná auta, sekce „Moje garáž“ se úplně schová. Nový uživatel tak nevidí, že garáž vůbec existuje, natož co do ní přidat.
- Návrh řešení: sekci zobrazovat vždy a při nulovém stavu rendrovat prázdnou kartu s CTA do odhadu ceny nebo profilu.
- Odhad: 1-2 h

### M11. Profil obsahuje demo-only části, ale UI je neodděluje od hotových funkcí
- Soubory: `profil.html:242`, `profil.html:259-261`, `profil.html:529-534`
- Popis: email centrum je ve skutečnosti jen preview + `mailto:` generátor a samo UI říká, že backend chybí. Jako roadmap/demo je to v pořádku, jako součást MVP to působí nedokončeně.
- Návrh řešení: pro MVP to explicitně označit jako demo / roadmap, nebo tuto část dočasně skrýt.
- Odhad: 1-2 h

### M12. Dokumentace a release podklady nejsou ve stavu předání klientovi
- Soubory: `README.md`, chybí `TESTING.md`, chybí `CHANGELOG.md`
- Popis: README popisuje hlavně původní odhadce ceny, obsahuje nepravdivé tvrzení o klíči a nepopisuje 4 nástroje, deploy na Vercel, FAQ, cenu Anthropic usage ani strukturu produktu. Chybí checklist k release a changelog.
- Návrh řešení: kompletně přepsat README, doplnit TESTING.md, CHANGELOG.md a deploy notes.
- Odhad: 4-8 h

### M13. V běžných chybových cestách zůstává `console.error`
- Soubory: `market-monitor.html:1097`, `market-monitor.html:1330`, `market-monitor.html:1379`
- Popis: monitoring při běžných fail scénářích zapisuje chyby do konzole. To je rozumné pro vývoj, ale neodpovídá cíli „žádný neošetřený console.error při běžném používání“.
- Návrh řešení: chyby posílat jen do debug loggeru za developer togglem, ne do standardní konzole v produkčním flow.
- Odhad: 0.5-1 h

### M14. API garáže neodpovídá tomu, co bude MVP potřebovat
- Soubory: `shared.js:12-138`
- Popis: dnešní `CarGarage` umí `getAll/get/save/remove/findMatch`, ale chybí formální schéma, verzování, migrace, `getById/list/update/getActive/setActive` i explicitní práce s aktivním autem.
- Návrh řešení: přepsat garáž jako samostatný storage modul se schema versioningem, JSDoc typedefem a explicitními CRUD operacemi.
- Odhad: 3-5 h

## 🟡 Minor

### m1. SEO a meta vrstva prakticky neexistuje
- Soubory: všechny HTML soubory v `<head>`, v rootu chybí `robots.txt`, `sitemap.xml`, favicon varianty, `apple-touch-icon`
- Popis: stránky mají jen základní `<title>`. Chybí `meta description`, OG tagy, canonical, schema.org a statické SEO soubory.
- Návrh řešení: doplnit metadata per page a přidat základní SEO assety.
- Odhad: 2-4 h

### m2. Landing copy je místy interně nekonzistentní
- Soubory: `index.html:73`, `index.html:107`, `index.html:218`
- Popis: landing říká „Tři specializované nástroje“, ale zobrazuje 5 karet. U popisků slibuje „3 styly“, ale stránka jich má 6. Footer stále uvádí rok 2025.
- Návrh řešení: copy sweep napříč landingem a footery.
- Odhad: 0.5-1.5 h

### m3. Profil stránka používá jiný jazykový standard než zbytek produktu
- Soubory: `profil.html:6`, `profil.html:195`, `profil.html:222`, `profil.html:269`, `profil.html:278`
- Popis: velká část copy je bez diakritiky a působí jako starší/prototypová vrstva. Vedle ostatních stránek je to viditelně nekonzistentní.
- Návrh řešení: sjednotit copy do spisovné češtiny a do stejného tónu jako zbytek produktu.
- Odhad: 1-2 h

### m4. Používá se nedefinovaný design token `--font-heading`
- Soubory: `market-monitor.html:436`, `profil.html:79`, `skaut.html:30`, `style.css:1268`
- Popis: root definuje `--font-display` a `--font-sans`, ale několik míst používá `var(--font-heading)`. To se pak tiše propadne na default a design je méně předvídatelný.
- Návrh řešení: sjednotit názvy tokenů a odstranit neexistující proměnnou.
- Odhad: 0.5 h

### m5. Kopírování výsledků nemá fallback ani error handling
- Soubory: `app.js:533-540`, `popisky.js:335-342`, `skaut.html:714-719`
- Popis: kód spoléhá jen na `navigator.clipboard.writeText()`. Když API selže nebo není dostupné, uživatel nedostane žádnou užitečnou zprávu a kopie se nepovede.
- Návrh řešení: přidat fallback přes dočasný textarea/select flow a toast pro success/fail.
- Odhad: 1-2 h

### m6. README je rozjetý proti reálným modelům v kódu
- Soubory: `README.md:3,24,72`, `app.js:244,265,294,332`, `shared.js:313-315`
- Popis: README zmiňuje `claude-opus-4-5`, zatímco runtime už pracuje hlavně s `claude-opus-4-6` a dalšími modely. To je matoucí pro klienta i pro vývoj.
- Návrh řešení: sladit README s reálným modelem a pricing/capability matrix.
- Odhad: 0.5 h

### m7. Karty garáže zatím neumí miniatury ani bohatší preview auta
- Soubory: `index.html:233-245`, `shared.js:80-90`
- Popis: brief počítá s miniaturou a bohatším přehledem auta. Současné schéma garáže neobsahuje fotku a landing vykresluje jen textové karty.
- Návrh řešení: po dotažení foto pipeline rozšířit schéma o cover image a doplnit preview komponentu.
- Odhad: 2-4 h

### m8. UI stále používá emoji v kontrolkách a CTA textech
- Soubory: `index.html:35`, `popisky.html:91-133`, `skaut.html:89`, `ceny.html:431`, `market-monitor.html:703`
- Popis: brief míří na střídmější české produktové copy bez emoji v UI textu. Současná verze používá emoji napříč badge, tlačítky i systémovými hláškami.
- Návrh řešení: nahradit emoji konzistentním ikonovým stylem nebo čistým textem.
- Odhad: 1-2 h

## 🟢 Nice-to-have

### N1. Export a import garáže jako JSON záloha
- Soubory: `shared.js`, `index.html`, `profil.html`
- Popis: pro klientské předání by se hodila jednoduchá možnost auta exportovat a znovu importovat.
- Návrh řešení: přidat tlačítka export/import a schema-aware parser.
- Odhad: 2-3 h

### N2. Build krok nebo partials pro společné HTML části
- Soubory: všechny HTML soubory
- Popis: po architektonickém úklidu se vyplatí malý build krok, který složí společnou navigaci/footer a udrží HTML stránky čisté.
- Návrh řešení: jednoduchý Node script nebo fetch-injection partials.
- Odhad: 2-4 h

### N3. Developer toggle s logem posledních requestů
- Soubory: budoucí `claudeClient.js`, `shared.js`, případně `profil.html`
- Popis: debug panel pro posledních N volání by výrazně zjednodušil support a audit tokenů.
- Návrh řešení: ukládat poslední requesty/response metadata do `localStorage` a zpřístupnit je pod dev togglem.
- Odhad: 2-4 h

### N4. Připomínky ke scanu přes browser notifications / service worker
- Soubory: `market-monitor.html`, nový SW soubor
- Popis: pokud zůstane MVP bez backendu, notifikace jsou rozumný kompromis mezi „nic“ a skutečným background scanningem.
- Návrh řešení: přidat opt-in připomínku s férovou copy, ne tvrzení o autonomním scanu.
- Odhad: 4-6 h

### N5. Export výsledků do PDF/Markdown a archiv výsledků napříč nástroji
- Soubory: `ceny.html`, `popisky.html`, `skaut.html`, nový result utility modul
- Popis: pro reálné používání bazarem by bylo užitečné archivovat výstupy a exportovat je mimo clipboard.
- Návrh řešení: přidat exportní utilitu a uloženou historii výstupů.
- Odhad: 4-6 h

### N6. JSDoc typedefy nebo `.d.ts` pro datové schéma auta a nastavení
- Soubory: `shared.js`, budoucí `types/autoai.d.ts`
- Popis: i ve vanilla JS projektu to výrazně pomůže IntelliSense, migracím a bezpečnosti refaktoringu.
- Návrh řešení: doplnit JSDoc typedefy nebo lehké `.d.ts` soubory bez přepisu projektu na TypeScript.
- Odhad: 1-2 h

## Doporučené pořadí oprav

1. Garáž a storage schema (`B1`, `B4`, `M14`)
2. Pravdivost produktu a copy kolem monitoringu/API klíče (`B2`, `B5`, `M11`, `m2`)
3. Sdílený Claude client + error handling (`B6`, `M3`, `M9`)
4. Odstranění mrtvých feature a onboarding (`B3`, `M4`, `M10`)
5. UX/UI sjednocení, validace, mobil, a11y (`M5`, `M6`, `M7`, `M8`)
6. Dokumentace, testy, SEO (`M12`, `m1`, `m6`)