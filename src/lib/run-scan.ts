import type { CarInput, ScanData } from './market-cache';
import type { PriceStatsPrior } from './price-stats';
import { fetchSautoMarket, formatMarketForPrompt, type SautoMarket } from './sauto';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Model pro ocenění. Claude Opus 5.5 — nejlepší poměr přesnost/cena pro
 * úlohu „porovnej vůz s tabulkou srovnatelných inzerátů a dorovnej výbavu
 * a stav": silné uvažování nad čísly, levnější než Opus 4.8 ($4/$20 vs.
 * $5/$25 za MTok). Thinking je u něj vždy zapnutý; hloubku řídí `effort`.
 */
const VALUATION_MODEL = 'claude-opus-5-5';
/** Levný model pro monitoring, když Sauto nemá dost dat. */
const MONITOR_FALLBACK_MODEL = 'claude-haiku-4-5';

/**
 * Tier configs for runScan.
 *
 *   effort         — hloubka uvažování modelu (Opus 5.5: low … max)
 *   max_tokens     — strop výstupu VČETNĚ thinkingu (streaming → velký strop je OK)
 *   detailCount    — u kolika nejbližších vozů ze Sauto dotáhnout detail (výbava, stav)
 *   tableRows      — kolik srovnatelných vozů dostane model v tabulce
 *   searchWithData — web searchů, když máme data ze Sauto (jen doplněk: TipCars, známé vady)
 *   searchNoData   — web searchů, když Sauto data nemá (vzácný model) — jediný zdroj
 *
 * Hloubku markdown výstupu určuje prompt šablona (buildOutputSpec).
 */
interface TierConfig {
  effort: 'low' | 'medium' | 'high' | 'xhigh';
  max_tokens: number;
  detailCount: number;
  tableRows: number;
  searchWithData: number;
  searchNoData: number;
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  quick:    { effort: 'low',    max_tokens: 8000,  detailCount: 0,  tableRows: 15, searchWithData: 0, searchNoData: 5 },
  standard: { effort: 'medium', max_tokens: 12000, detailCount: 6,  tableRows: 20, searchWithData: 0, searchNoData: 7 },
  detailed: { effort: 'high',   max_tokens: 32000, detailCount: 10, tableRows: 25, searchWithData: 3, searchNoData: 9 },
  expert:   { effort: 'high',   max_tokens: 48000, detailCount: 14, tableRows: 30, searchWithData: 5, searchNoData: 9 },
};

/** Zahraniční scope přidá searchy na zahraniční portály. */
const INTERNATIONAL_EXTRA_SEARCHES = 4;

interface AnthropicContent {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContent[];
  stop_reason?: string | null;
}

