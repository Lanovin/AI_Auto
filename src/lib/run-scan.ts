import type { CarInput, ScanData } from './market-cache';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Tier configs for runScan (price estimator with live web search).
 *
 * Tier defines THREE things:
 *   1. max_tokens — response budget (affects markdown depth)
 *   2. max_search — how many web searches Claude may run (more = more comparables)
 *   3. The PROMPT TEMPLATE (built by `buildOutputSpec` below) — this is the
 *      single biggest differentiator. Quick = short JSON + table. Expert =
 *      multi-section professional valuation with TCO, depreciation forecast,
 *      pre-sale checklist, regional pricing, etc.
 */
const TIER_CONFIGS: Record<string, { max_tokens: number; max_search: number }> = {
  quick:    { max_tokens: 2500, max_search: 3 },
  standard: { max_tokens: 4500, max_search: 6 },
  // Detailed a expert jsou sníženy tak, aby se vešly na Vercel Pro (60s limit).
  // Vercel Free (10s) nestačí — zobrazí se srozumitelná chyba místo 504.
  detailed: { max_tokens: 7000, max_search: 7 },
  expert:   { max_tokens: 9000, max_search: 9 },
};

interface AnthropicContent {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContent[];
}

function extractText(res: AnthropicResponse): string {
  return (res.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('\n');
}

function parseJsonFromText(text: string): Record<string, unknown> {
  const t = text.trim();

  try { return JSON.parse(t); } catch (_) { /* try next */ }

  const block = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (block) {
    try { return JSON.parse(block[1]); } catch (_) { /* try next */ }
  }

  const obj = t.match(/\{[\s\S]*\}/);
  if (obj) {
    try { return JSON.parse(obj[0]); } catch (_) { /* fall through */ }
  }

  throw new Error('Nepodařilo se parsovat JSON z odpovědi Claude. Surový text: ' + t.slice(0, 300));
}

/**
 * Timeout pro Anthropic API volání.
 *
 * Vercel Free:  10 s max → quick/standard by se vešly, detailed/expert NE.
 * Vercel Pro:   60 s max → detailed/expert (7–9 searchů) by se vešly.
 * Lokální dev:  bez limitu.
 *
 * Nastavíme timeout na 55 s — těsně pod Vercel Pro limitem. Pokud volání
 * překročí tento čas, vyhodíme chybu s čitelnou zprávou dřív než Vercel
 * vrátí anonymní 504, kde uživatel neví proč se mu strhly peníze.
 */
const CLAUDE_TIMEOUT_MS = 55_000;

async function callClaude(body: object): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY není nastaven na serveru.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    // AbortError = náš vlastní timeout, ne Vercel 504
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'TIMEOUT: Posudek trval příliš dlouho. ' +
        'Zkuste tier Standardní nebo Rychlý — nebo kontaktujte podporu pro přístup k detailním posudkům.'
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`Anthropic API chyba ${res.status}: ${err.error?.message ?? res.statusText}`);
  }

  return res.json() as Promise<AnthropicResponse>;
}

// ════════════════════════════════════════════════════════════════════
// Prompt builders
// ════════════════════════════════════════════════════════════════════

