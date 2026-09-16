import type { CarInput, ScanData } from './market-cache';
import type { PriceStatsPrior } from './price-stats';
import { computeValuation, type Comparable } from './valuation';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * Modely. Přesnost nacenění stojí na (a) počtu a kvalitě nalezených inzerátů
 * a (b) serverové statistice ve valuation.ts — ne na „pocitu“ modelu. Proto
 * pro rychlý–detailní tier stačí Sonnet 5 (levný, rychlý, s web search
 * s dynamickým filtrováním); expertní posudek jede na Opus 5 (hlubší analýza
 * rizik, TCO, strategie). Oboje přepsatelné env proměnnou.
 */
const SCAN_MODEL = process.env.ANTHROPIC_SCAN_MODEL || 'claude-sonnet-5';
const EXPERT_MODEL = process.env.ANTHROPIC_EXPERT_MODEL || 'claude-opus-5';
const MONITOR_MODEL = process.env.ANTHROPIC_MONITOR_MODEL || 'claude-haiku-4-5';

/**
 * Tier configs for runScan (price estimator with live web search).
 *
 *   max_tokens  — rozpočet odpovědi (hloubka markdownu)
 *   max_search  — kolik hledání smí model provést (víc = víc inzerátů = stabilnější medián)
 *   effort      — hloubka adaptivního uvažování (výběr dotazů, párování inzerátů)
 *   min_comps   — kolik strojově čitelných inzerátů po modelu chceme
 */
type EffortLevel = 'low' | 'medium' | 'high' | 'xhigh';
interface TierConfig {
  model: string;
  max_tokens: number;
  max_search: number;
  effort: EffortLevel;
  min_comps: number;
}
const TIER_CONFIGS: Record<string, TierConfig> = {
  quick:    { model: SCAN_MODEL,   max_tokens: 5000,  max_search: 6,  effort: 'low',    min_comps: 6  },
  standard: { model: SCAN_MODEL,   max_tokens: 8000,  max_search: 9,  effort: 'low',    min_comps: 8  },
  detailed: { model: SCAN_MODEL,   max_tokens: 14000, max_search: 12, effort: 'medium', min_comps: 10 },
  expert:   { model: EXPERT_MODEL, max_tokens: 18000, max_search: 16, effort: 'medium', min_comps: 12 },
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

  // Poslední „{“ … poslední „}“ — model občas před JSON napíše větu.
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first >= 0 && last > first) {
    try { return JSON.parse(t.slice(first, last + 1)); } catch (_) { /* fall through */ }
  }

  throw new Error('Nepodařilo se parsovat JSON z odpovědi Claude. Surový text: ' + t.slice(0, 300));
}

/**
 * Záchrana z JSON oříznutého uprostřed (typicky uprostřed markdownText při
 * dosažení max_tokens). Vytáhne dohledatelné ceny, comparables a co nejvíc už
 * napsaného markdownu, aby uživatel i tak dostal použitelný (byť neúplný)
 * posudek. Vrací null, pokud nelze zachránit vůbec nic.
 */
