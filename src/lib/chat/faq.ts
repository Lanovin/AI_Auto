/**
 * Předpřipravené odpovědi Davida (pomocník v pravém dolním rohu).
 *
 * Tyhle otázky tvoří ~80 % dotazů návštěvníků. Odpovídají se OKAMŽITĚ
 * z tohoto souboru — bez volání AI, bez nákladu. Teprve když se uživatel
 * zeptá na něco jiného, jde dotaz na `/api/chat` (Claude Haiku).
 *
 * Modul je čistý (typy + data + funkce nad fakty) — jde importovat
 * v klientské komponentě i na serveru. Čísla nikdy nepiš natvrdo:
 * ber je z `ChatFacts`, které server plní z živého ceníku.
 */

// ── Fakta, která server posílá klientovi při otevření chatu ───────────────
export interface ChatTierFact {
  key: string;
  label: string;
  tagline: string;
  cost: number;
  czk: number;
  durationSec: number;
  includes: string[];
}

export interface ChatPackageFact {
  label: string;
  tokens: number;
  czk: number;
  perToken: number;
}

export interface ChatFacts {
  tiers: ChatTierFact[];
  dealerTools: { label: string; cost: number; czk: number }[];
  packages: ChatPackageFact[];
  subscription: { label: string; tokens: number; czk: number } | null;
  tokenValueCzk: number;
  dailyScanLimit: number;
  contactEmail: string;
  /** Jsou platby reálně zapnuté? Když ne, David neposílá lidi do checkoutu. */
  paymentsReady: boolean;
}

export interface FaqItem {
  id: string;
  /** Text na tlačítku v chatu. */
  question: string;
  /** Klíčová slova pro lokální rozpoznání dotazu (bez diakritiky, malá písmena). */
  keywords: string[];
  answer: (f: ChatFacts) => string;
  /** Odkaz nabídnutý pod odpovědí. */
  link?: { href: string; label: string };
}

const czk = (n: number) => n.toLocaleString('cs-CZ') + ' Kč';
const dur = (s: number) => (s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);

