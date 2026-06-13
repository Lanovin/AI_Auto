/**
 * Content registry — jediný zdroj pravdy pro editovatelné texty landing page.
 *
 * Každý klíč má VÝCHOZÍ text (fallback, když v DB není override) a metadata
 * pro admin CMS (skupina + popisek pole). Komponenty čtou text přes
 * `getSiteContent()` (server), který výchozí hodnoty slévá s override z DB.
 *
 * Formátování v textu (viz <RichText>):
 *   • nový řádek (Enter)  → zalomení řádku
 *   • _text_              → barevný akcent (modrá)
 */

export interface ContentField {
  /** Výchozí text zobrazený, dokud ho admin nepřepíše. */
  default: string;
  /** Skupina pro řazení v admin CMS (sekce landing page). */
  group: string;
  /** Lidský popisek pole v admin CMS. */
  label: string;
  /** Víceřádkové pole v editoru (delší odstavce). */
  multiline?: boolean;
}

export const CONTENT_REGISTRY = {
  // ── Hero ────────────────────────────────────────────────────────────────
  'hero.eyebrow': {
    default: 'Řízeno daty',
    group: 'Hero (úvodní blok)',
    label: 'Nadřazený popisek',
  },
  'hero.title': {
    default: 'Tržní cena vašeho auta.\n_Podložená daty._',
    group: 'Hero (úvodní blok)',
    label: 'Hlavní nadpis',
    multiline: true,
  },
  'hero.subtitle': {
    default:
      'Cargent projde aktuální inzeráty, zohlední výbavu i stav vozu a vrátí reálné tržní pásmo s odkazy na srovnatelné nabídky — ne jen tip od oka.',
    group: 'Hero (úvodní blok)',
    label: 'Podnadpis',
    multiline: true,
  },
  'hero.cta_primary': {
    default: 'Ocenit vůz zdarma',
    group: 'Hero (úvodní blok)',
    label: 'Hlavní tlačítko',
  },
  'hero.cta_secondary': {
    default: 'Jak to funguje',
    group: 'Hero (úvodní blok)',
    label: 'Vedlejší tlačítko',
  },
  'hero.microcopy': {
    default: 'Bez registrace · Výsledek do 30 sekund · Neukládáme osobní data',
    group: 'Hero (úvodní blok)',
    label: 'Drobný text pod tlačítky',
  },
  // Pozn.: čísla musí odpovídat realitě (nekalé obchodní praktiky) — žádné
  // smyšlené metriky. Skutečnost: živý web search nad až 8 portály na sken.
  'hero.metric.0.value': { default: 'Až 8', group: 'Hero (úvodní blok)', label: 'Metrika 1 — číslo' },
  'hero.metric.0.label': { default: 'Portálů v jednom skenu', group: 'Hero (úvodní blok)', label: 'Metrika 1 — popisek' },
  'hero.metric.1.value': { default: '30 s', group: 'Hero (úvodní blok)', label: 'Metrika 2 — číslo' },
  'hero.metric.1.label': { default: 'Rychlý odhad ceny', group: 'Hero (úvodní blok)', label: 'Metrika 2 — popisek' },
  'hero.metric.2.value': { default: 'Živá data', group: 'Hero (úvodní blok)', label: 'Metrika 3 — číslo' },
  'hero.metric.2.label': { default: 'Z aktuálních inzerátů', group: 'Hero (úvodní blok)', label: 'Metrika 3 — popisek' },

  // ── Trust strip ─────────────────────────────────────────────────────────
  'trust.0.stat': { default: 'Až 8', group: 'Pruh důvěry', label: 'Položka 1 — číslo' },
  'trust.0.label': { default: 'inzertních portálů najednou', group: 'Pruh důvěry', label: 'Položka 1 — popisek' },
  'trust.1.stat': { default: 'min–max', group: 'Pruh důvěry', label: 'Položka 2 — číslo' },
  'trust.1.label': { default: 'cenové pásmo u každého odhadu', group: 'Pruh důvěry', label: 'Položka 2 — popisek' },
  'trust.2.stat': { default: '30 s', group: 'Pruh důvěry', label: 'Položka 3 — číslo' },
  'trust.2.label': { default: 'a máte rychlý odhad', group: 'Pruh důvěry', label: 'Položka 3 — popisek' },
  'trust.3.stat': { default: 'Živá data', group: 'Pruh důvěry', label: 'Položka 4 — číslo' },
  'trust.3.label': { default: 'žádná zastaralá databáze', group: 'Pruh důvěry', label: 'Položka 4 — popisek' },

  // ── Přehled platformy (Features) ────────────────────────────────────────
  'features.eyebrow': { default: 'Co Cargent umí', group: 'Přehled platformy', label: 'Nadřazený popisek' },
  'features.title': {
    default: 'Vše pro _přesné ocenění_\nna jednom místě.',
    group: 'Přehled platformy',
    label: 'Nadpis sekce',
    multiline: true,
  },
  'features.0.title': { default: 'Živý průzkum trhu', group: 'Přehled platformy', label: 'Funkce 1 — nadpis' },
  'features.0.body': {
    default: 'Každý odhad vychází z aktuálních inzerátů v okamžiku dotazu — žádná zastaralá databáze.',
    group: 'Přehled platformy', label: 'Funkce 1 — text', multiline: true,
  },
  'features.1.title': { default: 'Cenové pásmo min–max', group: 'Přehled platformy', label: 'Funkce 2 — nadpis' },
  'features.1.body': {
    default: 'Dolní i horní mez ceny, ne jediné číslo. Víte, kde je prostor pro vyjednávání.',
    group: 'Přehled platformy', label: 'Funkce 2 — text', multiline: true,
  },
  'features.2.title': { default: 'Až 8 portálů najednou', group: 'Přehled platformy', label: 'Funkce 3 — nadpis' },
  'features.2.body': {
    default: 'Sauto.cz, TipCars a AutoScout24 — při mezinárodním srovnání i mobile.de, otomoto.pl a další.',
    group: 'Přehled platformy', label: 'Funkce 3 — text', multiline: true,
  },
  'features.3.title': { default: 'Doložitelné zdroje', group: 'Přehled platformy', label: 'Funkce 4 — nadpis' },
  'features.3.body': {
    default: 'Ke každému odhadu dostanete odkazy na konkrétní srovnatelné inzeráty. Cenu si ověříte sami.',
    group: 'Přehled platformy', label: 'Funkce 4 — text', multiline: true,
  },
  'features.4.title': { default: 'Historie vozu v ceně', group: 'Přehled platformy', label: 'Funkce 5 — nadpis' },
  'features.4.body': {
    default: 'Nájezd, počet majitelů, servisní historie i nehodovost se promítají přímo do odhadu.',
    group: 'Přehled platformy', label: 'Funkce 5 — text', multiline: true,
  },
  'features.5.title': { default: 'Výsledek do 30 sekund', group: 'Přehled platformy', label: 'Funkce 6 — nadpis' },
  'features.5.body': {
    default: 'Rychlý odhad bez registrace a bez kreditky. Detailní analýzu spustíte jedním klikem.',
    group: 'Přehled platformy', label: 'Funkce 6 — text', multiline: true,
  },

  // ── Jak to funguje ──────────────────────────────────────────────────────
  'how.eyebrow': { default: '— Jak to funguje', group: 'Jak to funguje', label: 'Nadřazený popisek' },
  'how.title': {
    default: 'Tři kroky k _reálné ceně._',
    group: 'Jak to funguje',
    label: 'Nadpis sekce',
  },
  'how.step.0.title': { default: 'Zadáte auto', group: 'Jak to funguje', label: 'Krok 1 — nadpis' },
  'how.step.0.body': {
    default: 'Stačí značka, model, rok výroby a kolik má najeto. Hotovo za minutu, bez registrace.',
    group: 'Jak to funguje',
    label: 'Krok 1 — text',
    multiline: true,
  },
  'how.step.1.title': { default: 'Prohledáme trh', group: 'Jak to funguje', label: 'Krok 2 — nadpis' },
  'how.step.1.body': {
    default: 'Prohledáme přední české i zahraniční inzertní portály a vybereme srovnatelné vozy s aktuálními cenami. Data jsou vždy čerstvá.',
    group: 'Jak to funguje',
    label: 'Krok 2 — text',
    multiline: true,
  },
  'how.step.2.title': { default: 'Dostanete cenu', group: 'Jak to funguje', label: 'Krok 3 — nadpis' },
  'how.step.2.body': {
    default: 'Ukážeme, za kolik se prodávají srovnatelná auta a co konkrétně ovlivňuje cenu toho vašeho.',
    group: 'Jak to funguje',
    label: 'Krok 3 — text',
    multiline: true,
  },

  // ── Proč věřit ceně (Engine) ────────────────────────────────────────────
  'engine.eyebrow': { default: 'Proč věřit naší ceně', group: 'Proč věřit ceně', label: 'Nadřazený popisek' },
  'engine.title': {
    default: 'Čísla, která\n_něco znamenají._',
    group: 'Proč věřit ceně',
    label: 'Nadpis sekce',
    multiline: true,
  },
  'engine.reason.0.stat': { default: 'Živá data', group: 'Proč věřit ceně', label: 'Důvod 1 — číslo' },
  'engine.reason.0.title': { default: 'Aktuální inzeráty, ne archiv', group: 'Proč věřit ceně', label: 'Důvod 1 — nadpis' },
  'engine.reason.0.body': {
    default: 'Každé ocenění vychází z čerstvého průzkumu trhu v okamžiku dotazu. Porovnáváme skutečné aktuální nabídky, ne měsíce staré ceníky.',
    group: 'Proč věřit ceně', label: 'Důvod 1 — text', multiline: true,
  },
  'engine.reason.1.stat': { default: 'min–max', group: 'Proč věřit ceně', label: 'Důvod 2 — číslo' },
  'engine.reason.1.title': { default: 'Cenové pásmo s doložitelnými zdroji', group: 'Proč věřit ceně', label: 'Důvod 2 — nadpis' },
  'engine.reason.1.body': {
    default: 'Ke každému odhadu dostanete dolní i horní mez a odkazy na konkrétní inzeráty, ze kterých cena vychází. Můžete si ji ověřit sami.',
    group: 'Proč věřit ceně', label: 'Důvod 2 — text', multiline: true,
  },
  'engine.reason.2.stat': { default: 'Až 8', group: 'Proč věřit ceně', label: 'Důvod 3 — číslo' },
  'engine.reason.2.title': { default: 'Portálů dat najednou', group: 'Proč věřit ceně', label: 'Důvod 3 — nadpis' },
  'engine.reason.2.body': {
    default: 'Sauto.cz, TipCars.cz a AutoScout24 — při mezinárodním srovnání i mobile.de, otomoto.pl, willhaben.at či lacentrale.fr.',
    group: 'Proč věřit ceně', label: 'Důvod 3 — text', multiline: true,
  },
  'engine.reason.3.stat': { default: 'Historie', group: 'Proč věřit ceně', label: 'Důvod 4 — číslo' },
  'engine.reason.3.title': { default: 'Zohledňujeme historii vozu', group: 'Proč věřit ceně', label: 'Důvod 4 — nadpis' },
  'engine.reason.3.body': {
    default: 'Do ceny promítáme nájezd, počet majitelů, servisní historii i nehodovost, které zadáte — a doporučíme ověření přes VIN.',
    group: 'Proč věřit ceně', label: 'Důvod 4 — text', multiline: true,
  },
  'engine.table_caption': { default: 'Srovnatelné vozy v analýze', group: 'Proč věřit ceně', label: 'Popisek tabulky' },

  // ── Závěrečná výzva (CTA) ───────────────────────────────────────────────
  'cta.eyebrow': { default: '— Začněte zdarma', group: 'Závěrečná výzva', label: 'Nadřazený popisek' },
  'cta.title': {
    default: 'Kolik vaše auto\n_skutečně stojí?_',
    group: 'Závěrečná výzva',
    label: 'Nadpis',
    multiline: true,
  },
  'cta.subtitle': {
    default: 'Zadejte auto a do 30 sekund uvidíte výsledek. Zdarma, bez registrace, bez kreditky.',
    group: 'Závěrečná výzva',
    label: 'Podnadpis',
    multiline: true,
  },
  'cta.button': { default: 'Ocenit vůz zdarma', group: 'Závěrečná výzva', label: 'Tlačítko' },
  'cta.microcopy': { default: 'Neukládáme osobní data · Výsledek ihned', group: 'Závěrečná výzva', label: 'Drobný text' },

  // ── Patička ─────────────────────────────────────────────────────────────
  'footer.tagline': {
    default:
      'AI oceňovací agent pro český trh ojetých vozů. Reálná tržní cena s intervalem spolehlivosti, ne jen tip od oka.',
    group: 'Patička',
    label: 'Popis značky',
    multiline: true,
  },
  'footer.copyright': {
    default: '© 2026 Cargent — AI oceňovací agent pro ojeté vozy.',
    group: 'Patička',
    label: 'Copyright',
  },
} satisfies Record<string, ContentField>;

export type ContentKey = keyof typeof CONTENT_REGISTRY;

/** Mapa klíč → výchozí text (pro slévání s override z DB). */
export const CONTENT_DEFAULTS: Record<string, string> = Object.fromEntries(
  Object.entries(CONTENT_REGISTRY).map(([k, v]) => [k, v.default])
);

/** Skupiny v pořadí, ve kterém se mají zobrazit v admin CMS. */
export const CONTENT_GROUPS: string[] = [...new Set(
  Object.values(CONTENT_REGISTRY).map((f) => f.group)
)];