function salvageTruncatedJson(text: string): Record<string, unknown> | null {
  const num = (key: string): number => {
    const m = text.match(new RegExp('"' + key + '"\\s*:\\s*(\\d+)'));
    return m ? Number(m[1]) : 0;
  };

  let comparables: unknown[] = [];
  const compsMatch = text.match(/"comparables"\s*:\s*\[([\s\S]*?)\]\s*,\s*"/);
  if (compsMatch) {
    try { comparables = JSON.parse('[' + compsMatch[1] + ']'); } catch { /* ignore */ }
  }

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
      .replace(/\\?"?\s*[}\]]*\s*$/, '')
      .replace(/\n[^\n]*$/, '\n');
  }

  const averagePrice = num('averagePrice');
  if (!markdown.trim() && !averagePrice && comparables.length === 0) return null;

  return {
    averagePrice,
    minPrice: num('minPrice'),
    maxPrice: num('maxPrice'),
    listingCount: num('listingCount'),
    comparables,
    sources: [],
    summary: '',
    markdownText:
      (markdown.trim() || '## Odhad tržní ceny\n_Posudek se nepodařilo dokončit._') +
      '\n\n---\n_Posudek byl zkrácen kvůli své délce — výše je vše, co se stihlo vygenerovat. ' +
      'Pro úplný výstup zkuste posudek zopakovat nebo zvolit nižší tier._',
  };
}

/**
 * CELKOVÝ časový rozpočet na jeden posudek (NIKOLIV per-call).
 *
 * detailed/expert se kvůli web_search volá opakovaně ve smyčce (pause_turn).
 * Držíme JEDEN sdílený deadline pro celou operaci těsně pod route `maxDuration`
 * (= 300 s), abychom se korektně přerušili s čitelnou hláškou dřív než Vercel.
 */
const CLAUDE_TOTAL_BUDGET_MS = process.env.VERCEL ? 285_000 : 300_000;
const MONITOR_BUDGET_MS = 90_000;

const TIMEOUT_MESSAGE =
  'TIMEOUT: Posudek trval příliš dlouho. ' +
  'Zkuste tier Standardní nebo Rychlý — nebo to zopakujte za chvíli.';

/**
 * Volá Anthropic Messages API ve **streamovacím** režimu (dlouhé výstupy by
 * jinak riskovaly timeout spojení). Bloky rekonstruujeme genericky, aby je šlo
 * poslat zpět při obnově `pause_turn`.
 */
async function callClaude(body: object, signal?: AbortSignal, budgetMs = CLAUDE_TOTAL_BUDGET_MS): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY není nastaven na serveru.');

  const ownController = signal ? null : new AbortController();
  const timeoutId = ownController
    ? setTimeout(() => ownController.abort(), budgetMs)
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
 * odpovědí. Pošleme zpět asistentův dosavadní obsah a necháme model pokračovat.
 * NEPŘIDÁVÁME nový user message — API obnoví turn samo.
 */
const MAX_PAUSE_CONTINUATIONS = 6;

async function callClaudeUntilDone(
  body: { messages: Array<{ role: string; content: unknown }> }
): Promise<{ finalText: string; combinedText: string; stopReason: string | null }> {
  const messages: Array<{ role: string; content: unknown }> = [...body.messages];
  let combinedText = '';
  let finalText = '';
  let stopReason: string | null = null;

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

        messages.push({ role: 'assistant', content: res.content });
      } catch (err) {
        // Vypršel-li sdílený deadline AŽ POTÉ, co už máme nasbíraný nějaký
        // obsah, vrať částečný výstup a nech salvage vytvořit aspoň neúplný posudek.
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

/**
 * Strategie hledání — nejdůležitější část pro přesnost. Model má konkrétní
 * návod, JAK hledat (portály, tvar dotazů, rozsah roku/km), CO vyřadit
 * (havarované, nepojízdné, jiné generace) a JAK z náhledu vytěžit čísla.
 */
function buildSearchStrategy(car: CarInput, scope: 'czech' | 'international', minComps: number, maxSearch: number): string {
  const year = Number(car.year);
  const km = Number(car.mileage) || 0;
  const kmLo = km ? Math.max(0, Math.round((km - 40_000) / 1000)) : null;
  const kmHi = km ? Math.round((km + 40_000) / 1000) : null;
  const engineHint = [car.fuel, car.powerKw ? `${car.powerKw} kW` : '', car.trim].filter(Boolean).join(' ');

  const portals = scope === 'international'
    ? 'sauto.cz, tipcars.cz, autoscout24.cz, autoesa.cz, aaaauto.cz (ČR) a mobile.de, autoscout24.de, otomoto.pl, willhaben.at'
    : 'sauto.cz, tipcars.cz, autoscout24.cz, autoesa.cz, aaaauto.cz, bazos.cz';

  return (
    `STRATEGIE HLEDÁNÍ (máš max. ${maxSearch} hledání — využij je na RŮZNÉ dotazy, ne na opakování):\n` +
    `- Portály: ${portals}. Používej operátor site:, např. "site:sauto.cz ${car.brand} ${car.model} ${year}" nebo "${car.brand} ${car.model} ${year - 1}..${year + 1} ${engineHint} km cena".\n` +
    `- Cílový rozsah: rok ${year - 1}–${year + 1}` + (km ? `, nájezd cca ${kmLo}–${kmHi} tis. km` : '') +
    `, stejná generace modelu, stejné palivo` + (car.transmission ? ` a převodovka (${car.transmission})` : '') + (car.powerKw ? `, podobný výkon (${car.powerKw} kW ±20 %)` : '') + `.\n` +
    `- Z náhledu výsledků (titulek + popis) vytěž cenu, rok, nájezd, výkon a převodovku KAŽDÉHO relevantního inzerátu. Inzerát bez čitelné ceny NEZAPOČÍTÁVEJ.\n` +
    `- VYŘAĎ: havarované / poškozené / nepojízdné / „na díly“, vozy s nejasnou cenou („cena dohodou“, „info v RK“), odkupy leasingu, ceny bez DPH pokud jde o firemní nabídku (přepočti na cenu s DPH), aukce a ceníky nových vozů.\n` +
    `- Cíl: aspoň ${minComps} různých inzerátů STEJNÉHO modelu a generace. Pokud jich najdeš méně, doplň příbuznými (jiná generace / karoserie) a označ je sameModel=false.\n` +
    `- Preferuj čerstvé inzeráty (aktuálně v nabídce). Každý inzerát uveď jen jednou (stejné URL / stejný vůz na více portálech = 1 záznam).\n`
  );
}

function buildCurrencyNote(scope: 'czech' | 'international'): string {
  return scope === 'international'
    ? 'Všechny ceny uváděj v CZK. EUR převáděj kurzem ~25 CZK/EUR, PLN kurzem ~5,8 CZK/PLN. U zahraničních vozů počítej s náklady dovozu a přihlášení (~15–25 tis. Kč) — v comparables uveď cenu přepočtenou do CZK bez těchto nákladů, v textu je zmiň.\n'
    : '';
}

/**
 * Pravidla nakládání s daty z inzerátů (GDPR + zvláštní právo pořizovatele
 * databáze, směrnice 96/9/ES). Vkládá se do KAŽDÉHO scan promptu.
 */
const COMPLIANCE_RULES =
  'PRAVIDLA PRÁCE S DATY Z INZERÁTŮ (povinná):\n' +
  '- Nikdy neextrahuj ani nevracej osobní údaje z inzerátů: jména prodejců, telefonní čísla, e-maily, přesné adresy.\n' +
  '- V polích "sources" a "comparables" uváděj pouze faktické údaje: portál, URL, cenu, rok, nájezd, motorizaci a krátký titulek vozu.\n' +
  '- Titulek inzerátu max. 80 znaků a pouze značka / model / motorizace / rok / nájezd — žádné údaje o prodejci.\n' +
  '- Necituj texty inzerátů doslovně; vlastními slovy parafrázuj. Z každého inzerátu přebírej jen minimum nutné pro cenové srovnání.\n';

const COMPARABLES_SPEC =
  '"comparables": [ { "portal": "Sauto.cz", "url": "https://...", "price": <CZK celé číslo s DPH>, "year": <rok>, "mileageKm": <km celé číslo>, "powerKw": <kW nebo null>, "transmission": "manual"|"automat"|null, "fuel": "diesel"|"benzin"|"hybrid"|"elektro"|"lpg"|"cng"|null, "trim": "<verze/motorizace>", "sameModel": true|false } ]';

/**
 * Tier-specific output specification. THIS IS WHERE THE DEPTH LIVES.
 * Ve všech tierech je povinné pole `comparables` — z něj server počítá cenu.
 */
function buildOutputSpec(tier: string, minComps: number): string {
  const head =
    `Vrať VÝHRADNĚ validní JSON objekt — žádný jiný text, žádné markdown bloky obalující JSON. ` +
    `Pole "comparables" je NEJDŮLEŽITĚJŠÍ: z něj server deterministicky počítá výslednou cenu (vážený medián s korekcí na nájezd a stáří). ` +
    `Čím víc přesných inzerátů (cíl ${minComps}+), tím přesnější odhad. Čísla v comparables opisuj přesně z inzerátů, nic nezaokrouhluj a nevymýšlej.\n`;

  if (tier === 'quick') {
    return head + `{
  "averagePrice": <tvůj odhad tržní ceny v CZK — celé číslo>,
  "minPrice": <dolní mez pásma v CZK>,
  "maxPrice": <horní mez pásma v CZK>,
  "listingCount": <počet relevantních inzerátů>,
  ${COMPARABLES_SPEC},
  "sources": [ { "portal": "Sauto.cz", "url": "https://...", "price": 295000, "title": "Škoda Octavia 1.6 TDI 2018, 120 000 km" } ],
  "summary": "2–3 věty: pozice vozu na trhu a doporučení k ceně.",
  "markdownText": "## Srovnávací inzeráty\\n| Zdroj | Verze | Rok | Km | Cena |\\n|---|---|---|---|---|\\n| ... |\\n\\n## Shrnutí\\n3–4 věty: co cenu drží nahoře / táhne dolů, doporučená inzertní cena."
}`;
  }

  if (tier === 'standard') {
    return head + `{
  "averagePrice": <CZK>,
  "minPrice": <CZK>,
  "maxPrice": <CZK>,
  "listingCount": <počet relevantních inzerátů>,
  ${COMPARABLES_SPEC},
  "sources": [<aspoň 6 různých inzerátů s portal, url, price, title>],
  "summary": "3–4 věty",
  "markdownText": "Markdown se sekcemi (H2):\\n\\n## Tržní cena\\n- Doporučená inzertní cena: X Kč\\n- Realistická prodejní cena (po vyjednávání): Y Kč\\n- Pásmo: min — max\\n- Pozice vozu v rámci nabídek (kvartil) a proč\\n\\n## Srovnatelné inzeráty\\nTabulka: Zdroj | Verze | Rok | Km | Převodovka | Cena\\n\\n## Co ovlivňuje cenu\\n5–6 konkrétních bodů (nájezd vs. průměr 15 000 km/rok, výbava, stav, původ, sezóna) s orientačním +/− v Kč.\\n\\n## Doporučení\\n- Pro prodejce: inzertní cena, vyjednávací rezerva, jak rychle se podobné vozy prodávají\\n- Pro kupujícího: maximální rozumná nabídka a na co si dát pozor"
}`;
  }

  if (tier === 'detailed') {
    return head + `Toto je PLACENÝ DETAILNÍ POSUDEK — markdownText MUSÍ obsahovat VŠECHNY následující sekce v plné délce. NEZKRACUJ. Pokud něco nelze dohledat, napiš to otevřeně, ale sekci nevynechej.

{
  "averagePrice": <CZK — tvůj nejlepší odhad; server ho ověří/přepočítá z comparables>,
  "minPrice": <CZK>,
  "maxPrice": <CZK>,
  "listingCount": <počet relevantních inzerátů>,
  ${COMPARABLES_SPEC},
  "sources": [<aspoň 8 různých inzerátů: portal, url, price, title>],
  "summary": "4–6 vět souhrnu klíčových zjištění (pozice v trhu, hlavní rizika, doporučení).",
  "markdownText": "Profesionální analýza v markdownu. Každá sekce začíná H2 (##), mezi sekcemi prázdný řádek:\\n\\n## Tržní cena a pásmo spolehlivosti\\n- Doporučená inzertní cena (CZK)\\n- Realistická prodejní cena po vyjednávání\\n- Doporučená výkupní cena (pro autobazar)\\n- Pásmo: min — max; 25. percentil / medián / 75. percentil z nalezených inzerátů\\n- Pozice tohoto vozu v rámci nabídek a odůvodnění\\n\\n## Srovnatelné inzeráty (tabulka, min. 8 řádků)\\nTabulka: Zdroj | Verze | Rok | Najeto | Převodovka | Cena | Odkaz\\nPod tabulkou: které inzeráty vybočují a proč.\\n\\n## Vliv výbavy a stavu na cenu\\nKonkrétní +/− CZK pro každý faktor: výbava (položkově), technický stav, lak/karoserie, nehodovost, servisní historie, nájezd vs. benchmark 15 000 km/rok, počet majitelů, původ.\\n\\n## Tržní trendy pro tento segment\\n- Sezónnost (kdy se prodává nejrychleji)\\n- Likvidita modelu (typická doba v inzerci)\\n- Trend cen za posledních 12 měsíců\\n- Kolik podobných vozů je aktuálně v nabídce\\n\\n## Známá rizika a problémy modelu/motoru\\n- Typické závady pro tento model + motor + ročník\\n- Očekávané servisní náklady na nejbližší rok\\n- Co zkontrolovat před koupí / co doložit při prodeji\\n\\n## Doporučení k prodeji a koupi\\n- **Pro prodejce:** cena pro rychlý prodej (do 30 dní), cena pro trpělivý prodej (60–90 dní), vyjednávací prostor, klíčové prodejní argumenty, kde inzerovat\\n- **Pro kupujícího:** maximální rozumná nabídka, body vyjednávání, TOP 5 kontrol před koupí"
}`;
  }

  if (tier === 'expert') {
    return head + `Toto je NEJVYŠŠÍ TIER — EXPERTNÍ POSUDEK na úrovni profesionálního znaleckého odhadu. markdownText MUSÍ obsahovat VŠECHNY sekce v plné hloubce. NIKDY NEZKRACUJ — pokud informaci neznáš, napiš to explicitně, ale sekci nevynechej.

POSTUP:
1. Pokud je zadán VIN, nejdřív ho dekóduj (země výroby, modelový rok, motor, výbava) a použij pro přesné párování inzerátů.
2. Důkladně prohledej portály a nasbírej co NEJVÍC inzerátů stejného modelu/generace (ideálně 12+). Raději více inzerátů než hloubková analýza jednoho.
3. Data vrať strojově v "comparables" — z nich server počítá cenu.

{
  "averagePrice": <CZK — tvůj nejlepší odhad; server ho ověří/přepočítá z comparables>,
  "minPrice": <CZK>,
  "maxPrice": <CZK>,
  "listingCount": <počet relevantních inzerátů>,
  ${COMPARABLES_SPEC},
  "sources": [<aspoň 12 různých inzerátů: portal, url, price, title>],
  "summary": "6–8 vět executive summary s klíčovými zjištěními.",
  "markdownText": "EXPERTNÍ posudek v markdownu — VŠECHNY sekce povinné (H2 nadpisy):\\n\\n## Shrnutí pro rozhodnutí\\n4–6 vět: co vůz je, kde stojí na trhu, hlavní příležitosti a rizika, finální doporučení.\\n\\n## Tržní cena a pásmo spolehlivosti\\n- Doporučená inzertní cena, realistická prodejní cena, výkupní cena pro autobazar\\n- Pásmo min — max, 25./50./75. percentil z nalezených inzerátů\\n- Pozice tohoto konkrétního vozu (kvartil + odůvodnění)\\n\\n## Srovnatelné inzeráty (tabulka, min. 12 řádků)\\nTabulka: Zdroj | Verze | Rok | Najeto | Převodovka | Cena | Odchylka od mediánu | Odkaz\\nPod tabulkou: analýza odlehlých hodnot.\\n\\n## Rozpad cenových úprav\\nPro každý faktor konkrétní +/− CZK + zdůvodnění: výbava položkově, technický stav, lak/karoserie/interiér, nehodovost, servisní historie, nájezd vs. benchmark, počet majitelů, původ (CZ vs. import).\\n\\n## Cenový trend a prognóza\\n- Vývoj ceny segmentu za 12 měsíců\\n- Sezónní křivka\\n- Prognóza na 3–6 měsíců a faktory, které cenu posunou\\n\\n## Regionální srovnání\\n- Praha vs. regiony, Čechy vs. Morava, import vs. domácí\\n- Kde se prodává nejlépe / kde nejlevněji koupit\\n\\n## VIN a historie vozu\\n\${vinHint}\\n- Doporučení na ověření (Cebia, VIN dekodér, kontrola exportu/leasingu)\\n\\n## Investiční pohled\\n- Zbytková hodnota za 1 / 3 / 5 let (CZK), roční depreciace v %\\n- Vhodnost pro krátkodobé / dlouhodobé držení / fleet\\n- Alternativy ze segmentu, které drží hodnotu lépe\\n\\n## Náklady vlastnictví (TCO) na 3 roky\\nKonkrétní roční částky: servis, očekávané výměny, pojištění, palivo (spotřeba × 15 000 km × cena), dálniční známka; celkem za rok a za 3 roky.\\n\\n## Známá rizika a problémy modelu\\n- Typické závady (motor, převodovka, elektronika), závady spojené s nájezdem, preventivní výměny\\n\\n## Checklist (10–15 bodů)\\n\${checklistHint}\\n\\n## Strategická doporučení\\n- Optimální čas prodeje/koupě, inzertní strategie (kde, klíčové fráze, fotografie), cenová strategie (nasazená → konečná cena), vyjednávací prostor, plán B po 60 dnech"
}`;
  }

  return buildOutputSpec('standard', minComps);
}

// ── Server-side sanitizace (pojistka nad COMPLIANCE_RULES v promptu) ──────
const PHONE_RE = /(?<!\d)(?:\+?420[\s.-]?|00420[\s.-]?)?[2-7]\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)/g;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g;

function sanitizeText(value: unknown, maxLen: number): string {
  return String(value ?? '')
    .replace(EMAIL_RE, '')
    .replace(PHONE_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Jen http(s) URL — model-generovaný text nesmí skončit jako javascript: odkaz. */
function sanitizeUrl(value: unknown): string {
  const s = String(value ?? '').trim().slice(0, 500);
  return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : '';
}

/** Keeps only the factual source fields and sanitizes the title. */
function sanitizeSources(raw: unknown): ScanData['sources'] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: ScanData['sources'] = [];
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;
    const r = s as Record<string, unknown>;
    const url = sanitizeUrl(r.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      portal: sanitizeText(r.portal, 60),
      url,
      price:  Number(r.price) || 0,
      title:  sanitizeText(r.title, 100),
    });
  }
  return out;
}