function extractText(res: AnthropicResponse): string {
  // Bloky textu spojujeme BEZ oddělovače: web search dělí odpověď na více
  // text bloků (kvůli citacím) klidně uprostřed JSON řetězce — vložený '\n'
  // by JSON rozbil a posudek by skončil jen jako „zachráněný" fragment.
  return (res.content ?? [])
    .filter((b) => b.type === 'text' && b.text)
    .map((b) => b.text!)
    .join('');
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
    buyPrice: num('buyPrice'),
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
 * Timeout pro Anthropic API volání.
 *
 * Vercel Free:  10 s max → quick/standard by se vešly, detailed/expert NE.
 * Vercel Pro:   60 s max → detailed/expert (7–9 searchů) by se vešly.
 * Lokální dev:  300 s — žádný serverový limit, dáme dostatek prostoru.
 *
 * Na Vercelu nastavíme 55 s (těsně pod 60s limitem) a při překročení
 * vyhodíme čitelnou chybu dřív než Vercel vrátí anonymní 504.
 */
const CLAUDE_TIMEOUT_MS = process.env.VERCEL ? 55_000 : 300_000;

const TIMEOUT_MESSAGE =
  'TIMEOUT: Posudek trval příliš dlouho. ' +
  'Zkuste tier Standardní nebo Rychlý — nebo kontaktujte podporu pro přístup k detailním posudkům.';

/**
 * Server-side fallback: když bezpečnostní klasifikátor modelu požadavek
 * odmítne (stop_reason "refusal"), API ho samo zopakuje na doporučeném
 * záložním modelu v rámci téhož volání. U oceňování aut je to vzácné, ale
 * bez toho by uživatel dostal prázdný výsledek.
 */
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

/**
 * Volá Anthropic Messages API ve **streamovacím** režimu.
 *
 * Proč streaming: detailní/expertní posudek je dlouhý (vysoký max_tokens) a
 * nestreamovaný HTTP request by u takových délek riskoval timeout spojení
 * dřív, než se vůbec dogeneruje. Streaming drží spojení živé a my si průběžně
 * skládáme bloky obsahu i finální stop_reason — takže velký výstup spolehlivě
 * dojede až do konce. Bloky rekonstruujeme genericky (text / thinking /
 * server_tool_use / web_search_tool_result), aby je šlo poslat zpět při
 * obnově `pause_turn`.
 */
async function callClaude(body: object, betas: string[] = []): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY není nastaven na serveru.');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  try {
    let res: Response;
    try {
      res = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          ...(betas.length ? { 'anthropic-beta': betas.join(',') } : {}),
        },
        body: JSON.stringify({ ...body, stream: true }),
        cache: 'no-store',
        signal: controller.signal,
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

    return await parseSSEStream(res.body);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Skládá SSE stream Anthropic API do AnthropicResponse (obsah + stop_reason). */
async function parseSSEStream(body: ReadableStream<Uint8Array>): Promise<AnthropicResponse> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  type Block = Record<string, unknown> & { type?: string; text?: string };
  const blocks: Record<number, Block> = {};
  const partialJson: Record<number, string> = {};
  let stopReason: string | null = null;

  try {
    for (;;) {
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
              type?: string; text?: string; thinking?: string; signature?: string; partial_json?: string;
            };
            const b = (blocks[idx] ??= {});
            if (d.type === 'text_delta') b.text = (b.text ?? '') + (d.text ?? '');
            else if (d.type === 'thinking_delta') b.thinking = ((b.thinking as string) ?? '') + (d.thinking ?? '');
            // Podpis thinking bloku je nutný pro jeho vrácení při pause_turn —
            // bez něj by obnova turnu skončila chybou 400.
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
 * thinking / server_tool_use / web_search_tool_result) a necháme model
 * pokračovat. NEPŘIDÁVÁME nový user message — API obnoví turn samo.
 * Viz https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
 */
const MAX_PAUSE_CONTINUATIONS = 8;

async function callClaudeUntilDone(
  body: { messages: Array<{ role: string; content: unknown }> },
  betas: string[] = []
): Promise<{ finalText: string; combinedText: string; stopReason: string | null }> {
  const messages: Array<{ role: string; content: unknown }> = [...body.messages];
  let combinedText = '';
  let finalText = '';
  let stopReason: string | null = null;

  for (let attempt = 0; attempt <= MAX_PAUSE_CONTINUATIONS; attempt++) {
    const res = await callClaude({ ...body, messages }, betas);
    stopReason = res.stop_reason ?? null;
    finalText = extractText(res);
    if (finalText) combinedText += (combinedText ? '\n' : '') + finalText;

    if (stopReason !== 'pause_turn') break;

    // Obnov pozastavený turn — vrať asistentův dosavadní obsah a pokračuj.
    messages.push({ role: 'assistant', content: res.content });
  }

  if (stopReason === 'refusal' && !finalText) {
    throw new Error('Model odmítl požadavek zpracovat. Zkuste upravit poznámky k vozu a ocenění zopakovat.');
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
  if (car.equipment && car.equipment.length > 0) {
    lines.push(`Výbava: ${car.equipment.join(', ')}`);
  }
  if (car.notes) lines.push(`Poznámky uživatele: ${car.notes}`);

  return lines.join('\n');
}

function buildPortalsLine(scope: 'czech' | 'international', hasMarket: boolean, searches: number): string {
  if (searches <= 0) {
    return 'Webové vyhledávání v tomto tieru nemáš — vycházej z dat Sauto.cz níže.';
  }
  if (scope === 'international') {
    return hasMarket
      ? 'Český trh máš níže přímo ze Sauto.cz. Webovým vyhledáváním doplň srovnání se zahraničím: mobile.de, AutoScout24.de (Německo), otomoto.pl (Polsko), willhaben.at (Rakousko) — zda se vyplatí dovoz / kde je vůz levnější.'
      : 'Prohledej portály Sauto.cz, TipCars.cz (ČR), mobile.de, AutoScout24.de (Německo), otomoto.pl (Polsko), lacentrale.fr (Francie), willhaben.at (Rakousko) a najdi aktuální inzeráty.';
  }
  return hasMarket
    ? 'Aktuální nabídku ze Sauto.cz máš níže (načtenou přímo s filtry). Webové vyhledávání použij JEN doplňkově: ověř nabídku na TipCars.cz / AutoScout24.cz a dohledej známé vady konkrétního motoru. Sauto znovu nevyhledávej.'
    : 'Data ze Sauto.cz se nepodařilo načíst (vzácný model nebo výpadek). Prohledej Sauto.cz, TipCars.cz, AutoScout24.cz a najdi aktuální inzeráty srovnatelných vozů (stejný model, rok ±1–2, podobný nájezd, palivo, převodovka).';
}

function buildCurrencyNote(scope: 'czech' | 'international'): string {
  return scope === 'international'
    ? 'Všechny ceny uváděj v CZK. EUR převádej kurzem ~25 CZK/EUR, PLN kurzem ~5,8 CZK/PLN.\n'
    : '';
}

/**
 * Metodika oceňování — jak z tabulky srovnatelných vozů dojít k ceně.
 * Odpovídá postupu zkušeného bazarníka: filtr na Sauto → rozpětí → pozice
 * konkrétního vozu v rozpětí podle výbavy a stavu.
 */
function buildMethodology(hasMarket: boolean): string {
  const common =
    '- Uvedené ceny inzerátů jsou NABÍDKOVÉ. Skutečné prodejní ceny bývají v ČR typicky o 3–7 % nižší (vyjednávání); ' +
    'vozy dlouho v inzerci (90+ dní) jsou obvykle předražené — dávej jim menší váhu.\n' +
    '- Výkupní cena (buyPrice) = cena, za kterou má autobazar vůz koupit, aby ho prodal se ziskem: doporučená prodejní ' +
    'cena minus marže, příprava vozu (STK, servis, detailing), riziko a čas prodeje. Typicky 10–20 % pod prodejní cenou — ' +
    'méně u likvidních a levnějších vozů, více u drahých, málo likvidních nebo s rizikem (havárie, chybějící servis).\n' +
    '- Nikdy si nevymýšlej inzeráty, ceny ani odkazy.\n';

  if (!hasMarket) {
    return (
      'METODIKA OCENĚNÍ (povinná):\n' +
      '- Najdi co nejvíce opravdu srovnatelných vozů (stejný model a motorizace, rok ±1–2, podobný nájezd, stejné palivo a převodovka).\n' +
      '- Rozdíly v nájezdu přepočti (orientačně −2 až −3 % ceny na každých +10 000 km) a v roce (≈ +6–10 % za každý rok mladší).\n' +
      '- Z přepočtených cen vezmi medián jako výchozí bod, pak ho posuň podle výbavy a stavu tohoto vozu.\n' +
      common
    );
  }

  return (
    'METODIKA OCENĚNÍ (povinná):\n' +
    '1. Výchozí bod = MEDIÁN PŘEPOČTENÝCH cen ze Sauto (cena běžně vybaveného vozu v běžném stavu se stejným rokem a nájezdem jako oceňovaný vůz).\n' +
    '2. Najdi v tabulce vozy nejpodobnější oceňovanému (motorizace/výkon, verze výbavy, pohon, karoserie) a dej jim největší váhu. ' +
    'Pokud tabulka míchá motorizace, pracuj hlavně s vozy se stejným nebo podobným výkonem.\n' +
    '3. Pozici vozu v pásmu P25–P75 urči podle výbavy a stavu oproti srovnávaným vozům ' +
    '(odlišující výbava, servisní knížka, 1. majitel, ČR původ, havárie, technický stav, lak). ' +
    'Mimo pásmo P25–P75 jdi jen s konkrétním zdůvodněním.\n' +
    '4. Pokud uživatel stav/výbavu neuvedl, předpokládej běžný stav a výbavu — a otevřeně napiš, že upřesněním lze odhad zpřesnit.\n' +
    '5. minPrice/maxPrice = realistické pásmo prodejní ceny TOHOTO vozu (ne min/max celé nabídky).\n' +
    '6. V markdownu odkazuj na konkrétní srovnávané vozy z tabulky (markdown odkaz [Sauto](URL) z tabulky).\n' +
    common
  );
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

/** Společná hlavička JSON výstupu — stejná pro všechny tiery. */
function buildJsonHeader(hasMarket: boolean, listingHint: string, summaryHint: string): string {
  const sourcesHint = hasMarket
    ? '<pouze inzeráty z JINÝCH portálů než Sauto.cz, které jsi skutečně našel webovým vyhledáváním: portal, url, price, title (max 80 znaků, jen vůz — žádné údaje o prodejci); jinak prázdné pole []>'
    : `<${listingHint} různých skutečně nalezených inzerátů: portal, url, price, title (max 80 znaků, jen vůz — žádné údaje o prodejci)>`;
  return `{
  "averagePrice": <doporučená prodejní (inzertní) cena TOHOTO vozu v CZK, celé číslo>,
  "minPrice": <dolní hranice realistického pásma prodejní ceny tohoto vozu v CZK>,
  "maxPrice": <horní hranice realistického pásma prodejní ceny tohoto vozu v CZK>,
  "buyPrice": <doporučená výkupní cena pro autobazar v CZK>,
  "listingCount": <počet inzerátů, ze kterých odhad vychází>,
  "sources": [${sourcesHint}],
  "summary": "${summaryHint}",`;
}

/**
 * Tier-specific output specification. THIS IS WHERE THE DEPTH LIVES.
 *
 *   quick    → Just enough: price + short table + 1-line summary.
 *   standard → Adds breakdown + paragraph reasoning.
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
function buildOutputSpec(tier: string, hasMarket: boolean): string {
  if (tier === 'quick') {
    return `Vrať VÝHRADNĚ validní JSON objekt — žádný jiný text, žádné markdown bloky:
${buildJsonHeader(hasMarket, '3+', '2–3 věty o tržní situaci a doporučení k ceně')}
  "markdownText": "## 💰 Tržní cena\\n- **Doporučená prodejní cena:** X Kč\\n- **Pásmo:** min – max Kč\\n- **Výkupní cena pro bazar:** Y Kč\\n\\n## 🔍 Nejbližší srovnatelné vozy\\n| Rok | Km | Verze | Cena | Odkaz |\\n|-----|----|-------|------|-------|\\n| 5 řádků |\\n\\n## 💡 Shrnutí\\nKrátké shrnutí + na čem cena nejvíc závisí."
}`;
  }

  if (tier === 'standard') {
    return `Vrať VÝHRADNĚ validní JSON objekt — žádný jiný text:
${buildJsonHeader(hasMarket, '5+', '3–4 věty')}
  "markdownText": "Středně rozsáhlý markdown obsahující:\\n\\n## 💰 Tržní cena\\n- **Doporučená prodejní cena:** X Kč\\n- **Pásmo:** min – max Kč\\n- **Výkupní cena pro bazar:** Y Kč\\n- Pozice vozu v rámci nabídky (kvartil) a proč\\n\\n## 🔍 Srovnatelné inzeráty\\nTabulka 6–8 nejbližších vozů (Rok | Km | Verze/výkon | Cena | Odkaz)\\n\\n## ⚖️ Faktory ovlivňující cenu\\nOdůvodnění v 4–6 bodech (nájezd, výbava, stav, motorizace) s orientačním vlivem v Kč.\\n\\n## 💡 Doporučení\\n2–3 věty pro prodejce i výkupčího."
}`;
  }

  if (tier === 'detailed') {
    return `Vrať VÝHRADNĚ validní JSON objekt. Toto je PLACENÝ DETAILNÍ POSUDEK — uživatel za něj platí výrazně víc než za rychlou cenu, takže markdownText MUSÍ obsahovat VŠECHNY následující sekce v plné délce. NEZKRACUJ. Pokud něco neznáš, otevřeně to napiš ("nelze dohledat z dostupných zdrojů"), ale sekci nevynechej.

${buildJsonHeader(hasMarket, '8+', '4–6 vět souhrnu klíčových zjištění (pozice v trhu, hlavní rizika, doporučení).')}
  "markdownText": "ROZSÁHLÁ profesionální analýza v markdownu obsahující VŠECHNY následující sekce. Každá sekce začíná H2 nadpisem (##) s emoji. Mezi sekcemi prázdný řádek:\\n\\n## 💰 Tržní cena a pásmo spolehlivosti\\n- **Doporučená prodejní cena:** X Kč\\n- **Doporučená výkupní cena (pro autobazar):** Y Kč\\n- Pásmo: min — max\\n- 25. percentil / medián / 75. percentil srovnatelných vozů\\n- Pozice tohoto vozu v rámci nabídek (např. 'v dolní třetině díky vyššímu nájezdu')\\n\\n## 📊 Srovnatelné inzeráty (tabulka, min. 8 řádků)\\nTabulka: Model/verze | Rok | Najeto | Výkon | Cena | Přepočteno | Link\\nPod tabulkou: identifikace odlehlých hodnot (které inzeráty výrazně vybočují a proč).\\n\\n## 🔧 Vliv výbavy a stavu na cenu (rozpad cenových úprav)\\nKonkrétní +/− CZK částky pro každý faktor oproti mediánu srovnatelných vozů:\\n- Výbava (každý odlišující prvek samostatně, např. tažné zařízení +6 000 Kč, navigace +4 000 Kč, ...)\\n- Motorizace / výkon\\n- Technický stav vůči průměru\\n- Stav laku a karoserie\\n- Nehodovost (pokud nehod) — odhad slevy\\n- Servisní historie (plná +X, částečná 0, žádná −Y)\\n- Najetých km vs benchmark pro daný rok (15 000 km/rok)\\n- Počet majitelů\\n\\n## 📈 Tržní situace pro tento model\\n- Kolik srovnatelných vozů je aktuálně v nabídce (konkurence)\\n- Likvidita modelu (jak dlouho typicky stojí v inzerci — viz sloupec dní v inzerci)\\n- Sezónní vliv — kdy se prodává nejrychleji a za nejlepší cenu\\n- Trend ceny (rostoucí/stagnující/klesající), pokud ho lze odhadnout\\n\\n## ⚠️ Známá rizika a problémy modelu/motoru\\n- Typické mechanické a elektronické závady pro tento model+motor+rok\\n- Předpokládané servisní náklady na nejbližší rok\\n- Co kupující obvykle požadují před koupí (zkušební jízda, TPi, výměna konkrétních dílů)\\n- Doklady, které by měly být k dispozici (TP, servisní knížka, doklad o stavu km)\\n\\n## 💡 Doporučení k prodeji a výkupu\\n- **Pro prodejce:**\\n  - Optimální cena pro rychlý prodej (do 30 dní): X Kč\\n  - Optimální cena pro trpělivý prodej (60–90 dní): Y Kč\\n  - Vyjednávací prostor (kolik nechat na slevě)\\n  - Klíčové prodejní argumenty (silné stránky vozu vůči konkurenci)\\n- **Pro výkup / kupujícího:**\\n  - Maximální cena, kterou se vyplatí nabídnout\\n  - Body vyjednávání (na čem stáhnout cenu)\\n  - Co zkontrolovat před koupí (TOP 5 položek)"
}`;
  }

  if (tier === 'expert') {
    return `Vrať VÝHRADNĚ validní JSON objekt. Toto je NEJVYŠŠÍ TIER — EXPERTNÍ POSUDEK na úrovni profesionálního znaleckého odhadu. Uživatel platí maximum, takže markdownText MUSÍ obsahovat VŠECHNY následující sekce v plné délce a hloubce. NIKDY NEZKRACUJ — pokud informaci neznáš, napiš to explicitně, ale sekci nevynechej.

${buildJsonHeader(hasMarket, '12+', '6–8 vět executive summary s klíčovými zjištěními.')}
  "markdownText": "EXPERTNÍ posudek v markdownu — VŠECHNY sekce povinné:\\n\\n## 📋 Executive summary\\nKrátký rámec (4–6 vět) — co vůz je, kde se nachází na trhu, hlavní příležitosti a rizika, finální doporučení.\\n\\n## 💰 Tržní cena a pásmo spolehlivosti\\n- **Doporučená prodejní cena:** X Kč\\n- **Doporučená výkupní cena (pro autobazar):** Y Kč\\n- Pásmo: min — max\\n- 25. / 50. / 75. percentil srovnatelných vozů\\n- Pozice tohoto konkrétního vozu (kvartil + odůvodnění)\\n\\n## 📊 Srovnatelné inzeráty (tabulka, min. 12 řádků)\\nTabulka: Model/verze | Rok | Najeto | Výkon | Cena | Přepočteno | Odchylka od mediánu | Link\\nPod tabulkou: detailní analýza odlehlých hodnot.\\n\\n## 🔧 Rozpad cenových úprav (detailní)\\nPro každý faktor uveď konkrétní +/− CZK oproti mediánu srovnatelných vozů + zdůvodnění:\\n- Výbava — každý odlišující prvek samostatně s částkou\\n- Motorizace / výkon\\n- Technický stav vůči průměru segmentu\\n- Stav laku, karoserie, interiéru\\n- Nehodovost a její vliv\\n- Servisní historie\\n- Najetých km vs benchmark\\n- Počet majitelů\\n- Země původu (CZ původ vs import)\\n\\n## 📈 Cenový trend a prognóza\\n- Odhad vývoje ceny za posledních 12 měsíců (+/− %)\\n- Sezónní křivka pro tento segment\\n- Prognóza vývoje na nejbližších 3–6 měsíců\\n- Faktory, které mohou cenu posunout (legislativa, nový model, …)\\n\\n## 🌍 Regionální srovnání\\n- Praha vs venkov\\n- Morava vs Čechy\\n- Importované vs domácí vozy\\n- Tipy: kde se prodává nejlépe / kde nejlevněji koupit\\n\\n## 🔬 VIN a historie vozu\\n${'${vinHint}'}\\n- Doporučení na ověření přes Cebia / VIN dekodér\\n- Co prověřit (nájezd, počet majitelů, exporty, leasing)\\n\\n## 💼 Investiční pohled\\n- Odhad zbytkové hodnoty za 1 / 3 / 5 let (CZK)\\n- Roční depreciace v %\\n- Vhodnost pro: krátkodobé držení / dlouhodobé držení / fleet\\n- Alternativy ze stejné kategorie, které drží hodnotu lépe\\n\\n## 🛠 Náklady vlastnictví (TCO) na 3 roky\\nKonkrétní roční částky:\\n- Pravidelný servis\\n- Očekávané výměny (rozvody, brzdy, pneu)\\n- Pojištění (povinné + havarijní orientačně)\\n- Spotřeba × roční nájezd × cena paliva\\n- Dálniční známka\\n- Celkový roční náklad + tříletý součet\\n\\n## ⚠️ Známá rizika a problémy modelu\\n- Typické mechanické a elektronické závady (motor, převodovka, elektronika)\\n- Závady spojené s vyšším nájezdem\\n- Doporučené preventivní výměny\\n- Co kupující obvykle požadují před koupí\\n\\n## 📋 Pre-purchase / Pre-sale checklist (10–15 bodů)\\n${'${checklistHint}'}\\n\\n## 🎯 Strategická doporučení\\n- Optimální čas prodeje/koupě\\n- Inzertní strategie (kde inzerovat, klíčové fráze, doporučené fotografie)\\n- Cenová strategie (nasazená cena → konečná cena, slevová elasticita)\\n- Vyjednávací prostor\\n- Plán B pokud se vůz neprodá za 60 dní"
}`;
  }

  // Fallback to standard
  return buildOutputSpec('standard', hasMarket);
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
    }))
    // Jen skutečné http(s) odkazy — model občas vrátí placeholder „https://..."
    .filter((s) => /^https?:\/\/[^\s.]+\.[^\s]+/.test(s.url) && !s.url.includes('...'));
}

/** Nejbližší vozy ze Sauto jako zdroje (skutečné odkazy, ne výstup modelu). */
function sautoSources(market: SautoMarket, count: number): ScanData['sources'] {
  return market.listings.slice(0, count).map((l) => ({
    portal: 'Sauto.cz',
    url: l.url,
    price: l.price,
    title: sanitizeText(`${l.title}, ${l.year}, ${l.km.toLocaleString('cs-CZ')} km`, 100),
  }));
}

/** Shrnutí trhu, které se vrací do UI (odkaz na stejné hledání na Sauto). */
function marketSummary(market: SautoMarket): NonNullable<ScanData['market']> {
  return {
    portal: 'Sauto.cz',
    searchUrl: market.searchUrl,
    filterDescription: market.filterDescription,
    totalMatching: market.totalMatching,
    analyzed: market.listings.length,
    askingMedian: market.asking.median,
    adjustedMedian: market.adjusted.median,
    adjustedP25: market.adjusted.p25,
    adjustedP75: market.adjusted.p75,
  };
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
 * Pojistka proti nesmyslné ceně z modelu: když máme spolehlivá data ze Sauto
 * a model vrátí cenu daleko mimo přepočtené pásmo (překlep, chybná jednotka),
 * použijeme medián trhu. Úpravy za výbavu/stav se do ±40 % vejdou vždy.
 */
function sanePrice(modelPrice: number, market: SautoMarket | null): number {
  if (!market || market.listings.length < 5) return modelPrice;
  const ref = market.adjusted.median;
  if (!modelPrice || modelPrice < ref * 0.6 || modelPrice > ref * 1.4) {
    console.warn(`[run-scan] model price ${modelPrice} far from market median ${ref} — using market median`);
    return ref;
  }
  return modelPrice;
}

/**
 * Runs a fresh valuation for the given car.
 *
 * 1. Sauto.cz: filtrované vyhledávání srovnatelných vozů + přepočet na rok a
 *    nájezd (src/lib/sauto.ts) — deterministický základ ceny.
 * 2. Claude Opus 5.5: zařadí konkrétní vůz do pásma podle výbavy a stavu,
 *    napíše posudek; web search jen doplňkově (nebo jako jediný zdroj, když
 *    Sauto data nemá).
 *
 * The `tier` parameter (quick / standard / detailed / expert) controls the
 * reasoning effort, Sauto detail depth, web search budget AND the depth of
 * the markdown output (see TIER_CONFIGS, buildOutputSpec).
 *
 * The `scope` parameter:
 *   'czech'         — Sauto.cz (+ TipCars/AutoScout24 doplňkově)
 *   'international' — navíc srovnání s mobile.de, otomoto.pl, willhaben.at, …
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
  const scopeNormalized: 'czech' | 'international' = scope === 'international' ? 'international' : 'czech';

  const market = await fetchSautoMarket(car, config.detailCount);
  const hasMarket = market !== null && market.listings.length >= 5;

  let maxSearches = hasMarket ? config.searchWithData : config.searchNoData;
  if (scopeNormalized === 'international') maxSearches += INTERNATIONAL_EXTRA_SEARCHES;

  const carBlock = buildCarBlock(car);
  const portalsLine = buildPortalsLine(scopeNormalized, hasMarket, maxSearches);
  const currencyNote = buildCurrencyNote(scopeNormalized);

  let outputSpec = buildOutputSpec(tier, hasMarket);
  if (tier === 'expert') {
    outputSpec = fillExpertPlaceholders(outputSpec, car);
  }

  const marketBlock = market
    ? `DATA Z TRHU — Sauto.cz (aktuální nabídka ojetých vozů, načtená přímo přes filtry jako při ručním hledání; ` +
      `ceny a odkazy jsou skutečné):\n${formatMarketForPrompt(market, config.tableRows)}\n\n`
    : '';

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
    `Oceňuješ tento konkrétní vůz:\n${carBlock}\n\n` +
    marketBlock +
    priorBlock +
    `${portalsLine}\n\n` +
    buildMethodology(hasMarket) + '\n' +
    currencyNote +
    `${COMPLIANCE_RULES}\n` +
    outputSpec;

  // System prompt scales with tier to set the right "voice" and depth expectation.
  const systemBase =
    'Jsi zkušený oceňovatel ojetých vozů pro české autobazary. Cenu určuješ jako profesionální výkupčí: ' +
    'z aktuální nabídky srovnatelných vozů a z rozdílů ve výbavě, stavu a historii konkrétního vozu. ' +
    'Pracuješ s čísly přesně a každý posun ceny zdůvodníš. ' +
    'Výsledek vracíš VÝHRADNĚ jako validní JSON objekt — žádný jiný text, žádné markdown bloky obalující JSON. ' +
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

  const requestBody = {
    model: VALUATION_MODEL,
    max_tokens: config.max_tokens,
    output_config: { effort: config.effort },
    fallbacks: 'default',
    system: systemBase + systemTierSuffix,
    ...(maxSearches > 0
      ? { tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches }] }
      : {}),
    messages: [{ role: 'user', content: userMessage }],
  };

  let completion: Awaited<ReturnType<typeof callClaudeUntilDone>>;
  try {
    completion = await callClaudeUntilDone(requestBody, [FALLBACK_BETA]);
  } catch (err) {
    // Fallback je beta — kdyby ho API pro tuto kombinaci nástrojů odmítlo,
    // ocenění nesmí spadnout: zopakuj bez něj.
    if (err instanceof Error && /chyba 400/.test(err.message) && /fallback/i.test(err.message)) {
      console.warn('[run-scan] fallbacks rejected, retrying without:', err.message);
      const { fallbacks: _omit, ...withoutFallbacks } = requestBody;
      completion = await callClaudeUntilDone(withoutFallbacks);
    } else {
      throw err;
    }
  }
  const { finalText, combinedText } = completion;

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

  const averagePrice = sanePrice(Number(parsed.averagePrice) || 0, hasMarket ? market : null);
  let minPrice = Number(parsed.minPrice) || 0;
  let maxPrice = Number(parsed.maxPrice) || 0;
  if (hasMarket && (!minPrice || !maxPrice || minPrice > averagePrice || maxPrice < averagePrice)) {
    minPrice = Math.min(market!.adjusted.p25, averagePrice);
    maxPrice = Math.max(market!.adjusted.p75, averagePrice);
  }
  let buyPrice = Number(parsed.buyPrice) || 0;
  if (averagePrice && (!buyPrice || buyPrice >= averagePrice || buyPrice < averagePrice * 0.6)) {
    buyPrice = Math.round((averagePrice * 0.85) / 1000) * 1000;
  }

  const webSources = sanitizeSources(parsed.sources).filter((s) => !/sauto\.cz/i.test(s.url));
  const sources = [
    ...(market ? sautoSources(market, Math.min(10, config.tableRows)) : []),
    ...webSources,
  ];
  const listingCount = market
    ? market.listings.length + webSources.length
    : Number(parsed.listingCount) || webSources.length;

  const fallbackMarkdown =
    `## 💰 Odhad tržní ceny\n` +
    `- **Doporučená prodejní cena:** ${averagePrice.toLocaleString('cs-CZ')} Kč\n` +
    `- **Pásmo:** ${minPrice.toLocaleString('cs-CZ')} – ${maxPrice.toLocaleString('cs-CZ')} Kč\n` +
    `- **Výkupní cena pro bazar:** ${buyPrice.toLocaleString('cs-CZ')} Kč\n\n` +
    `## 💡 Shrnutí\n${parsed.summary ?? ''}`;

  return {
    averagePrice,
    minPrice,
    maxPrice,
    buyPrice,
    listingCount,
    sources,
    market: market ? marketSummary(market) : undefined,
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
      vykonKw:    car.powerKw ?? '',
      stav:       car.techCondition ?? '',
      nehody:     car.accidents ?? '',
      servis:     car.serviceHistory ?? '',
      majitele:   car.owners ?? '',
      vybava:     car.equipment ?? [],
    },
    summary:      sanitizeText(parsed.summary ?? '', 2000),
    markdownText: String(parsed.markdownText ?? fallbackMarkdown),
  };
}

/**
 * Monitoring scan: když má Sauto dost srovnatelných vozů, cena se spočítá
 * čistě statisticky z aktuální nabídky (přepočtený medián + kvartily) —
 * bez AI, okamžitě a přesněji než odhad z „paměti" modelu.
 * Jen u vzácných modelů (málo dat) se použije levný Haiku odhad.
 */
export async function runMonitorScan(car: CarInput): Promise<ScanData> {
  const market = await fetchSautoMarket(car, 0);
  if (market && market.listings.length >= 5) {
    const fmt = (n: number) => n.toLocaleString('cs-CZ');
    const summary =
      `Medián ${market.listings.length} srovnatelných vozů na Sauto.cz (${market.filterDescription}), ` +
      `přepočtený na rok a nájezd tohoto vozu: ${fmt(market.adjusted.median)} Kč ` +
      `(běžné pásmo ${fmt(market.adjusted.p25)}–${fmt(market.adjusted.p75)} Kč). ` +
      `Pozici v pásmu určuje hlavně výbava a stav.`;
    return {
      averagePrice: market.adjusted.median,
      minPrice: market.adjusted.p25,
      maxPrice: market.adjusted.p75,
      listingCount: market.listings.length,
      sources: sautoSources(market, 5),
      market: marketSummary(market),
      modelInput: {
        brand:      car.brand,
        model:      car.model,
        rok:        car.year,
        km:         car.mileage ?? 0,
        prevodovka: car.transmission ?? '',
        palivo:     car.fuel ?? '',
      },
      summary,
      markdownText:
        `## 💰 Tržní hodnota\n` +
        `- **Medián trhu:** ${fmt(market.adjusted.median)} Kč\n` +
        `- **Pásmo:** ${fmt(market.adjusted.p25)} – ${fmt(market.adjusted.p75)} Kč\n\n` +
        `## 💡 Shrnutí\n${summary}`,
    };
  }

  return runMonitorScanWithModel(car);
}

/** Záložní odhad bez dat z trhu: Haiku z naučených znalostí trhu. */
async function runMonitorScanWithModel(car: CarInput): Promise<ScanData> {
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
    model: MONITOR_FALLBACK_MODEL,
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