/** Renders ALL known car fields as a structured block fed to Claude. */
function buildCarBlock(car: CarInput): string {
  const lines: string[] = [];
  const fmtKm = (km: number) => Number(km).toLocaleString('cs-CZ') + ' km';

  lines.push(`Značka: ${car.brand}`);
  lines.push(`Model: ${car.model}`);
  if (car.trim) lines.push(`Verze / výbavový stupeň: ${car.trim}`);
  lines.push(`Rok výroby: ${car.year}`);
  lines.push(`Najeto: ${car.mileage ? fmtKm(Number(car.mileage)) : 'neudáno'}`);
  if (car.transmission) lines.push(`Převodovka: ${car.transmission}`);
  if (car.fuel)         lines.push(`Palivo: ${car.fuel}`);
  if (car.engineCapacity) lines.push(`Objem motoru: ${car.engineCapacity} ccm`);
  if (car.powerKw)        lines.push(`Výkon: ${car.powerKw} kW`);
  if (car.drivetrain)     lines.push(`Pohon: ${car.drivetrain}`);
  if (car.bodyType)       lines.push(`Karoserie: ${car.bodyType}`);
  if (car.color)          lines.push(`Barva: ${car.color}`);
  if (car.vin)            lines.push(`VIN: ${car.vin}`);
  if (car.techCondition)  lines.push(`Technický stav: ${car.techCondition}`);
  if (car.paintCondition) lines.push(`Stav laku: ${car.paintCondition}`);
  if (car.accidents)      lines.push(`Nehodovost: ${car.accidents}`);
  if (car.serviceHistory) lines.push(`Servisní historie: ${car.serviceHistory}`);
  if (car.owners)         lines.push(`Počet majitelů: ${car.owners}`);
  if (car.consumption)    lines.push(`Spotřeba: ${car.consumption}`);
  if (car.originCountry)  lines.push(`Země původu: ${car.originCountry}`);
  if (car.equipment && car.equipment.length > 0) {
    lines.push(`Výbava: ${car.equipment.join(', ')}`);
  }
  if (car.notes) lines.push(`Poznámky uživatele: ${car.notes}`);

  return lines.join('\n');
}

function buildPortalsLine(scope: 'czech' | 'international'): string {
  return scope === 'international'
    ? 'Prohledej portály Sauto.cz, TipCars.cz (ČR), mobile.de, AutoScout24.de (Německo), otomoto.pl (Polsko), lacentrale.fr (Francie), willhaben.at (Rakousko) a najdi aktuální inzeráty.'
    : 'Prohledej Sauto.cz, TipCars.cz, AutoScout24.cz a najdi aktuální inzeráty.';
}

function buildCurrencyNote(scope: 'czech' | 'international'): string {
  return scope === 'international'
    ? 'Všechny ceny uváděj v CZK. EUR převádej kurzem ~25 CZK/EUR, PLN kurzem ~5,8 CZK/PLN.\n'
    : '';
}

/**
 * Tier-specific output specification. THIS IS WHERE THE DEPTH LIVES.
 *
 *   quick    → Just enough: price + 4-row table + 1-line summary.
 *   standard → Adds breakdown table + paragraph reasoning.
 *   detailed → 6 mandatory sections incl. equipment breakdown, market trends,
 *              risk flags, sale strategy. ~3-5 min read.
 *   expert   → ALL detailed sections + 12-month price trend, regional comparison,
 *              VIN-specific notes, 3-year TCO, depreciation forecast, pre-sale/buy
 *              checklist, strategic recommendations. ~7-10 min read.
 *
 * The instructions explicitly call out that headers and tables are mandatory —
 * Claude has a tendency to "summarise" when given freedom, but this app is
 * billed by tier so the user EXPECTS depth.
 */