function parseComparables(raw: unknown): Comparable[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === 'object')
    .map((c) => ({
      portal:       c.portal != null ? sanitizeText(c.portal, 60) : undefined,
      url:          sanitizeUrl(c.url) || undefined,
      price:        Number(c.price) || undefined,
      year:         Number(c.year) || undefined,
      mileageKm:    Number(c.mileageKm) || undefined,
      powerKw:      Number(c.powerKw) || undefined,
      transmission: c.transmission != null ? String(c.transmission) : undefined,
      fuel:         c.fuel != null ? String(c.fuel) : undefined,
      trim:         c.trim != null ? sanitizeText(c.trim, 80) : undefined,
      sameModel:    typeof c.sameModel === 'boolean' ? c.sameModel : undefined,
    }))
    .filter((c) => Number.isFinite(c.price) && (c.price ?? 0) > 10_000);
}

function fillExpertPlaceholders(spec: string, car: CarInput): string {
  const vinHint = car.vin
    ? `Pro VIN ${car.vin}: vypiš, co lze z VIN dekódovat (země výroby, modelový rok, motor, výbava).`
    : 'VIN nebyl uveden — doporuč uživateli, aby pro plnou kontrolu historie zadal VIN při příštím ocenění.';

  const isBuyer = car.notes && /koup[ěie]|nakup|kupuj/.test(car.notes.toLowerCase());
  const checklistHint = isBuyer
    ? 'Checklist před koupí (dokumenty, technický stav, zkušební jízda, ověření historie).'
    : 'Vyber relevantní: checklist před prodejem (jak vůz připravit) NEBO před koupí (co zkontrolovat). Pokud nelze rozhodnout, dej oba krátce.';

  return spec.replace('${vinHint}', vinHint).replace('${checklistHint}', checklistHint);
}

