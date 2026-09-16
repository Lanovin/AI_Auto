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
 *
 * Pozn.: čísla a tvrzení musí odpovídat realitě (nekalé obchodní praktiky) —
 * žádné smyšlené metriky. Skutečnost: živý web search nad inzertními portály,
 * výsledná cena = vážený medián nalezených inzerátů s odkazy na zdroje.
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
    default: 'Ocenění ojetého vozu z reálných inzerátů',
    group: 'Hero (úvodní blok)',
    label: 'Nadřazený popisek',
  },
  'hero.title': {
    default: 'Kolik vaše auto stojí\n_na dnešním trhu._',
    group: 'Hero (úvodní blok)',
    label: 'Hlavní nadpis',
    multiline: true,
  },
  'hero.subtitle': {
    default:
      'Zadáte auto, Cargent prohledá aktuální inzeráty a vrátí tržní cenu s pásmem a odkazy na srovnatelné nabídky. Žádná stará databáze — čerstvá data v okamžiku dotazu.',
    group: 'Hero (úvodní blok)',
    label: 'Podnadpis',
    multiline: true,
  },
  'hero.cta_primary': {
    default: 'Ocenit vůz',
    group: 'Hero (úvodní blok)',
    label: 'Hlavní tlačítko',
  },
  'hero.cta_secondary': {
    default: 'Jak to funguje',
    group: 'Hero (úvodní blok)',
    label: 'Vedlejší tlačítko',
  },
  'hero.microcopy': {
    default: 'Registrace zdarma · výsledek do pár minut · odkazy na zdroje u každé ceny',
    group: 'Hero (úvodní blok)',
    label: 'Drobný text pod tlačítky',
  },
  'hero.flow.0': { default: 'Zadáte údaje o voze', group: 'Hero (úvodní blok)', label: 'Animace — krok 1' },
  'hero.flow.1': { default: 'AI prohledá inzeráty', group: 'Hero (úvodní blok)', label: 'Animace — krok 2' },
  'hero.flow.2': { default: 'Dostanete tržní cenu', group: 'Hero (úvodní blok)', label: 'Animace — krok 3' },

  // ── Přehled platformy (Features) ────────────────────────────────────────
  'features.eyebrow': { default: 'Co Cargent umí', group: 'Přehled platformy', label: 'Nadřazený popisek' },
  'features.title': {
    default: 'Vše pro _přesné ocenění_\nna jednom místě.',
    group: 'Přehled platformy',
    label: 'Nadpis sekce',
    multiline: true,
  },
  'features.intro': {
    default:
      'Cena nevzniká odhadem od stolu. Vzniká z toho, za kolik se srovnatelná auta právě teď nabízejí — a vy vidíte, ze kterých inzerátů vychází.',
    group: 'Přehled platformy',
    label: 'Úvodní odstavec',
    multiline: true,
  },
  'features.list.0.title': { default: 'Živý průzkum trhu', group: 'Přehled platformy', label: 'Funkce 1 — nadpis' },
  'features.list.0.body': {
    default: 'Každé ocenění prohledá inzeráty v okamžiku dotazu. Žádná databáze stará měsíce.',
    group: 'Přehled platformy', label: 'Funkce 1 — text', multiline: true,
  },
  'features.list.1.title': { default: 'Cena jako pásmo, ne jedno číslo', group: 'Přehled platformy', label: 'Funkce 2 — nadpis' },
  'features.list.1.body': {
    default: 'Dostanete doporučenou cenu i dolní a horní mez. Víte, kde je prostor pro vyjednávání a kde už ne.',
    group: 'Přehled platformy', label: 'Funkce 2 — text', multiline: true,
  },
  'features.list.2.title': { default: 'Výpočet, ne dojem', group: 'Přehled platformy', label: 'Funkce 3 — nadpis' },
  'features.list.2.body': {
    default: 'Každý nalezený inzerát přepočítáme na váš vůz (nájezd, stáří, převodovka), vyřadíme odlehlé a spočítáme vážený medián.',
    group: 'Přehled platformy', label: 'Funkce 3 — text', multiline: true,
  },
  'features.list.3.title': { default: 'Doložitelné zdroje', group: 'Přehled platformy', label: 'Funkce 4 — nadpis' },
  'features.list.3.body': {
    default: 'U každé ceny jsou odkazy na konkrétní inzeráty. Cenu si můžete ověřit sami, klik po kliku.',
    group: 'Přehled platformy', label: 'Funkce 4 — text', multiline: true,
  },
  'features.list.4.title': { default: 'Stav a výbava v ceně', group: 'Přehled platformy', label: 'Funkce 5 — nadpis' },
  'features.list.4.body': {
    default: 'Detailní a expertní úroveň zohlední servisní historii, nehodovost, výbavu i počet majitelů — a vyčíslí je v korunách.',
    group: 'Přehled platformy', label: 'Funkce 5 — text', multiline: true,
  },
  'features.list.5.title': { default: 'Výkupní i prodejní cena', group: 'Přehled platformy', label: 'Funkce 6 — nadpis' },
  'features.list.5.body': {
    default: 'Pro autobazary spočítáme i orientační výkupní cenu a doporučíme inzertní strategii.',
    group: 'Přehled platformy', label: 'Funkce 6 — text', multiline: true,
  },

  // ── Jak to funguje ──────────────────────────────────────────────────────
  'how.eyebrow': { default: 'Jak to funguje', group: 'Jak to funguje', label: 'Nadřazený popisek' },
  'how.title': {
    default: 'Tři kroky k _reálné ceně._',
    group: 'Jak to funguje',
    label: 'Nadpis sekce',
  },
  'how.step.0.title': { default: 'Zadáte auto', group: 'Jak to funguje', label: 'Krok 1 — nadpis' },
  'how.step.0.body': {
    default: 'Značka, model, rok a nájezd. Pro přesnější posudek doplníte stav, výbavu nebo VIN.',
    group: 'Jak to funguje',
    label: 'Krok 1 — text',
    multiline: true,
  },
  'how.step.1.title': { default: 'Prohledáme trh', group: 'Jak to funguje', label: 'Krok 2 — nadpis' },
  'how.step.1.body': {
    default: 'AI projde české inzertní portály (na přání i zahraniční) a vybere srovnatelné vozy s aktuálními cenami.',
    group: 'Jak to funguje',
    label: 'Krok 2 — text',
    multiline: true,
  },
  'how.step.2.title': { default: 'Dostanete cenu', group: 'Jak to funguje', label: 'Krok 3 — nadpis' },
  'how.step.2.body': {
    default: 'Tržní cenu s pásmem, seznam inzerátů, ze kterých vychází, a co konkrétně cenu vašeho vozu zvedá nebo sráží.',
    group: 'Jak to funguje',
    label: 'Krok 3 — text',
    multiline: true,
  },

  // ── Ceník na úvodní stránce ─────────────────────────────────────────────
  'pricing.eyebrow': { default: 'Ceník', group: 'Ceník (úvodní stránka)', label: 'Nadřazený popisek' },
  'pricing.title': {
    default: 'Platíte jen za ocenění,\n_která spustíte._',
    group: 'Ceník (úvodní stránka)',
    label: 'Nadpis sekce',
    multiline: true,
  },
  'pricing.subtitle': {
    default: 'Kredit kupujete v tokenech (1 token ≈ 5 Kč). Každá úroveň ocenění má pevnou cenu, tokeny nevyprší.',
    group: 'Ceník (úvodní stránka)',
    label: 'Podnadpis',
    multiline: true,
  },

  // ── Ukázka průběhu ─────────────────────────────────────────────────────
  'demo.eyebrow': { default: 'Ukázka průběhu', group: 'Ukázka průběhu', label: 'Nadřazený popisek' },
  'demo.title': {
    default: 'Takhle vypadá ocenění\n_od zadání po cenu._',
    group: 'Ukázka průběhu',
    label: 'Nadpis sekce',
    multiline: true,
  },
  'demo.note': {
    default: 'Ukázka je simulovaná a nespotřebuje žádný kredit. Skutečné ocenění trvá 1–3 minuty podle zvolené úrovně.',
    group: 'Ukázka průběhu',
    label: 'Poznámka pod ukázkou',
    multiline: true,
  },

  // ── Upoutávka po scrollu ────────────────────────────────────────────────
  'teaser.title': { default: 'Zjistěte, kolik vaše auto stojí.', group: 'Upoutávka po scrollu', label: 'Text' },
  'teaser.button': { default: 'Ocenit vůz', group: 'Upoutávka po scrollu', label: 'Tlačítko' },

  // ── Patička ─────────────────────────────────────────────────────────────
  'footer.tagline': {
    default:
      'Ocenění ojetých vozů z reálných inzerátů. Tržní cena s pásmem a odkazy na zdroje, ne jen tip od oka.',
    group: 'Patička',
    label: 'Popis značky',
    multiline: true,
  },
  'footer.copyright': {
    default: '© 2026 Cargent',
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