function buildOutputSpec(tier: string): string {
  if (tier === 'quick') {
    return `Vrať VÝHRADNĚ validní JSON objekt — žádný jiný text, žádné markdown bloky:
{
  "averagePrice": <průměrná tržní cena v CZK jako celé číslo>,
  "minPrice": <nejnižší nalezená cena v CZK>,
  "maxPrice": <nejvyšší nalezená cena v CZK>,
  "listingCount": <počet relevantních inzerátů>,
  "sources": [
    { "portal": "Sauto.cz", "url": "https://...", "price": 295000, "title": "Škoda Octavia 1.6 TDI 2018..." }
  ],
  "summary": "2–3 věty o tržní situaci a doporučení k ceně",
  "markdownText": "## 🔍 Srovnávací inzeráty\\n| Zdroj | Rok | Km | Cena |\\n|-------|-----|----|------|\\n| ... |\\n\\n## 💡 Shrnutí\\nKrátké shrnutí + doporučená cena."
}`;
  }

  if (tier === 'standard') {
    return `Vrať VÝHRADNĚ validní JSON objekt — žádný jiný text:
{
  "averagePrice": <CZK>,
  "minPrice": <CZK>,
  "maxPrice": <CZK>,
  "listingCount": <alespoň 6 inzerátů>,
  "sources": [<aspoň 5 různých inzerátů s portal, url, price, title>],
  "summary": "3–4 věty",
  "markdownText": "Středně rozsáhlý markdown obsahující:\\n\\n## 💰 Tržní cena\\n- Doporučená prodejní cena: X Kč\\n- Pásmo: min — max\\n- Pozice vozu v rámci nabídek (kvartil)\\n\\n## 🔍 Srovnatelné inzeráty\\nTabulka 6+ inzerátů (Zdroj / Rok / Km / Cena)\\n\\n## ⚖️ Faktory ovlivňující cenu\\nKrátké odůvodnění (najetých km, výbavy, stavu) v 4–6 bodech.\\n\\n## 💡 Doporučení\\n2–3 věty pro prodejce i kupujícího."
}`;
  }

  if (tier === 'detailed') {
    return `Vrať VÝHRADNĚ validní JSON objekt. Toto je PLACENÝ DETAILNÍ POSUDEK — uživatel za něj platí výrazně víc než za rychlou cenu, takže markdownText MUSÍ obsahovat VŠECHNY následující sekce v plné délce. NEZKRACUJ. Pokud něco neznáš, otevřeně to napiš ("nelze dohledat z dostupných zdrojů"), ale sekci nevynechej.

{
  "averagePrice": <CZK>,
  "minPrice": <CZK>,
  "maxPrice": <CZK>,
  "listingCount": <alespoň 10 inzerátů>,
  "sources": [<aspoň 8 různých inzerátů: portal, url, price, title>],
  "summary": "4–6 vět souhrnu klíčových zjištění (pozice v trhu, hlavní rizika, doporučení).",
  "markdownText": "ROZSÁHLÁ profesionální analýza v markdownu obsahující VŠECHNY následující sekce. Každá sekce začíná H2 nadpisem (##) s emoji. Mezi sekcemi prázdný řádek:\\n\\n## 💰 Tržní cena a pásmo spolehlivosti\\n- Doporučená prodejní cena (CZK): X Kč\\n- Doporučená výkupní cena (pro autobazar): Y Kč\\n- Pásmo: min — max\\n- 25. percentil / medián / 75. percentil z nalezených inzerátů\\n- Pozice tohoto vozu v rámci nabídek (např. 'v dolní třetině díky vyššímu nájezdu')\\n\\n## 📊 Srovnatelné inzeráty (tabulka, min. 8 řádků)\\nTabulka: Zdroj | Model/verze | Rok | Najeto | Převodovka | Cena | Link\\nPod tabulkou: identifikace odlehlých hodnot (které inzeráty výrazně vybočují a proč).\\n\\n## 🔧 Vliv výbavy a stavu na cenu (rozpad cenových úprav)\\nKonkrétní +/− CZK částky pro každý faktor:\\n- Výbavu (každý prvek samostatně, např. tažné zařízení +6 000 Kč, navigace +4 000 Kč, kožené sedačky +8 000 Kč, ...)\\n- Technický stav vůči průměru\\n- Stav laku a karoserie\\n- Nehodovost (pokud nehod) — odhad slevy\\n- Servisní historie (plná +X, částečná 0, žádná −Y)\\n- Najetých km vs benchmark pro daný rok (15 000 km/rok)\\n- Počet majitelů\\n\\n## 📈 Tržní trendy pro tento segment\\n- Sezónní vliv (jaro/léto/podzim/zima) — kdy se prodává nejrychleji a za nejlepší cenu\\n- Likvidita modelu (jak dlouho typicky stojí v inzerci)\\n- Trend depreciace za posledních 12 měsíců (rostoucí/stagnující/klesající)\\n- Konkurence — kolik podobných vozů je aktuálně v nabídce\\n\\n## ⚠️ Známá rizika a problémy modelu/motoru\\n- Typické mechanické a elektronické závady pro tento model+motor+rok\\n- Předpokládané servisní náklady na nejbližší rok\\n- Co kupující obvykle požadují před koupí (zkušební jízda, TPi, výměna konkrétních dílů)\\n- Doklady, které by měly být k dispozici (TP, servisní knížka, doklad o stavu km)\\n\\n## 💡 Doporučení k prodeji a koupi\\n- **Pro prodejce:**\\n  - Optimální cena pro rychlý prodej (do 30 dní): X Kč\\n  - Optimální cena pro trpělivý prodej (60–90 dní): Y Kč\\n  - Vyjednávací prostor (kolik nechat na slevě)\\n  - Klíčové prodejní argumenty (silné stránky vozu vůči konkurenci)\\n  - Doporučená inzertní strategie\\n- **Pro kupujícího:**\\n  - Maximální cena, kterou se vyplatí nabídnout\\n  - Body vyjednávání (na čem stáhnout cenu)\\n  - Co zkontrolovat před koupí (TOP 5 položek)"
}`;
  }

  if (tier === 'expert') {
    return `Vrať VÝHRADNĚ validní JSON objekt. Toto je NEJVYŠŠÍ TIER — EXPERTNÍ POSUDEK na úrovni profesionálního znaleckého odhadu. Uživatel platí maximum, takže markdownText MUSÍ obsahovat VŠECHNY následující sekce v plné délce a hloubce. NIKDY NEZKRACUJ — pokud informaci neznáš, napiš to explicitně, ale sekci nevynechej.

{
  "averagePrice": <CZK>,
  "minPrice": <CZK>,
  "maxPrice": <CZK>,
  "listingCount": <alespoň 15 inzerátů>,
  "sources": [<aspoň 12 různých inzerátů: portal, url, price, title>],
  "summary": "6–8 vět executive summary s klíčovými zjištěními.",
  "markdownText": "EXPERTNÍ posudek v markdownu — VŠECHNY sekce povinné:\\n\\n## 📋 Executive summary\\nKrátký rámec (4–6 vět) — co vůz je, kde se nachází na trhu, hlavní příležitosti a rizika, finální doporučení.\\n\\n## 💰 Tržní cena a pásmo spolehlivosti\\n- Doporučená prodejní cena (CZK)\\n- Doporučená výkupní cena (pro autobazar)\\n- Pásmo: min — max s interval spolehlivosti 90 %\\n- 25. / 50. / 75. percentil z nalezených inzerátů\\n- Pozice tohoto konkrétního vozu (kvartil + odůvodnění)\\n\\n## 📊 Srovnatelné inzeráty (tabulka, min. 12 řádků)\\nTabulka: Zdroj | Model/verze | Rok | Najeto | Převodovka | Cena | Odchylka od mediánu | Link\\nPod tabulkou: detailní analýza odlehlých hodnot.\\n\\n## 🔧 Rozpad cenových úprav (detailní)\\nPro každý faktor uveď konkrétní +/− CZK + zdůvodnění:\\n- Výbava — každý prvek samostatně s částkou\\n- Technický stav vůči průměru segmentu\\n- Stav laku, karoserie, interiéru\\n- Nehodovost a její vliv\\n- Servisní historie\\n- Najetých km vs benchmark\\n- Počet majitelů\\n- Země původu (CZ původ vs import)\\n\\n## 📈 Detailní cenový trend (12 měsíců + prognóza)\\n- Vývoj průměrné ceny za posledních 12 měsíců (+/− %)\\n- Sezónní křivka pro tento segment\\n- Prognóza vývoje na nejbližších 3–6 měsíců\\n- Faktory, které mohou cenu posunout (legislativa, nový model, …)\\n\\n## 🌍 Regionální srovnání\\n- Praha vs venkov\\n- Morava vs Čechy\\n- Importované vs domácí vozy\\n- Tipy: kde se prodává nejlépe / kde nejlevněji koupit\\n\\n## 🔬 VIN a historie vozu\\n${'${vinHint}'}\\n- Doporučení na ověření přes Cebia / VIN dekodér\\n- Co prověřit (nájezd, počet majitelů, exporty, leasing)\\n\\n## 💼 Investiční pohled\\n- Odhad zbytkové hodnoty za 1 / 3 / 5 let (CZK)\\n- Roční depreciace v %\\n- Vhodnost pro: krátkodobé držení / dlouhodobé držení / fleet\\n- Alternativy ze stejné kategorie, které drží hodnotu lépe\\n\\n## 🛠 Náklady vlastnictví (TCO) na 3 roky\\nKonkrétní roční částky:\\n- Pravidelný servis\\n- Očekávané výměny (rozvody, brzdy, pneu)\\n- Pojištění (povinné + havarijní orientačně)\\n- Spotřeba × roční nájezd × cena paliva\\n- Dálniční známka\\n- Celkový roční náklad + tříletý součet\\n\\n## ⚠️ Známá rizika a problémy modelu\\n- Typické mechanické a elektronické závady (motor, převodovka, elektronika)\\n- Závady spojené s vyšším nájezdem\\n- Doporučené preventivní výměny\\n- Co kupující obvykle požadují před koupí\\n\\n## 📋 Pre-purchase / Pre-sale checklist (10–15 bodů)\\n${'${checklistHint}'}\\n\\n## 🎯 Strategická doporučení\\n- Optimální čas prodeje/koupě\\n- Inzertní strategie (kde inzerovat, klíčové fráze, doporučené fotografie)\\n- Cenová strategie (nasazená cena → konečná cena, slevová elasticita)\\n- Vyjednávací prostor\\n- Plán B pokud se vůz neprodá za 60 dní"
}`;
  }

  // Fallback to standard
  return buildOutputSpec('standard');
}