/**
 * Runs a fresh market scan for the given car (Claude + web search).
 * `tier` řídí hloubku výstupu i rozpočet hledání; `scope` portály.
 */
export async function runScan(
  car: CarInput,
  tier = 'standard',
  scope = 'czech',
  prior?: PriceStatsPrior | null
): Promise<ScanData> {
  const config = TIER_CONFIGS[tier] ?? TIER_CONFIGS.standard;
  const scopeNormalized: 'czech' | 'international' = scope === 'international' ? 'international' : 'czech';

  const carBlock = buildCarBlock(car);
  const strategy = buildSearchStrategy(car, scopeNormalized, config.min_comps, config.max_search);
  const currencyNote = buildCurrencyNote(scopeNormalized);

  let outputSpec = buildOutputSpec(tier, config.min_comps);
  if (tier === 'expert') outputSpec = fillExpertPlaceholders(outputSpec, car);

  const priorBlock =
    prior && prior.nSamples >= 2
      ? `Interní historická data Cargent (vlastní agregáty z dřívějších ocenění tohoto typu vozu): ` +
        `medián ~${Math.round(prior.medianPrice).toLocaleString('cs-CZ')} Kč z ${prior.nSamples} ocenění, ` +
        `naposledy před ${prior.ageDays} dny. Použij jen jako kontrolu věrohodnosti — ` +
        `pokud se aktuální nálezy výrazně liší, vysvětli proč.\n\n`
      : '';

  const today = new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' });
  const ageYears = new Date().getFullYear() - Number(car.year);

  const userMessage =
    `Dnešní datum: ${today}. Oceňovaný vůz je ${ageYears} let starý.\n\n` +
    `Oceňuješ tento konkrétní vůz na českém trhu ojetých vozidel:\n${carBlock}\n\n` +
    strategy + '\n' +
    priorBlock +
    currencyNote +
    `${COMPLIANCE_RULES}\n` +
    outputSpec;

  const systemBase =
    'Jsi analytik trhu s ojetými automobily v České republice. ' +
    'Prohledáváš inzertní portály, sbíráš aktuální nabídky srovnatelných vozů a vracíš strukturovaný výsledek ' +
    'VÝHRADNĚ jako validní JSON objekt — žádný jiný text, žádné markdown bloky obalující JSON. ' +
    'Pracuješ s fakty z inzerátů; čísla (cena, rok, nájezd) přepisuješ přesně, nikdy je nedomýšlíš. ' +
    'Nikdy nezpracováváš osobní údaje prodejců z inzerátů (jména, telefony, e-maily, adresy). ' +
    'Piš česky, věcně, bez emoji.';
  const systemTierSuffix =
    tier === 'expert'
      ? ' Tvůj výstup má úroveň profesionálního znaleckého posudku. Buď důkladný, strukturovaný a věcný — nikdy nezkracuj sekce.'
      : tier === 'detailed'
        ? ' Tvůj výstup je placený detailní posudek. Všechny požadované sekce vyplň v plné délce.'
        : tier === 'standard'
          ? ' Buď věcný a stručný, ale uveď klíčové faktory ovlivňující cenu.'
          : ' Buď stručný a rychlý — uživatel chce orientační cenu podloženou inzeráty, ne posudek.';

  const tools: Array<Record<string, unknown>> = [
    {
      type: 'web_search_20260209',
      name: 'web_search',
      max_uses: config.max_search,
      user_location: { type: 'approximate', country: 'CZ', timezone: 'Europe/Prague' },
    },
  ];

  const requestBody = {
    model: config.model,
    max_tokens: config.max_tokens,
    system: systemBase + systemTierSuffix,
    thinking: { type: 'adaptive' as const },
    output_config: { effort: config.effort },
    tools,
    messages: [{ role: 'user', content: userMessage }],
  };

  const { finalText, combinedText } = await callClaudeUntilDone(requestBody);

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonFromText(finalText);
  } catch (_) {
    try {
      parsed = parseJsonFromText(combinedText);
    } catch (err) {
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
  let valuationMeta: ScanData['valuation'];

  // Deterministický (robustní) přepočet ceny z nasbíraných inzerátů — pro
  // VŠECHNY tiery. Headline číslo pak nepochází z volného odhadu modelu, ale
  // z transparentní statistiky (vážený medián + blend s priorem). Viz valuation.ts.
  const comparables = parseComparables(parsed.comparables);
  const valuation = computeValuation(
    comparables,
    {
      year:         Number(car.year),
      mileageKm:    Number(car.mileage) || 0,
      transmission: car.transmission,
      fuel:         car.fuel,
      powerKw:      car.powerKw != null ? Number(car.powerKw) : undefined,
    },
    { prior, modelAveragePrice: averagePrice },
  );

  if (valuation) {
    averagePrice = valuation.averagePrice;
    minPrice     = valuation.minPrice;
    maxPrice     = valuation.maxPrice;
    if (valuation.nComps > listingCount) listingCount = valuation.nComps;
    markdownText = valuation.methodologyMarkdown + '\n';
    valuationMeta = {
      dealerBuyPrice: valuation.dealerBuyPrice,
      confidence: valuation.confidence,
      p25: valuation.p25,
      p50: valuation.p50,
      p75: valuation.p75,
      nComps: valuation.nComps,
      computed: true,
    };
  } else if (averagePrice > 0) {
    // Málo inzerátů — necháme čísla modelu, ale řekneme to uživateli.
    if (minPrice <= 0 || minPrice >= averagePrice) minPrice = Math.round(averagePrice * 0.92);
    if (maxPrice <= 0 || maxPrice <= averagePrice) maxPrice = Math.round(averagePrice * 1.08);
    valuationMeta = {
      dealerBuyPrice: Math.round(averagePrice * 0.86 / 1000) * 1000,
      confidence: 0.3,
      p25: minPrice,
      p50: averagePrice,
      p75: maxPrice,
      nComps: comparables.length,
      computed: false,
    };
    markdownText =
      `_Nalezeno jen ${comparables.length} použitelných inzerátů — cena vychází z odhadu modelu a je orientační. ` +
      `Zkuste vyšší tier nebo mezinárodní srovnání._\n\n`;
  }

  // Zdroje: sloučit „sources“ a URL z comparables (dedup) → uživatel vidí vše, z čeho cena vychází.
  const sources = sanitizeSources(parsed.sources);
  const seen = new Set(sources.map((s) => s.url));
  for (const c of comparables) {
    if (!c.url || seen.has(c.url)) continue;
    seen.add(c.url);
    sources.push({
      portal: c.portal ?? '',
      url: c.url,
      price: c.price ?? 0,
      title: [car.brand, car.model, c.trim, c.year, c.mileageKm ? `${Number(c.mileageKm).toLocaleString('cs-CZ')} km` : '']
        .filter(Boolean).join(' ').slice(0, 100),
    });
  }

  const fallbackMarkdown =
    `## Odhad tržní ceny\n` +
    `- **Tržní cena:** ${averagePrice.toLocaleString('cs-CZ')} Kč\n` +
    `- **Pásmo:** ${minPrice.toLocaleString('cs-CZ')} – ${maxPrice.toLocaleString('cs-CZ')} Kč\n\n` +
    `## Shrnutí\n${parsed.summary ?? ''}`;

  markdownText += String(parsed.markdownText ?? fallbackMarkdown);

  return {
    averagePrice,
    minPrice,
    maxPrice,
    listingCount,
    sources,
    modelInput: {
      brand:      car.brand,
      model:      car.model,
      rok:        car.year,
      km:         car.mileage ?? 0,
      prevodovka: car.transmission ?? '',
      palivo:     car.fuel ?? '',
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
    valuation: valuationMeta,
    model: config.model,
  };
}

/**
 * Lightweight monitor scan: Haiku bez web search — rychlý a levný odhad
 * z natrénovaných znalostí trhu (pro watchlist monitoringu, ne pro posudky).
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
    `Oceň ojetý vůz na českém trhu (dnes je ${new Date().getFullYear()}).\n\n` +
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
    model: MONITOR_MODEL,
    max_tokens: 600,
    system:
      'Jsi expert na oceňování ojetých vozidel na českém trhu. ' +
      'Proveď statistický odhad tržní hodnoty bez přístupu k internetu. ' +
      'Vrať odpověď VÝHRADNĚ jako validní JSON objekt — žádný jiný text.',
    messages: [{ role: 'user', content: userMessage }],
  };

  const apiResponse = await callClaude(requestBody, undefined, MONITOR_BUDGET_MS);
  const text = extractText(apiResponse);
  const parsed = parseJsonFromText(text);

  const averagePrice = Number(parsed.averagePrice) || 0;
  const minPrice     = Number(parsed.minPrice)     || 0;
  const maxPrice     = Number(parsed.maxPrice)     || 0;

  const fallbackMarkdown =
    `## Tržní hodnota\n` +
    `- **Průměrná cena:** ${averagePrice.toLocaleString('cs-CZ')} Kč\n` +
    `- **Rozsah:** ${minPrice.toLocaleString('cs-CZ')} – ${maxPrice.toLocaleString('cs-CZ')} Kč\n\n` +
    `## Shrnutí\n${parsed.summary ?? ''}`;

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
    model: MONITOR_MODEL,
  };
}
