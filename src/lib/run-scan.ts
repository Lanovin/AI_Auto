import type { CarInput, ScanData } from './market-cache';
import type { PriceStatsPrior } from './price-stats';
import { computeValuation, type Comparable } from './valuation';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Tier configs for runScan (price estimator with live web search).
 *
 * Tier defines:
 *   1. max_tokens — response budget (affects markdown depth)
 *   2. max_search — how many web searches Claude may run (more = more comparables)
 *   3. max_fetch  — how many listing pages Claude may OPEN (web_fetch) to read the
 *      exact price/mileage/spec instead of relying on lossy search snippets.
 *   4. effort     — adaptive-thinking depth (deeper = more disciplined statistics)
 *   5. The PROMPT TEMPLATE (built by `buildOutputSpec` below) — this is the
 *      single biggest differentiator. Quick = short JSON + table. Expert =
 *      multi-section professional valuation with TCO, depreciation forecast,
 *      pre-sale checklist, regional pricing, etc.
 */
type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';
const TIER_CONFIGS: Record<
  string,
  { max_tokens: number; max_search: number; max_fetch: number; effort: EffortLevel }
> = {
  quick:    { max_tokens: 2500,  max_search: 9,  max_fetch: 0,  effort: 'low'    },
  standard: { max_tokens: 4500,  max_search: 9,  max_fetch: 0,  effort: 'medium' },
  // Detailní a expertní posudek je dlouhý — díky streamingu (viz callClaude)
  // můžeme dát štědřejší max_tokens, aby se markdown vešel.
  //
  // CENA vs. PŘESNOST (cíl ≤ $1,50/běh): přesnost NACENĚNÍ stojí na počtu a
  // kvalitě nalezených inzerátů (comps) — ty pak server robustně zprůměruje ve
  // valuation.ts. Proto investujeme do POČTU HLEDÁNÍ (víc comps = stabilnější
  // medián), ale vyhýbáme se drahým pákám, které dřív vyhnaly cenu na ~$10:
  //   - max_fetch = 0  (stahování celých stránek + jejich resend při pause_turn
  //                     byl hlavní viník; cenu/rok/nájezd vezmeme z náhledu hledání)
  //   - effort = 'low' (cenu počítá server, ne model — hluboké uvažování netřeba)
  detailed: { max_tokens: 12000, max_search: 10, max_fetch: 0, effort: 'low' },
  expert:   { max_tokens: 16000, max_search: 15, max_fetch: 0, effort: 'low' },
};

