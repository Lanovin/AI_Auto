import type { CarInput, ScanData } from './market-cache';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/** Tier configs for runScan (price estimator with live web search) */
const TIER_CONFIGS: Record<string, { max_tokens: number; max_search: number }> = {
  quick:    { max_tokens: 2000, max_search: 3 },
  standard: { max_tokens: 3000, max_search: 5 },
  detailed: { max_tokens: 5000, max_search: 8 },
  expert:   { max_tokens: 8000, max_search: 10 },
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

async function callClaude(body: object): Promise<AnthropicResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY není nastaven na serveru.');

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`Anthropic API chyba ${res.status}: ${err.error?.message ?? res.statusText}`);
  }

  return res.json() as Promise<AnthropicResponse>;
}

/**
 * Runs a fresh market scan for the given car.
 * Searches Sauto.cz, TipCars.cz, AutoScout24.cz via Claude + web_search.
 *
 * The `tier` parameter maps to the existing tier system from app.js (quick / standard /
 * detailed / expert).
 * The `scope` parameter controls which portals to search:
 *   'czech'         — Sauto.cz, TipCars.cz, AutoScout24.cz (default)
 *   'international' — Czech portals + mobile.de, otomoto.pl, lacentrale.fr, willhaben.at
 *
 * Returns a ScanData object ready for DB storage and API response.
 */
export async function runScan(car: CarInput, tier = 'standard', scope = 'czech'): Promise<ScanData> {
  const config = TIER_CONFIGS[tier] ?? TIER_CONFIGS.standard;
  const mileageText = car.mileage
    ? Number(car.mileage).toLocaleString('cs-CZ') + ' km'
    : 'neudáno';

  const isInternational = scope === 'international';

  const portalsLine = isInternational
    ? 'Prohledej portály Sauto.cz, TipCars.cz (ČR), mobile.de, AutoScout24.de (Německo), ' +
      'otomoto.pl (Polsko), lacentrale.fr (Francie), willhaben.at (Rakousko) a najdi aktuální inzeráty pro:'
    : 'Prohledej Sauto.cz, TipCars.cz, AutoScout24.cz a najdi aktuální inzeráty pro:';

  const currencyNote = isInternational
    ? 'Všechny ceny uváděj v CZK. EUR převádej kurzem ~25 CZK/EUR, PLN kurzem ~5,8 CZK/PLN.\n'
    : '';

  const sourcesExample = isInternational
    ? '    { "portal": "mobile.de", "url": "https://...", "price": 320000, "title": "VW Golf 1.6 TDI 2019..." }\n'
    : '    { "portal": "Sauto.cz", "url": "https://...", "price": 295000, "title": "Škoda Octavia 1.6 TDI 2018..." }\n';

  const markdownScope = isInternational
    ? '## 🌍 Srovnání ČR + Zahraničí\\n'
    : '## 🔍 Srovnávací inzeráty\\n';

  const userMessage =
    portalsLine + '\n\n' +
    `Značka: ${car.brand}\n` +
    `Model: ${car.model}\n` +
    `Rok výroby: ${car.year}\n` +
    `Najeto: ${mileageText}\n` +
    `Převodovka: ${car.transmission || 'neudáno'}\n` +
    `Palivo: ${car.fuel || 'neudáno'}\n\n` +
    currencyNote +
    'Vrať VÝHRADNĚ validní JSON objekt — žádný jiný text, žádné markdown bloky, pouze čistý JSON:\n' +
    '{\n' +
    '  "averagePrice": <průměrná tržní cena nalezených inzerátů v CZK jako číslo>,\n' +
    '  "minPrice": <nejnižší nalezená cena v CZK>,\n' +
    '  "maxPrice": <nejvyšší nalezená cena v CZK>,\n' +
    '  "listingCount": <počet relevantních inzerátů>,\n' +
    '  "sources": [\n' +
    sourcesExample +
    '  ],\n' +
    '  "summary": "2–3 věty o tržní situaci a doporučení k ceně",\n' +
    `  "markdownText": "${markdownScope}| Zdroj | Rok | Km | Cena |\\n|-------|-----|----|------|\\n| ... |"\n` +
    '}';

  const requestBody = {
    model: 'claude-opus-4-6',
    max_tokens: config.max_tokens,
    system:
      'Jsi asistent pro výzkum trhu s ojetými automobily. ' +
      'Prohledej bazarové portály, najdi relevantní aktuální inzeráty a vrať výsledek ' +
      'VÝHRADNĚ jako validní JSON objekt — žádný jiný text, žádné markdown bloky — pouze čistý JSON.',
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