export const FAQ: FaqItem[] = [
  {
    id: 'how',
    question: 'Jak ocenění funguje?',
    keywords: ['jak to funguje', 'jak funguje', 'jak ocenujete', 'princip', 'jak vznika cena', 'metodika', 'jak pocitate'],
    answer: () =>
      'Zadáte značku, model, rok a nájezd. AI pak prohledá aktuální inzeráty na českých portálech (Sauto, TipCars, AutoScout24 a další) a najde srovnatelné vozy.\n\n' +
      'Každý nalezený inzerát přepočítáme na váš vůz — korekce na nájezd, stáří a převodovku — odlehlé ceny vyřadíme a z ostatních spočítáme vážený medián. To je vaše tržní cena.\n\n' +
      'U výsledku vždy uvidíte inzeráty, ze kterých cena vychází, takže si ji můžete ověřit sami.',
    link: { href: '/odhad-ceny', label: 'Ocenit vůz' },
  },
  {
    id: 'price',
    question: 'Kolik to stojí?',
    keywords: ['kolik to stoji', 'cenik', 'kolik stoji', 'kolik platim', 'zdarma', 'zadarmo', 'cena sluzby', 'kolik za oceneni'],
    answer: (f) =>
      `Platíte za jednotlivá ocenění, ne měsíční paušál. Kredit kupujete v tokenech (1 token ≈ ${f.tokenValueCzk} Kč).\n\n` +
      f.tiers.map((t) => `· ${t.label} — ${t.cost} tok. (≈ ${czk(t.czk)}), ${t.tagline.toLowerCase()}`).join('\n') +
      (f.packages.length
        ? `\n\nTokeny se kupují v balíčcích od ${czk(f.packages[0].czk)} (${f.packages[0].tokens} tokenů) do ${czk(f.packages[f.packages.length - 1].czk)} (${f.packages[f.packages.length - 1].tokens.toLocaleString('cs-CZ')} tokenů). Větší balíček znamená levnější token a tokeny nevyprší.`
        : ''),
    link: { href: '/cenik', label: 'Celý ceník' },
  },
  {
    id: 'tiers',
    question: 'Jaký je rozdíl mezi úrovněmi?',
    keywords: ['rozdil mezi', 'urovn', 'ktery zvolit', 'kterou zvolit', 'expertni', 'detailni', 'standardni', 'co dostanu', 'vyplati se'],
    answer: (f) =>
      'Liší se hloubkou rozboru a počtem inzerátů, ze kterých cena vychází:\n\n' +
      f.tiers
        .map((t) => `${t.label} (${t.cost} tok., ~${dur(t.durationSec)})\n${t.includes.map((i) => `  · ${i}`).join('\n')}`)
        .join('\n\n') +
      '\n\nNa běžný prodej nebo koupi bohatě stačí Standardní. Detailní a Expertní dávají smysl, když chcete zohlednit stav, výbavu a servisní historii.',
    link: { href: '/cenik', label: 'Porovnat úrovně' },
  },
  {
    id: 'accuracy',
    question: 'Jak je odhad přesný?',
    keywords: ['presn', 'spolehliv', 'verohodn', 'muzu verit', 'garantujete', 'odchylka', 'sedi to', 'je to dobre'],
    answer: () =>
      'Cena vychází z nabídkových cen reálných inzerátů, které jsou v nabídce právě teď — ne z odhadu od stolu a ne ze staré databáze.\n\n' +
      'Proto vám nikdy nedáme jedno číslo, ale pásmo min–max a u výsledku i spolehlivost výpočtu v procentech. Ta roste s počtem a podobností nalezených inzerátů.\n\n' +
      'Upřímně: skutečná prodejní cena se může lišit podle stavu vozu, regionu a vyjednávání. Odhad je informativní podklad, ne znalecký posudek se soudní platností.',
    link: { href: '/zdroje-dat', label: 'Metodika a zdroje' },
  },
  {
    id: 'account',
    question: 'Musím se registrovat?',
    keywords: ['registrac', 'registrovat', 'ucet', 'prihlaseni', 'prihlasit', 'google', 'bez uctu'],
    answer: () =>
      'Ano, ocenění vyžaduje účet — kredit se váže k němu. Registrace je zdarma a trvá chvilku, přihlásit se můžete e-mailem nebo přes Google.\n\n' +
      'Samotné založení účtu nic nestojí a nic se neúčtuje automaticky. Platíte až za ocenění, která si sami spustíte.',
    link: { href: '/registrace', label: 'Založit účet' },
  },
  {
    id: 'failed',
    question: 'Co když ocenění selže?',
    keywords: ['selze', 'selhal', 'nepovede', 'nepovedlo', 'chyba', 'nefunguje', 'spadlo', 'vraceni', 'vrati', 'refund', 'penize zpet', 'timeout', 'prerusi'],
    answer: () =>
      'Tokeny se odečítají před spuštěním, ale když ocenění selže nebo se přeruší, automaticky se vám vrátí zpět na účet. Platíte jen za dokončené ocenění.\n\n' +
      'Pokud by se tokeny přesto nevrátily, napište nám a srovnáme to ručně.',
    link: { href: '/kontakt', label: 'Napsat nám' },
  },
  {
    id: 'expiry',
    question: 'Vyprší mi tokeny?',
    keywords: ['vyprsi', 'expiruj', 'platnost token', 'propadn', 'zustanou'],
    answer: () =>
      'Ne. Jednorázově koupené tokeny zůstávají na účtu, dokud je nevyčerpáte. Žádná expirace, žádné měsíční propadání.',
    link: { href: '/cenik', label: 'Balíčky tokenů' },
  },
  {
    id: 'dealer',
    question: 'Co nabízíte autobazarům?',
    keywords: ['autobazar', 'bazar', 'firemni', 'b2b', 'pro firmy', 'vykup'],
    answer: (f) =>
      'Pro autobazary počítáme u ocenění navíc orientační výkupní cenu a doporučenou inzertní strategii.\n\n' +
      'K firemnímu účtu patří i další nástroje' +
      (f.dealerTools.length
        ? ':\n\n' + f.dealerTools.map((t) => `· ${t.label} — ${t.cost} tok. (≈ ${czk(t.czk)})`).join('\n')
        : '.') +
      '\n\nVšechno čerpá ze stejného kreditu. Při větším objemu nám napište, připravíme podmínky na míru.',
    link: { href: '/registrace?type=dealer', label: 'Firemní účet' },
  },
  {
    id: 'data',
    question: 'Odkud berete data?',
    keywords: ['odkud berete', 'odkud data', 'zdroje', 'portal', 'scrapujete', 'legaln', 'gdpr', 'osobni udaje'],
    answer: () =>
      'Z veřejných inzerátů na předních portálech — Sauto.cz, TipCars.cz, AutoScout24.cz. Při mezinárodním srovnání i mobile.de, otomoto.pl, willhaben.at a lacentrale.fr.\n\n' +
      'Neděláme plošný scraping a nebudujeme kopii cizích inzerátů. Pro každý dotaz cíleně dohledáme několik srovnatelných nabídek, uchováváme jen vlastní vypočtené statistiky a krátkodobou cache (max. 14 dní). Osobní údaje prodejců nezpracováváme.\n\n' +
      'Odkazy ve výsledku vedou vždy na původní inzerát na daném portálu.',
    link: { href: '/zdroje-dat', label: 'Zdroje dat a metodika' },
  },
  {
    id: 'duration',
    question: 'Jak dlouho ocenění trvá?',
    keywords: ['jak dlouho', 'trva', 'jak rychle', 'cekat', 'za jak'],
    answer: (f) =>
      'Podle zvolené úrovně:\n\n' +
      f.tiers.map((t) => `· ${t.label} — přibližně ${dur(t.durationSec)}`).join('\n') +
      '\n\nVyšší úrovně trvají déle, protože AI prohledá víc inzerátů a napíše delší rozbor. Nechte během toho stránku otevřenou.',
    link: { href: '/odhad-ceny', label: 'Spustit ocenění' },
  },
];