interface AnthropicContent {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContent[];
  stop_reason?: string | null;
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
 * Záchrana z JSON oříznutého uprostřed (typicky uprostřed markdownText při
 * dosažení max_tokens). Vytáhne dohledatelné ceny a co nejvíc už napsaného
 * markdownu, aby uživatel i tak dostal použitelný (byť neúplný) posudek —
 * lepší než tvrdá chyba. Vrací null, pokud nelze zachránit vůbec nic.
 */
function salvageTruncatedJson(text: string): Record<string, unknown> | null {
  const num = (key: string): number => {
    const m = text.match(new RegExp('"' + key + '"\\s*:\\s*(\\d+)'));
    return m ? Number(m[1]) : 0;
  };

  let markdown = '';
  const md = text.match(/"markdownText"\s*:\s*"([\s\S]*)$/);
  if (md) {
    markdown = md[1]
      .replace(/\\u[0-9a-fA-F]{4}/g, (m) => {
        try { return JSON.parse('"' + m + '"'); } catch { return ''; }
      })
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      // odstraň poslední neúplný řádek a případnou zbytkovou uvozovku/závorku
      .replace(/\\?"?\s*[}\]]*\s*$/, '')
      .replace(/\n[^\n]*$/, '\n');
  }

  const averagePrice = num('averagePrice');
  if (!markdown.trim() && !averagePrice) return null;

  return {
    averagePrice,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    listingCount: num('listingCount'),
    sources: [],
    summary: '',
    markdownText:
      (markdown.trim() || '## 💰 Odhad tržní ceny\n_Posudek se nepodařilo dokončit._') +
      '\n\n---\n_⚠️ Posudek byl zkrácen kvůli své délce — výše je vše, co se stihlo vygenerovat. ' +
      'Pro úplný výstup zkuste posudek zopakovat nebo zvolit nižší tier._',
  };
}

/**
 * CELKOVÝ časový rozpočet na jeden posudek (NIKOLIV per-call).
 *
 * Klíčové: detailed/expert se kvůli web_search volá opakovaně ve smyčce
 * (pause_turn — viz callClaudeUntilDone). Kdyby měl každý dílčí call vlastní
 * timeout, jejich SOUČET by snadno přelezl maxDuration funkce a Vercel by ji
 * tvrdě zabil → anonymní 504. Proto držíme JEDEN sdílený deadline pro celou
 * operaci a nastavíme ho těsně pod route `maxDuration` (= 120 s na Vercelu),
 * abychom se sami korektně přerušili s čitelnou hláškou dřív než Vercel.
 *
 * Vercel:      290 s — pod maxDuration 300 s, rezerva na serializaci odpovědi.
 * Lokální dev: 300 s — žádný serverový limit, dáme dostatek prostoru.
 *
 * Pozn.: musí zůstat v souladu s `maxDuration` v route.ts (= 300 s). Pokud se
 * maxDuration změní, uprav i tuhle hodnotu (a nech ~10 s rezervu).
 */
const CLAUDE_TOTAL_BUDGET_MS = process.env.VERCEL ? 290_000 : 300_000;

const TIMEOUT_MESSAGE =
  'TIMEOUT: Posudek trval příliš dlouho. ' +
  'Zkuste tier Standardní nebo Rychlý — nebo kontaktujte podporu pro přístup k detailním posudkům.';

/**
 * Volá Anthropic Messages API ve **streamovacím** režimu.
 *
 * Proč streaming: detailní/expertní posudek je dlouhý (vysoký max_tokens) a
 * nestreamovaný HTTP request by u takových délek riskoval timeout spojení
 * dřív, než se vůbec dogeneruje. Streaming drží spojení živé a my si průběžně
 * skládáme bloky obsahu i finální stop_reason — takže velký výstup spolehlivě
 * dojede až do konce. Bloky rekonstruujeme genericky (text / server_tool_use /
 * web_search_tool_result), aby je šlo poslat zpět při obnově `pause_turn`.
 */
async function callClaude(body: object, signal?: AbortSignal): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY není nastaven na serveru.');

  // Pokud volající nepředá sdílený signál (např. runMonitorScan — jediné volání),
  // vytvoříme vlastní controller s celkovým rozpočtem jako pojistku.
  const ownController = signal ? null : new AbortController();
  const timeoutId = ownController
    ? setTimeout(() => ownController.abort(), CLAUDE_TOTAL_BUDGET_MS)
    : null;
  const activeSignal = signal ?? ownController!.signal;

  try {
    let res: Response;
    try {
      res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({ ...body, stream: true }),
        cache: 'no-store',
        signal: activeSignal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw new Error(TIMEOUT_MESSAGE);
      throw err;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(`Anthropic API chyba ${res.status}: ${err.error?.message ?? res.statusText}`);
    }
    if (!res.body) throw new Error('Anthropic API nevrátila streamovanou odpověď.');

    return await parseSSEStream(res.body, activeSignal);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/** Skládá SSE stream Anthropic API do AnthropicResponse (obsah + stop_reason). */
async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): Promise<AnthropicResponse> {
  // Když vyprší sdílený deadline, abort fetche obvykle ukončí i čtení streamu
  // (read() vyhodí AbortError). Pro jistotu navíc kontrolujeme signal.aborted
  // přímo ve smyčce níže a vyhodíme čitelnou TIMEOUT hlášku.
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  type Block = Record<string, unknown> & { type?: string; text?: string };
  const blocks: Record<number, Block> = {};
  const partialJson: Record<number, string> = {};
  let stopReason: string | null = null;

  try {
    for (;;) {
      if (signal?.aborted) throw new Error(TIMEOUT_MESSAGE);
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (!data || data === '[DONE]') continue;

        let evt: Record<string, unknown>;
        try { evt = JSON.parse(data); } catch { continue; }

        const idx = evt.index as number;
        switch (evt.type) {
          case 'content_block_start':
            blocks[idx] = { ...(evt.content_block as Block) };
            partialJson[idx] = '';
            break;
          case 'content_block_delta': {
            const d = evt.delta as {
              type?: string; text?: string; thinking?: string;
              partial_json?: string; signature?: string;
            };
            const b = (blocks[idx] ??= {});
            if (d.type === 'text_delta') b.text = (b.text ?? '') + (d.text ?? '');
            else if (d.type === 'thinking_delta') b.thinking = ((b.thinking as string) ?? '') + (d.thinking ?? '');
            // Signature thinking bloku MUSÍME zachovat — bez ní by zpětné odeslání
            // při pause_turn (echo asistentova obsahu) skončilo 400.
            else if (d.type === 'signature_delta') b.signature = ((b.signature as string) ?? '') + (d.signature ?? '');
            else if (d.type === 'input_json_delta') partialJson[idx] = (partialJson[idx] ?? '') + (d.partial_json ?? '');
            break;
          }
          case 'content_block_stop': {
            const pj = partialJson[idx];
            if (pj) { try { blocks[idx].input = JSON.parse(pj); } catch { /* ponech bez input */ } }
            break;
          }
          case 'message_delta': {
            const sr = (evt.delta as { stop_reason?: string } | undefined)?.stop_reason;
            if (sr) stopReason = sr;
            break;
          }
          case 'error':
            throw new Error('Anthropic stream chyba: ' + ((evt.error as { message?: string })?.message ?? 'neznámá'));
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw new Error(TIMEOUT_MESSAGE);
    throw err;
  } finally {
    try { reader.releaseLock(); } catch { /* ignore */ }
  }

  const content = Object.keys(blocks)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => blocks[i]) as unknown as AnthropicContent[];

  return { content, stop_reason: stopReason };
}

/**
 * Server-side web_search běží uvnitř vlastní sampling smyčky. Když narazí na
 * limit serverových iterací, API vrátí stop_reason "pause_turn" s NEÚPLNOU
 * odpovědí (často jen narativní text bez JSON). Pokud turn neobnovíme,
 * skončíme parsováním narativu → "Nepodařilo se parsovat JSON".
 *
 * Řešení: po pause_turn pošleme zpět asistentův dosavadní obsah (vč. bloků
 * server_tool_use / web_search_tool_result) a necháme model pokračovat.
 * NEPŘIDÁVÁME nový user message — API obnoví turn samo.
 * Viz https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
 *
 * Detailní/expertní tier (7–9 searchů) na pause_turn naráží téměř vždy, proto
 * dříve selhával — zatímco rychlý/standardní (3–6) se obvykle vešel do limitu.
 */
const MAX_PAUSE_CONTINUATIONS = 5;

async function callClaudeUntilDone(
  body: { messages: Array<{ role: string; content: unknown }> }
): Promise<{ finalText: string; combinedText: string; stopReason: string | null }> {
  const messages: Array<{ role: string; content: unknown }> = [...body.messages];
  let combinedText = '';
  let finalText = '';
  let stopReason: string | null = null;

  // JEDEN sdílený deadline pro celou operaci včetně všech pause_turn pokračování.
  // Tím zajistíme, že se sami korektně přerušíme s čitelnou hláškou dřív, než
  // Vercel funkci zabije na maxDuration (= anonymní 504). Viz CLAUDE_TOTAL_BUDGET_MS.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TOTAL_BUDGET_MS);

  try {
    for (let attempt = 0; attempt <= MAX_PAUSE_CONTINUATIONS; attempt++) {
      try {
        const res = await callClaude({ ...body, messages }, controller.signal);
        stopReason = res.stop_reason ?? null;
        finalText = extractText(res);
        if (finalText) combinedText += (combinedText ? '\n' : '') + finalText;

        if (stopReason !== 'pause_turn') break;

        // Obnov pozastavený turn — vrať asistentův dosavadní obsah a pokračuj.
        messages.push({ role: 'assistant', content: res.content });
      } catch (err) {
        // Vypršel-li sdílený deadline AŽ POTÉ, co už máme nasbíraný nějaký
        // obsah z dřívějších turnů, nepadej tvrdě — vrať částečný výstup a nech
        // salvage v runScan vytvořit aspoň neúplný posudek. Bez obsahu propaguj
        // TIMEOUT dál (route ho zmapuje na čitelnou 504 hlášku).
        const isTimeout = err instanceof Error && err.message === TIMEOUT_MESSAGE;
        if (isTimeout && combinedText.trim()) break;
        throw err;
      }
    }
  } finally {
    clearTimeout(timeoutId);
  }

  return { finalText, combinedText, stopReason };
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
  if (car.importDetail)   lines.push(`Dovoz / historie v ČR: ${car.importDetail}`);
  if (car.tires)          lines.push(`Pneumatiky: ${car.tires}`);
  if (car.stkValidity)    lines.push(`Platnost STK: ${car.stkValidity}`);
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
 * Pravidla nakládání s daty z inzerátů (GDPR + zvláštní právo pořizovatele
 * databáze, směrnice 96/9/ES). Vkládá se do KAŽDÉHO scan promptu — z inzerátů
 * se smí přebírat jen minimum faktických údajů nutných pro cenové srovnání,
 * nikdy osobní údaje prodejců a nikdy doslovné kopie textů.
 */
const COMPLIANCE_RULES =
  'PRAVIDLA PRÁCE S DATY Z INZERÁTŮ (povinná):\n' +
  '- Nikdy neextrahuj ani nevracej osobní údaje z inzerátů: jména prodejců, telefonní čísla, e-maily, přesné adresy.\n' +
  '- V poli "sources" uváděj pouze faktické údaje: portál, URL, cenu a krátký titulek vozu.\n' +
  '- Titulek inzerátu max. 80 znaků a pouze značka / model / motorizace / rok / nájezd — žádné údaje o prodejci.\n' +
  '- Necituj texty inzerátů doslovně; vlastními slovy parafrázuj. Z každého inzerátu přebírej jen minimum nutné pro cenové srovnání.\n';

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
    { "portal": "Sauto.cz", "url": "https://...", "price": 295000, "title": "Škoda Octavia 1.6 TDI 2018, 120 000 km (max 80 znaků, jen vůz — žádné údaje o prodejci)" }
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
  "sources": [<aspoň 5 různých inzerátů s portal, url, price, title (max 80 znaků, jen vůz — žádné údaje o prodejci)>],
  "summary": "3–4 věty",
  "markdownText": "Středně rozsáhlý markdown obsahující:\\n\\n## 💰 Tržní cena\\n- Doporučená prodejní cena: X Kč\\n- Pásmo: min — max\\n- Pozice vozu v rámci nabídek (kvartil)\\n\\n## 🔍 Srovnatelné inzeráty\\nTabulka 6+ inzerátů (Zdroj / Rok / Km / Cena)\\n\\n## ⚖️ Faktory ovlivňující cenu\\nKrátké odůvodnění (najetých km, výbavy, stavu) v 4–6 bodech.\\n\\n## 💡 Doporučení\\n2–3 věty pro prodejce i kupujícího."
}`;
  }

  if (tier === 'detailed') {
    return `Vrať VÝHRADNĚ validní JSON objekt. Toto je PLACENÝ DETAILNÍ POSUDEK — uživatel za něj platí výrazně víc než za rychlou cenu, takže markdownText MUSÍ obsahovat VŠECHNY následující sekce v plné délce. NEZKRACUJ. Pokud něco neznáš, otevřeně to napiš ("nelze dohledat z dostupných zdrojů"), ale sekci nevynechej.

DŮLEŽITÉ: Z výsledků hledání (Sauto/TipCars/AutoScout v náhledu ukazují cenu, rok i nájezd) vytěž co nejvíc konkrétních inzerátů a jejich přesná data vrať STROJOVĚ v poli "comparables" — z nich se serverově počítá výsledná cena. Čím víc relevantních inzerátů, tím přesnější odhad.

{
  "averagePrice": <CZK — tvůj nejlepší odhad; server ho ověří/přepočítá z comparables>,
  "minPrice": <CZK>,
  "maxPrice": <CZK>,
  "listingCount": <alespoň 10 inzerátů>,
  "sources": [<aspoň 8 různých inzerátů: portal, url, price, title (max 80 znaků, jen vůz — žádné údaje o prodejci)>],
  "comparables": [<aspoň 8 inzerátů jako STROJOVĚ ČITELNÉ objekty: {"portal": "Sauto.cz", "url": "https://...", "price": <CZK celé číslo>, "year": <rok>, "mileageKm": <nájezd v km celé číslo>, "powerKw": <kW nebo null>, "transmission": "manual"|"automat", "fuel": "diesel"|"benzin"|..., "trim": "<verze>", "sameModel": true|false}. Vyplň co nejvíc polí z OTEVŘENÝCH inzerátů. sameModel=false jen u příbuzných (jiná generace/model).>],
  "summary": "4–6 vět souhrnu klíčových zjištění (pozice v trhu, hlavní rizika, doporučení).",
  "markdownText": "ROZSÁHLÁ profesionální analýza v markdownu obsahující VŠECHNY následující sekce. Každá sekce začíná H2 nadpisem (##) s emoji. Mezi sekcemi prázdný řádek:\\n\\n## 💰 Tržní cena a pásmo spolehlivosti\\n- Doporučená prodejní cena (CZK): X Kč\\n- Doporučená výkupní cena (pro autobazar): Y Kč\\n- Pásmo: min — max\\n- 25. percentil / medián / 75. percentil z nalezených inzerátů\\n- Pozice tohoto vozu v rámci nabídek (např. 'v dolní třetině díky vyššímu nájezdu')\\n\\n## 📊 Srovnatelné inzeráty (tabulka, min. 8 řádků)\\nTabulka: Zdroj | Model/verze | Rok | Najeto | Převodovka | Cena | Link\\nPod tabulkou: identifikace odlehlých hodnot (které inzeráty výrazně vybočují a proč).\\n\\n## 🔧 Vliv výbavy a stavu na cenu (rozpad cenových úprav)\\nKonkrétní +/− CZK částky pro každý faktor:\\n- Výbavu (každý prvek samostatně, např. tažné zařízení +6 000 Kč, navigace +4 000 Kč, kožené sedačky +8 000 Kč, ...)\\n- Technický stav vůči průměru\\n- Stav laku a karoserie\\n- Nehodovost (pokud nehod) — odhad slevy\\n- Servisní historie (plná +X, částečná 0, žádná −Y)\\n- Najetých km vs benchmark pro daný rok (15 000 km/rok)\\n- Počet majitelů\\n\\n## 📈 Tržní trendy pro tento segment\\n- Sezónní vliv (jaro/léto/podzim/zima) — kdy se prodává nejrychleji a za nejlepší cenu\\n- Likvidita modelu (jak dlouho typicky stojí v inzerci)\\n- Trend depreciace za posledních 12 měsíců (rostoucí/stagnující/klesající)\\n- Konkurence — kolik podobných vozů je aktuálně v nabídce\\n\\n## ⚠️ Známá rizika a problémy modelu/motoru\\n- Typické mechanické a elektronické závady pro tento model+motor+rok\\n- Předpokládané servisní náklady na nejbližší rok\\n- Co kupující obvykle požadují před koupí (zkušební jízda, TPi, výměna konkrétních dílů)\\n- Doklady, které by měly být k dispozici (TP, servisní knížka, doklad o stavu km)\\n\\n## 💡 Doporučení k prodeji a koupi\\n- **Pro prodejce:**\\n  - Optimální cena pro rychlý prodej (do 30 dní): X Kč\\n  - Optimální cena pro trpělivý prodej (60–90 dní): Y Kč\\n  - Vyjednávací prostor (kolik nechat na slevě)\\n  - Klíčové prodejní argumenty (silné stránky vozu vůči konkurenci)\\n  - Doporučená inzertní strategie\\n- **Pro kupujícího:**\\n  - Maximální cena, kterou se vyplatí nabídnout\\n  - Body vyjednávání (na čem stáhnout cenu)\\n  - Co zkontrolovat před koupí (TOP 5 položek)"
}`;
  }

  if (tier === 'expert') {
    return `Vrať VÝHRADNĚ validní JSON objekt. Toto je NEJVYŠŠÍ TIER — EXPERTNÍ POSUDEK na úrovni profesionálního znaleckého odhadu. Uživatel platí maximum, takže markdownText MUSÍ obsahovat VŠECHNY následující sekce v plné délce a hloubce. NIKDY NEZKRACUJ — pokud informaci neznáš, napiš to explicitně, ale sekci nevynechej.

POSTUP (důležité pro přesnost):
1. Pokud je zadán VIN, NEJDŘÍV ho dekóduj (země výroby, modelový rok, motor, výbava) a použij pro přesné párování inzerátů.
2. Důkladně prohledej inzertní portály a nasbírej co NEJVÍC relevantních inzerátů stejného modelu/generace. Z náhledu výsledků hledání vytěž cenu, rok, nájezd, převodovku a palivo.
3. Tato data vrať STROJOVĚ v poli "comparables" — z nich se serverově počítá výsledná cena (robustní medián s korekcí na nájezd/stáří). Čím víc kvalitních inzerátů (ideálně 12+), tím přesnější odhad — raději více inzerátů než hloubková analýza jednoho.

{
  "averagePrice": <CZK — tvůj nejlepší odhad; server ho ověří/přepočítá z comparables>,
  "minPrice": <CZK>,
  "maxPrice": <CZK>,
  "listingCount": <alespoň 15 inzerátů>,
  "sources": [<aspoň 12 různých inzerátů: portal, url, price, title (max 80 znaků, jen vůz — žádné údaje o prodejci)>],
  "comparables": [<aspoň 12 inzerátů jako STROJOVĚ ČITELNÉ objekty: {"portal": "Sauto.cz", "url": "https://...", "price": <CZK celé číslo>, "year": <rok>, "mileageKm": <nájezd v km celé číslo>, "powerKw": <kW nebo null>, "transmission": "manual"|"automat", "fuel": "diesel"|"benzin"|..., "trim": "<verze>", "sameModel": true|false}. Vyplň co nejvíc polí z OTEVŘENÝCH inzerátů. sameModel=false jen u příbuzných (jiná generace/model).>],
  "summary": "6–8 vět executive summary s klíčovými zjištěními.",
  "markdownText": "EXPERTNÍ posudek v markdownu — VŠECHNY sekce povinné:\\n\\n## 📋 Executive summary\\nKrátký rámec (4–6 vět) — co vůz je, kde se nachází na trhu, hlavní příležitosti a rizika, finální doporučení.\\n\\n## 💰 Tržní cena a pásmo spolehlivosti\\n- Doporučená prodejní cena (CZK)\\n- Doporučená výkupní cena (pro autobazar)\\n- Pásmo: min — max s interval spolehlivosti 90 %\\n- 25. / 50. / 75. percentil z nalezených inzerátů\\n- Pozice tohoto konkrétního vozu (kvartil + odůvodnění)\\n\\n## 📊 Srovnatelné inzeráty (tabulka, min. 12 řádků)\\nTabulka: Zdroj | Model/verze | Rok | Najeto | Převodovka | Cena | Odchylka od mediánu | Link\\nPod tabulkou: detailní analýza odlehlých hodnot.\\n\\n## 🔧 Rozpad cenových úprav (detailní)\\nPro každý faktor uveď konkrétní +/− CZK + zdůvodnění:\\n- Výbava — každý prvek samostatně s částkou\\n- Technický stav vůči průměru segmentu\\n- Stav laku, karoserie, interiéru\\n- Nehodovost a její vliv\\n- Servisní historie\\n- Najetých km vs benchmark\\n- Počet majitelů\\n- Země původu (CZ původ vs import)\\n\\n## 📈 Detailní cenový trend (12 měsíců + prognóza)\\n- Vývoj průměrné ceny za posledních 12 měsíců (+/− %)\\n- Sezónní křivka pro tento segment\\n- Prognóza vývoje na nejbližších 3–6 měsíců\\n- Faktory, které mohou cenu posunout (legislativa, nový model, …)\\n\\n## 🌍 Regionální srovnání\\n- Praha vs venkov\\n- Morava vs Čechy\\n- Importované vs domácí vozy\\n- Tipy: kde se prodává nejlépe / kde nejlevněji koupit\\n\\n## 🔬 VIN a historie vozu\\n${'${vinHint}'}\\n- Doporučení na ověření přes Cebia / VIN dekodér\\n- Co prověřit (nájezd, počet majitelů, exporty, leasing)\\n\\n## 💼 Investiční pohled\\n- Odhad zbytkové hodnoty za 1 / 3 / 5 let (CZK)\\n- Roční depreciace v %\\n- Vhodnost pro: krátkodobé držení / dlouhodobé držení / fleet\\n- Alternativy ze stejné kategorie, které drží hodnotu lépe\\n\\n## 🛠 Náklady vlastnictví (TCO) na 3 roky\\nKonkrétní roční částky:\\n- Pravidelný servis\\n- Očekávané výměny (rozvody, brzdy, pneu)\\n- Pojištění (povinné + havarijní orientačně)\\n- Spotřeba × roční nájezd × cena paliva\\n- Dálniční známka\\n- Celkový roční náklad + tříletý součet\\n\\n## ⚠️ Známá rizika a problémy modelu\\n- Typické mechanické a elektronické závady (motor, převodovka, elektronika)\\n- Závady spojené s vyšším nájezdem\\n- Doporučené preventivní výměny\\n- Co kupující obvykle požadují před koupí\\n\\n## 📋 Pre-purchase / Pre-sale checklist (10–15 bodů)\\n${'${checklistHint}'}\\n\\n## 🎯 Strategická doporučení\\n- Optimální čas prodeje/koupě\\n- Inzertní strategie (kde inzerovat, klíčové fráze, doporučené fotografie)\\n- Cenová strategie (nasazená cena → konečná cena, slevová elasticita)\\n- Vyjednávací prostor\\n- Plán B pokud se vůz neprodá za 60 dní"
}`;
  }

  // Fallback to standard
  return buildOutputSpec('standard');
}

// ── Server-side sanitizace (pojistka nad COMPLIANCE_RULES v promptu) ──────
// I kdyby model pravidla nedodržel, do cache ani k uživateli se nedostanou
// osobní údaje prodejců (telefony, e-maily) ani nadměrné výňatky z inzerátů.

// České telefonní číslo: volitelná předvolba +420/00420, pak 9 číslic
// začínajících 2–7 (pevné linky 2–5, mobily 6–7). Lookbehind/lookahead na
// číslice brání falešným zásahům do roku + nájezdu („2018 120 000 km").
const PHONE_RE = /(?<!\d)(?:\+?420[\s.-]?|00420[\s.-]?)?[2-7]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;

/** Strips phone numbers / e-mails and truncates to `maxLen` chars. */
function sanitizeText(value: unknown, maxLen: number): string {
  return String(value ?? '')
    .replace(EMAIL_RE, '')
    .replace(PHONE_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Keeps only the factual source fields and sanitizes the title. */
function sanitizeSources(raw: unknown): ScanData['sources'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === 'object')
    .map((s) => ({
      portal: sanitizeText(s.portal, 60),
      url:    String(s.url ?? '').slice(0, 500),
      price:  Number(s.price) || 0,
      title:  sanitizeText(s.title, 100),
    }));
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
export async function runScan(
  car: CarInput,
  tier = 'standard',
  scope = 'czech',
  prior?: PriceStatsPrior | null
): Promise<ScanData> {
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

  // Vlastní historická data jako prior — zvyšuje odolnost proti outlierům
  // v aktuálních nálezech (viz src/lib/price-stats.ts). Jen při >= 2 vzorcích.
  const priorBlock =
    prior && prior.nSamples >= 2
      ? `Interní historická data Cargent (vlastní agregáty z dřívějších ocenění tohoto typu vozu): ` +
        `medián ~${Math.round(prior.medianPrice).toLocaleString('cs-CZ')} Kč z ${prior.nSamples} skenů, ` +
        `naposledy před ${prior.ageDays} dny. Použij jako prior pro kontrolu věrohodnosti — ` +
        `pokud se aktuální nálezy výrazně liší, vysvětli proč.\n\n`
      : '';

  const userMessage =
    `${portalsLine}\n\n` +
    `Oceňuješ tento konkrétní vůz:\n${carBlock}\n\n` +
    priorBlock +
    currencyNote +
    `${COMPLIANCE_RULES}\n` +
    outputSpec;

  // System prompt scales with tier to set the right "voice" and depth expectation.
  const systemBase =
    'Jsi asistent pro výzkum a oceňování trhu s ojetými automobily v České republice. ' +
    'Prohledáváš bazarové portály, ověřuješ aktuální nabídku a vracíš strukturovaný výsledek ' +
    'VÝHRADNĚ jako validní JSON objekt — žádný jiný text, žádné markdown bloky obalující JSON. ' +
    'Nikdy nezpracováváš osobní údaje prodejců z inzerátů (jména, telefony, e-maily, adresy). ';
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

  // web_search_20260209 má dynamické filtrování (filtruje výsledky kódem ještě
  // před vstupem do kontextu → relevantnější a levnější). web_fetch_20260209
  // umožní modelu OTEVŘÍT konkrétní inzerát a přečíst přesnou cenu/nájezd/spec
  // (jen URL už přítomné z výsledků search). Oboje podporuje Opus 4.8.
  const tools: Array<Record<string, unknown>> = [
    {
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: config.max_search,
    },
  ];
  if (config.max_fetch > 0) {
    tools.push({
      type: 'web_fetch_20260209',
      name: 'web_fetch',
      max_uses: config.max_fetch,
    });
  }

  const requestBody = {
    model: 'claude-opus-4-8',
    max_tokens: config.max_tokens,
    system: systemBase + systemTierSuffix,
    // Adaptivní uvažování + effort dle tieru: hlubší uvažování = disciplinovanější
    // statistické korekce (nájezd/stáří/outliery/percentily). Reasoning jde do
    // thinking bloků; JSON v text bloku zůstává čistý (viz extractText).
    thinking: { type: 'adaptive' as const },
    output_config: { effort: config.effort },
    tools,
    messages: [{ role: 'user', content: userMessage }],
  };

  const { finalText, combinedText } = await callClaudeUntilDone(requestBody);

  // Parsuj přednostně text z dokončeného turnu (tam je kompletní JSON);
  // při neúspěchu zkus celý přepis turnů.
  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonFromText(finalText);
  } catch (_) {
    try {
      parsed = parseJsonFromText(combinedText);
    } catch (err) {
      // Poslední záchrana: JSON oříznutý na max_tokens — vytáhni co se dá,
      // ať uživatel vždy dostane aspoň částečný posudek (žádná tvrdá chyba).
      const salvaged = salvageTruncatedJson(combinedText || finalText);
      if (salvaged) {
        parsed = salvaged;
      } else {
        throw err;
      }
    }
  }

  let averagePrice  = Number(parsed.averagePrice) || 0;
  let minPrice      = Number(parsed.minPrice)     || 0;
  let maxPrice      = Number(parsed.maxPrice)     || 0;
  let listingCount  = Number(parsed.listingCount) || 0;
  let markdownText  = '';

  // Deterministický (robustní) přepočet ceny z nasbíraných inzerátů — jen pro
  // expert/detailed, kde model vrací strojově čitelné `comparables`. Headline
  // číslo pak nepochází z volného odhadu modelu, ale z transparentní statistiky
  // (medián normalizovaných cen + blend s priorem). Viz valuation.ts.
  if (tier === 'expert' || tier === 'detailed') {
    const rawComps = Array.isArray(parsed.comparables) ? parsed.comparables : [];
    const comparables: Comparable[] = rawComps
      .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
      .map((c) => ({
        portal:       c.portal != null ? String(c.portal) : undefined,
        url:          c.url != null ? String(c.url) : undefined,
        price:        Number(c.price) || undefined,
        year:         Number(c.year) || undefined,
        mileageKm:    Number(c.mileageKm) || undefined,
        powerKw:      Number(c.powerKw) || undefined,
        transmission: c.transmission != null ? String(c.transmission) : undefined,
        fuel:         c.fuel != null ? String(c.fuel) : undefined,
        trim:         c.trim != null ? String(c.trim) : undefined,
        sameModel:    typeof c.sameModel === 'boolean' ? c.sameModel : undefined,
      }));

    const valuation = computeValuation(
      comparables,
      {
        year:         Number(car.year),
        mileageKm:    Number(car.mileage) || 0,
        transmission: car.transmission,
        powerKw:      car.powerKw != null ? Number(car.powerKw) : undefined,
      },
      { prior, modelAveragePrice: averagePrice },
    );

    if (valuation) {
      averagePrice = valuation.averagePrice;
      minPrice     = valuation.minPrice;
      maxPrice     = valuation.maxPrice;
      if (valuation.nComps > listingCount) listingCount = valuation.nComps;
      // Předřaď metodiku, ať headline sedí s tělem posudku.
      markdownText = valuation.methodologyMarkdown + '\n';
    }
  }

  const fallbackMarkdown =
    `## 💰 Odhad tržní ceny\n` +
    `- **Průměrná tržní cena:** ${averagePrice.toLocaleString('cs-CZ')} Kč\n` +
    `- **Rozsah:** ${minPrice.toLocaleString('cs-CZ')} – ${maxPrice.toLocaleString('cs-CZ')} Kč\n\n` +
    `## 💡 Shrnutí\n${parsed.summary ?? ''}`;

  markdownText += String(parsed.markdownText ?? fallbackMarkdown);

  return {
    averagePrice,
    minPrice,
    maxPrice,
    listingCount,
    sources: sanitizeSources(parsed.sources),
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
    summary:      sanitizeText(parsed.summary ?? '', 2000),
    markdownText,
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