/**
 * Replaces tier-specific placeholders in the expert output spec based on
 * whether the user gave us a VIN and whether they're buying or selling.
 */
function fillExpertPlaceholders(spec: string, car: CarInput): string {
  const vinHint = car.vin
    ? `Pro VIN ${car.vin}: vypiš, co lze z VIN dekódovat (země výroby, rok modelového roku, motor, výbava). Pokud je to možné, uveď specifika daného konkrétního vozu.`
    : 'VIN nebyl uveden — doporuč uživateli, aby pro plnou kontrolu historie zadal VIN při příští kontrole.';

  // Heuristic: if "notes" mentions buying/koupě, treat as buyer; otherwise both
  const isBuyer = car.notes && /koup[ěie]|nakup|kupuj/.test(car.notes.toLowerCase());
  const checklistHint = isBuyer
    ? 'Pre-purchase checklist — co zkontrolovat před koupí (10–15 bodů: dokumenty, technický stav, zkušební jízda, ověření historie).'
    : 'Vyber relevantní (prodej VS koupě): Pre-sale checklist (jak vůz připravit k prodeji) NEBO Pre-purchase checklist (co zkontrolovat před koupí). Pokud nelze rozhodnout, dej oba krátce.';

  return spec.replace('${vinHint}', vinHint).replace('${checklistHint}', checklistHint);
}