/** Normalizace pro porovnávání dotazu (bez diakritiky, malá písmena). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Značky pro rozpoznání „kolik stojí moje Octavia" — jen pro matching. */
const BRAND_HINTS = [
  'skoda', 'octavia', 'fabia', 'superb', 'kodiaq', 'karoq', 'scala', 'kamiq', 'enyaq',
  'volkswagen', ' vw ', 'golf', 'passat', 'tiguan', 'polo', 'touran', 'touareg',
  'bmw', 'mercedes', 'audi', 'toyota', 'ford', 'hyundai', 'kia', 'peugeot', 'renault',
  'opel', 'seat', 'cupra', 'volvo', 'honda', 'mazda', 'nissan', 'citroen', 'fiat',
  'dacia', 'suzuki', 'porsche', 'jeep', 'mitsubishi', 'subaru', 'tesla', 'lexus',
  'mini ', 'jaguar', 'land rover', 'alfa romeo',
];

/**
 * Pozná dotaz typu „kolik stojí moje auto" — na ten se NESMÍ odpovědět
 * ceníkem. Jde na AI, které vysvětlí, že cenu spočítá až ocenění, a pošle
 * uživatele na /odhad-ceny.
 */
export function looksLikeValuationRequest(q: string): boolean {
  const hasYear = /\b(19[89]\d|20[0-3]\d)\b/.test(q);
  const hasMileage = /\b\d{2,3}\s*(tis|tisic|k)?\s*km\b/.test(q) || /najeto|najezd|kilometr/.test(q);
  const hasBrand = BRAND_HINTS.some((b) => q.includes(b));
  const hasOwnership = /\bmoje|\bmuj |\bmoji|\bmam |\bmame |\bvlastnim/.test(q);

  return hasYear || hasMileage || hasBrand || hasOwnership;
}

/**
 * Zkusí na volně psaný dotaz najít předpřipravenou odpověď.
 * Vrátí položku jen při dost jasné shodě — jinak null a dotaz jde na AI.
 */
export function matchFaq(input: string): FaqItem | null {
  const q = normalize(input);
  if (q.length < 3) return null;

  // Dotaz na cenu konkrétního vozu nikdy neodbývej ceníkem.
  if (looksLikeValuationRequest(q)) return null;

  let best: { item: FaqItem; score: number } | null = null;

  for (const item of FAQ) {
    let score = 0;
    if (q === normalize(item.question)) score += 100;
    for (const kw of item.keywords) {
      if (q.includes(kw)) score += kw.length;
    }
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }

  // Práh: krátká náhodná shoda v delší větě nestačí na jistou odpověď.
  return best && best.score >= 5 ? best.item : null;
}