/**
 * Runs a fresh market scan for the given car.
 * Searches Sauto.cz, TipCars.cz, AutoScout24.cz via Claude + web_search.
 *
 * The `tier` parameter (quick / standard / detailed / expert) controls both
 * the response budget (max_tokens, max_search) AND the depth/structure of the
 * markdown output via tier-specific prompt templates (see buildOutputSpec).
 *
 * The `scope` parameter controls which portals to search:
 *   'czech'         — Sauto.cz, TipCars.cz, AutoScout24.cz (default)
 *   'international' — Czech portals + mobile.de, otomoto.pl, lacentrale.fr, willhaben.at
 *
 * Returns a ScanData object ready for DB storage and API response.
 */
export async function runScan(car: CarInput, tier = 'standard', scope = 'czech'): Promise<ScanData> {
  const config = TIER_CONFIGS[tier] ?? TIER_CONFIGS.standard;
  const isInternational = scope === 'international';
  const scopeNormalized: 'czech' | 'international' = isInternational ? 'international' : 'czech';

  const carBlock = buildCarBlock(car);
  const portalsLine = buildPortalsLine(scopeNormalized);
  const currencyNote = buildCurrencyNote(scopeNormalized);

  let outputSpec = buildOutputSpec(tier);
  if (tier === 'expert') {
    outputSpec = fillExpertPlaceholders(outputSpec, car);
  }

  const userMessage =
    `${portalsLine}\n\n` +
    `Oceňuješ tento konkrétní vůz:\n${carBlock}\n\n` +
    currencyNote +
    outputSpec;

  // System prompt scales with tier to set the right "voice" and depth expectation.
  const systemBase =
    'Jsi asistent pro výzkum a oceňování trhu s ojetými automobily v České republice. ' +
    'Prohledáváš bazarové portály, ověřuješ aktuální nabídku a vracíš strukturovaný výsledek ' +
    'VÝHRADNĚ jako validní JSON objekt — žádný jiný text, žádné markdown bloky obalující JSON. ';
  const systemTierSuffix =
    tier === 'expert'
      ? 'Tvůj výstup má úroveň profesionálního znaleckého posudku. Buď extrémně důkladný, strukturovaný a věcný. ' +
        'Uživatel platí prémium za hloubku — NIKDY nezkracuj sekce ani neslučuj. Pokud něco neznáš, otevřeně to napiš.'
      : tier === 'detailed'
        ? 'Tvůj výstup je placený detailní posudek. Buď důkladný, věcný a strukturovaný. ' +
          'Uživatel očekává VÝRAZNĚ víc obsahu než u rychlé ceny — všechny požadované sekce vyplň v plné délce.'
        : tier === 'standard'
          ? 'Buď věcný a stručný, ale poskytni klíčové faktory ovlivňující cenu.'
          : 'Buď stručný a rychlý — uživatel chce orientační cenu, ne posudek.';

  const requestBody = {
    model: 'claude-opus-4-6',
    max_tokens: config.max_tokens,
    system: systemBase + systemTierSuffix,
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: config.max_search,
      },
    ],
    messages: [{ role: 'user', content: userMessage }],
  };

  const apiResponse = await callClaude(requestBody);
  const text = extractText(apiResponse);
  const parsed = parseJsonFromText(text);

  const averagePrice = Number(parsed.averagePrice) || 0;
  const minPrice     = Number(parsed.minPrice)     || 0;
  const maxPrice     = Number(parsed.maxPrice)     || 0;

  const fallbackMarkdown =
    `## 💰 Odhad tržní ceny\n` +
    `- **Průměrná tržní cena:** ${averagePrice.toLocaleString('cs-CZ')} Kč\n` +
    `- **Rozsah:** ${minPrice.toLocaleString('cs-CZ')} – ${maxPrice.toLocaleString('cs-CZ')} Kč\n\n` +
    `## 💡 Shrnutí\n${parsed.summary ?? ''}`;

  return {
    averagePrice,
    minPrice,
    maxPrice,
    listingCount: Number(parsed.listingCount) || 0,
    sources: Array.isArray(parsed.sources)
      ? (parsed.sources as ScanData['sources'])
      : [],
    modelInput: {
      brand:      car.brand,
      model:      car.model,
      rok:        car.year,
      km:         car.mileage ?? 0,
      prevodovka: car.transmission ?? '',
      palivo:     car.fuel ?? '',
      // include rich fields in modelInput so they're stored alongside the scan
      tier,
      trim:       car.trim ?? '',
      vin:        car.vin ?? '',
      stav:       car.techCondition ?? '',
      nehody:     car.accidents ?? '',
      servis:     car.serviceHistory ?? '',
      majitele:   car.owners ?? '',
      vybava:     car.equipment ?? [],
    },
    summary:      String(parsed.summary     ?? ''),
    markdownText: String(parsed.markdownText ?? fallbackMarkdown),
  };
}

/**
 * Lightweight monitor scan: uses claude-haiku (no web search) for fast, cheap,
 * accurate price estimation based purely on Claude's trained market knowledge.
 * ~20× cheaper than runScan with Opus + web search, and faster (no search latency).
 */
export async function runMonitorScan(car: CarInput): Promise<ScanData> {
  const mileageText = car.mileage
    ? Number(car.mileage).toLocaleString('cs-CZ') + ' km'
    : 'neudáno';
  const yearNumber = Number(car.year);
  const ageYears = Number.isFinite(yearNumber)
    ? new Date().getFullYear() - yearNumber
    : 0;

  const userMessage =
    `Oceň ojetý vůz na českém trhu.\n\n` +
    `Značka: ${car.brand}\n` +
    `Model: ${car.model}\n` +
    `Rok výroby: ${car.year} (stáří: ${ageYears} let)\n` +
    `Nájezd: ${mileageText}\n` +
    `Převodovka: ${car.transmission || 'neudáno'}\n` +
    `Palivo: ${car.fuel || 'neudáno'}\n\n` +
    `Metodika: depreciation křivka pro danou kategorii/značku v ČR; korekce nájezd ` +
    `(benchmark 15 000 km/rok, ±2–3 % za každých 10 000 km odchylky); automat +5–8 % ` +
    `oproti manuálu; dolní mez = horší stav nebo vyšší km na věk, horní mez = dobrý stav ` +
    `nebo servisní knížka.\n\n` +
    `Vrať VÝHRADNĚ validní JSON:\n` +
    `{\n` +
    `  "averagePrice": <průměrná tržní hodnota CZK, celé číslo>,\n` +
    `  "minPrice": <dolní konec cenového pásma>,\n` +
    `  "maxPrice": <horní konec cenového pásma>,\n` +
    `  "listingCount": 0,\n` +
    `  "sources": [],\n` +
    `  "summary": "2 věty o tržní hodnotě a hlavním faktoru ovlivňujícím cenu"\n` +
    `}`;

  const requestBody = {
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system:
      'Jsi expert na oceňování ojetých vozidel na českém trhu. ' +
      'Vycházíš z internalizovaných cenových dat portálů Sauto.cz a TipCars.cz. ' +
      'Proveď přesný statistický odhad tržní hodnoty bez přístupu k internetu. ' +
      'Vrať odpověď VÝHRADNĚ jako validní JSON objekt — žádný jiný text.',
    messages: [{ role: 'user', content: userMessage }],
  };

  const apiResponse = await callClaude(requestBody);
  const text = extractText(apiResponse);
  const parsed = parseJsonFromText(text);

  const averagePrice = Number(parsed.averagePrice) || 0;
  const minPrice     = Number(parsed.minPrice)     || 0;
  const maxPrice     = Number(parsed.maxPrice)     || 0;

  const fallbackMarkdown =
    `## 💰 Tržní hodnota\n` +
    `- **Průměrná cena:** ${averagePrice.toLocaleString('cs-CZ')} Kč\n` +
    `- **Rozsah:** ${minPrice.toLocaleString('cs-CZ')} – ${maxPrice.toLocaleString('cs-CZ')} Kč\n\n` +
    `## 💡 Shrnutí\n${parsed.summary ?? ''}`;

  return {
    averagePrice,
    minPrice,
    maxPrice,
    listingCount: 0,
    sources: [],
    modelInput: {
      brand:      car.brand,
      model:      car.model,
      rok:        car.year,
      km:         car.mileage ?? 0,
      prevodovka: car.transmission ?? '',
      palivo:     car.fuel ?? '',
    },
    summary:      String(parsed.summary ?? ''),
    markdownText: String(parsed.markdownText ?? fallbackMarkdown),
  };
}
