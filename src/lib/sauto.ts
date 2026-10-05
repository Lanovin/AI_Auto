import type { CarInput } from './car-signature';

/**
 * Sauto.cz — přímé filtrované vyhledávání srovnatelných vozů.
 *
 * Kopíruje postup, jakým oceňuje zkušený bazarník: na Sauto zadá značku,
 * model, rok, nájezd, palivo, převodovku (případně výkon) a z výsledků vyčte
 * cenové rozpětí. Rozdíly uvnitř rozpětí pak dovysvětlí výbava a stav.
 *
 * Proč přímo API a ne web_search: web search vrací náhodné úryvky stránek,
 * nikoli filtrovanou nabídku — ceny pak byly „odhadem z toho, co se našlo".
 * Veřejné JSON API (stejné, které volá web sauto.cz; /api/ je v robots.txt
 * povoleno) vrací kompletní filtrovanou nabídku s cenou, rokem a nájezdem.
 *
 * Postup:
 *   1. Značka + model → kódy Sauto (detect_filters; neznámý kód API tiše
 *      ignoruje a vrátí celou značku, proto výsledek vždy ověřujeme).
 *   2. Postupně uvolňované filtry, dokud nemáme dost srovnatelných vozů.
 *   3. Každý inzerát se přepočte na nájezd a rok oceňovaného vozu
 *      (koeficienty odhadnuté z téže nabídky, s rozumnými mezemi).
 *   4. Odlehlé hodnoty pryč (MAD), medián + kvartily = cenové pásmo.
 *   5. U nejbližších vozů se dotáhne detail (výbava, havárie, servisní
 *      knížka, výkon) — podklad pro AI k dorovnání výbavy a stavu.
 *
 * Právní rámec (viz rate-limit.ts, market-cache.ts): jeden dotaz = jedno
 * individuální ocenění, stejně jako ruční hledání na webu. Přebíráme jen
 * faktické údaje (cena, rok, km, výbava), nikdy kontakty prodejců ani texty
 * inzerátů. Identifikujeme se poctivým User-Agentem.
 */

const SAUTO_API = 'https://www.sauto.cz/api/v1';
const SAUTO_WEB = 'https://www.sauto.cz';
const USER_AGENT = 'Cargent/1.0 (+https://cargent.cz; ocenovani ojetych vozu)';
const CATEGORY_OSOBNI = 838;
const REQUEST_TIMEOUT_MS = 8_000;
const PAGE_LIMIT = 100;

/** Pod tímto počtem vozů se filtry uvolní o další stupeň. */
const MIN_COMPARABLES = 10;

// ── Typy ───────────────────────────────────────────────────────────────────

export interface SautoListing {
  id: number;
  url: string;
  title: string;
  price: number;
  year: number;
  km: number;
  fuel: string;
  gearbox: string;
  /** Prodejce: autobazar/dealer vs. soukromá osoba (jen typ, nikdy identita). */
  seller: 'dealer' | 'soukromý';
  daysListed: number;
  /** Cena přepočtená na rok a nájezd oceňovaného vozu. */
  adjustedPrice: number;
  // Z detailu inzerátu (jen u nejbližších vozů):
  powerKw?: number;
  body?: string;
  drive?: string;
  origin?: string;
  crashedInPast?: boolean;
  serviceBook?: boolean;
  firstOwner?: boolean;
  equipment?: string[];
}

export interface SautoMarket {
  /** Popis použitých filtrů lidsky (pro prompt i UI). */
  filterDescription: string;
  /** Stupeň uvolnění filtrů (1 = nejpřísnější). */
  relaxLevel: number;
  /** Stejné hledání na webu Sauto — dealer si ho může otevřít a ověřit. */
  searchUrl: string;
  /** Kolik inzerátů filtrům odpovídá na celém Sauto. */
  totalMatching: number;
  outliersRemoved: number;
  listings: SautoListing[];
  /** Statistika inzerovaných (nepřepočtených) cen. */
  asking: PriceStats;
  /** Statistika cen přepočtených na rok a nájezd oceňovaného vozu. */
  adjusted: PriceStats;
  /** Použité koeficienty přepočtu. */
  coefficients: {
    /** Změna ceny na každých +10 000 km (např. −0,025 = −2,5 %). */
    per10kKm: number;
    /** Změna ceny za každý rok mladší vůz (např. 0,08 = +8 %). */
    perYear: number;
    source: 'trh' | 'výchozí';
  };
}

export interface PriceStats {
  n: number;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  mean: number;
}

interface RawItem {
  id: number;
  name?: string;
  additional_model_name?: string;
  price?: number;
  price_by_agreement?: boolean;
  tachometer?: number;
  manufacturing_date?: string;
  create_date?: string;
  fuel_cb?: { name?: string; seo_name?: string } | null;
  gearbox_cb?: { name?: string; seo_name?: string } | null;
  manufacturer_cb?: { seo_name?: string } | null;
  model_cb?: { seo_name?: string } | null;
  premise?: unknown;
  deal_type?: string;
}

interface SearchFilters {
  manufacturerSeo: string;
  modelSeo: string;
  yearFrom: number;
  yearTo: number;
  kmFrom?: number;
  kmTo?: number;
  fuelSeo?: string;
  gearboxSeo?: string;
  powerFrom?: number;
  powerTo?: number;
  bodySeo?: string;
}

// ── Pomocné ────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, '-plus')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function sautoGet<T>(path: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, String(v));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${SAUTO_API}${path}?${qs.toString()}`, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Sauto API ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Formulářová hodnota paliva → kód Sauto. Neznámé = bez filtru. */
function mapFuel(fuel?: string): string | undefined {
  if (!fuel) return undefined;
  const v = slugify(fuel);
  if (v.includes('elektr') || v === 'ev') return 'elektro';
  if (v.includes('hybrid') || v.includes('phev')) return 'hybridni';
  if (v.includes('lpg')) return 'lpg-benzin';
  if (v.includes('cng')) return 'cng-benzin';
  if (v.includes('diesel') || v.includes('nafta') || v.includes('tdi')) return 'nafta';
  if (v.includes('benz') || v.includes('petrol')) return 'benzin';
  return undefined;
}

function mapGearbox(transmission?: string): string | undefined {
  if (!transmission) return undefined;
  const v = slugify(transmission);
  if (v.includes('manu')) return 'manualni';
  if (v.includes('auto') || v.includes('dsg') || v.includes('pdk') || v.includes('cvt')) return 'automaticka';
  return undefined;
}

function mapBody(bodyType?: string): string | undefined {
  if (!bodyType) return undefined;
  const v = slugify(bodyType);
  const map: Record<string, string> = {
    hatchback: 'hatchback',
    sedan: 'sedanlimuzina',
    kombi: 'kombi',
    suv: 'suv',
    kupe: 'kupe',
    cabrio: 'kabriolet',
    kabriolet: 'kabriolet',
    'mpv-van': 'mpv',
    mpv: 'mpv',
    'pick-up': 'pick-up',
    liftback: 'liftback',
  };
  return map[v];
}

/** Karoserie skrytá v názvu modelu („Golf Variant", „Řada 3 Touring", …). */
function bodyFromModelName(model: string): string | undefined {
  const v = slugify(model);
  if (/(^|-)(combi|kombi|variant|avant|touring|sw|sports-tourer|grandtour|wagon|estate|shooting-brake|break|allroad|cross-country|caravan)($|-)/.test(v)) {
    return 'kombi';
  }
  if (/(^|-)(coupe|kupe)($|-)/.test(v)) return 'kupe';
  if (/(^|-)(cabrio|cabriolet|kabriolet|roadster|spider|spyder)($|-)/.test(v)) return 'kabriolet';
  return undefined;
}

// ── 1. Značka + model → kódy Sauto ─────────────────────────────────────────

interface ResolvedModel {
  manufacturerSeo: string;
  modelSeo: string;
  /** Karoserie zakódovaná v názvu modelu („Octavia Combi" → kombi). */
  bodySeo?: string;
}

const modelCache = new Map<string, ResolvedModel | null>();

interface DetectResponse {
  detected_filters?: Array<{
    filter_name: string;
    options?: Array<{ seo_name?: string; name?: string; models?: Array<{ seo_name?: string }> }>;
  }>;
}

interface SearchResponse {
  pagination?: { total?: number };
  results?: RawItem[];
}

/** Ověří, že kód modelu Sauto zná (neznámý kód API tiše ignoruje). */
async function verifyModel(manufacturerSeo: string, modelSeo: string): Promise<boolean> {
  const data = await sautoGet<SearchResponse>('/items/search', {
    limit: 3,
    category_id: CATEGORY_OSOBNI,
    manufacturer_model_seo: `${manufacturerSeo}:${modelSeo}`,
  });
  const results = data.results ?? [];
  return results.length > 0 && results.every((r) => r.model_cb?.seo_name === modelSeo);
}

/** Varianty názvu modelu, jak je Sauto obvykle kóduje. */
function modelCandidates(manufacturerSeo: string, model: string): string[] {
  const base = slugify(model.split('/')[0]);
  const firstWord = slugify(model.split(/[\s/]+/)[0]);
  const out = [base, firstWord];
  if (manufacturerSeo === 'mercedes-benz' && /^[a-z]{1,3}$/.test(firstWord)) out.unshift(`tridy-${firstWord}`);
  if (manufacturerSeo === 'bmw') {
    const m = model.match(/řada\s*(\d)/i) ?? model.match(/rada\s*(\d)/i);
    if (m) out.unshift(`rada-${m[1]}`);
  }
  return [...new Set(out.filter(Boolean))];
}

export async function resolveSautoModel(brand: string, model: string): Promise<ResolvedModel | null> {
  const key = `${slugify(brand)}|${slugify(model)}`;
  if (modelCache.has(key)) return modelCache.get(key) ?? null;

  const brandSlug = slugify(brand === 'VW' ? 'Volkswagen' : brand);
  let resolved: ResolvedModel | null = null;

  const detected = await sautoGet<DetectResponse>('/items/search/detect_filters', {
    category_id: CATEGORY_OSOBNI,
    phrase: `${brand === 'VW' ? 'Volkswagen' : brand} ${model}`,
  });
  const filters = detected.detected_filters ?? [];
  const mm = filters.find((f) => f.filter_name === 'manufacturer_model_cb');
  const body =
    filters.find((f) => f.filter_name === 'vehicle_body_cb')?.options?.[0]?.seo_name ?? bodyFromModelName(model);
  const manufacturer = mm?.options?.find((o) => {
    const seo = o.seo_name ?? '';
    return seo === brandSlug || seo.startsWith(brandSlug) || brandSlug.startsWith(seo);
  });

  if (manufacturer?.seo_name) {
    const detectedModel = manufacturer.models?.[0]?.seo_name;
    if (detectedModel) {
      resolved = { manufacturerSeo: manufacturer.seo_name, modelSeo: detectedModel, bodySeo: body };
    } else {
      for (const candidate of modelCandidates(manufacturer.seo_name, model)) {
        if (await verifyModel(manufacturer.seo_name, candidate)) {
          resolved = { manufacturerSeo: manufacturer.seo_name, modelSeo: candidate, bodySeo: body };
          break;
        }
      }
    }
  }

  modelCache.set(key, resolved);
  return resolved;
}

// ── 2. Postupně uvolňované vyhledávání ─────────────────────────────────────

function kmRange(km: number, pct: number): { from: number; to: number } {
  const half = Math.max(km * pct, 25_000);
  return { from: Math.max(0, Math.round(km - half)), to: Math.round(km + half) };
}

function buildLevels(car: CarInput, resolved: ResolvedModel): SearchFilters[] {
  const year = Number(car.year);
  const km = Number(car.mileage) || 0;
  const powerKw = Number(car.powerKw) || 0;
  const fuelSeo = mapFuel(car.fuel);
  const gearboxSeo = mapGearbox(car.transmission);
  const bodySeo = mapBody(car.bodyType) ?? resolved.bodySeo;
  const base = { manufacturerSeo: resolved.manufacturerSeo, modelSeo: resolved.modelSeo };

  const withKm = (pct: number) => (km > 0 ? kmRange(km, pct) : undefined);
  const levels: SearchFilters[] = [];

  // 1: nejpřísnější — jako by hledal bazarník u konkrétního vozu
  const k1 = withKm(0.3);
  levels.push({
    ...base, yearFrom: year - 1, yearTo: year + 1, kmFrom: k1?.from, kmTo: k1?.to,
    fuelSeo, gearboxSeo, bodySeo,
    ...(powerKw > 0 ? { powerFrom: Math.round(powerKw * 0.9), powerTo: Math.round(powerKw * 1.1) } : {}),
  });
  // 2: bez výkonu, širší nájezd
  const k2 = withKm(0.45);
  levels.push({ ...base, yearFrom: year - 1, yearTo: year + 1, kmFrom: k2?.from, kmTo: k2?.to, fuelSeo, gearboxSeo, bodySeo });
  // 3: ±2 roky, bez karoserie
  const k3 = withKm(0.6);
  levels.push({ ...base, yearFrom: year - 2, yearTo: year + 2, kmFrom: k3?.from, kmTo: k3?.to, fuelSeo, gearboxSeo });
  // 4: bez nájezdu (přepočet na km vyrovná rozdíly)
  levels.push({ ...base, yearFrom: year - 2, yearTo: year + 2, fuelSeo, gearboxSeo });
  // 5: poslední záchrana — bez převodovky, ±3 roky
  levels.push({ ...base, yearFrom: year - 3, yearTo: year + 3, fuelSeo });

  return levels;
}

function toApiParams(f: SearchFilters, limit: number) {
  return {
    limit,
    offset: 0,
    category_id: CATEGORY_OSOBNI,
    condition_seo: 'ojete',
    operating_lease: false,
    manufacturer_model_seo: `${f.manufacturerSeo}:${f.modelSeo}`,
    vehicle_age_from: f.yearFrom,
    vehicle_age_to: f.yearTo,
    tachometer_from: f.kmFrom,
    tachometer_to: f.kmTo,
    fuel_seo: f.fuelSeo,
    gearbox_seo: f.gearboxSeo,
    engine_power_from: f.powerFrom,
    engine_power_to: f.powerTo,
    vehicle_body_seo: f.bodySeo,
  };
}

function toWebUrl(f: SearchFilters): string {
  const qs = new URLSearchParams();
  qs.set('stav', 'ojete');
  qs.set('vyrobeno-od', String(f.yearFrom));
  qs.set('vyrobeno-do', String(f.yearTo));
  if (f.kmFrom !== undefined) qs.set('km-od', String(f.kmFrom));
  if (f.kmTo !== undefined) qs.set('km-do', String(f.kmTo));
  if (f.fuelSeo) qs.set('palivo', f.fuelSeo);
  if (f.gearboxSeo) qs.set('prevodovka', f.gearboxSeo);
  if (f.powerFrom) qs.set('vykon-od', `${f.powerFrom}kw`);
  if (f.powerTo) qs.set('vykon-do', `${f.powerTo}kw`);
  if (f.bodySeo) qs.set('typ', f.bodySeo);
  return `${SAUTO_WEB}/inzerce/osobni/${f.manufacturerSeo}/${f.modelSeo}?${qs.toString()}`;
}

function describeFilters(f: SearchFilters): string {
  const parts = [`rok ${f.yearFrom}–${f.yearTo}`];
  if (f.kmFrom !== undefined && f.kmTo !== undefined) {
    parts.push(`${f.kmFrom.toLocaleString('cs-CZ')}–${f.kmTo.toLocaleString('cs-CZ')} km`);
  }
  if (f.fuelSeo) parts.push(`palivo ${f.fuelSeo}`);
  if (f.gearboxSeo) parts.push(`převodovka ${f.gearboxSeo}`);
  if (f.powerFrom && f.powerTo) parts.push(`výkon ${f.powerFrom}–${f.powerTo} kW`);
  if (f.bodySeo) parts.push(`karoserie ${f.bodySeo}`);
  return parts.join(', ');
}

function parseItem(r: RawItem, f: SearchFilters): Omit<SautoListing, 'adjustedPrice'> | null {
  const price = Number(r.price) || 0;
  const year = Number(String(r.manufacturing_date ?? '').slice(0, 4)) || 0;
  const km = Number(r.tachometer);
  if (r.price_by_agreement || price < 10_000 || !year || !Number.isFinite(km)) return null;
  if (r.deal_type && r.deal_type !== 'sale') return null;
  // Pojistka: API při neznámém kódu vrací celou značku → odfiltruj cizí modely
  if (r.model_cb?.seo_name && r.model_cb.seo_name !== f.modelSeo) return null;

  const created = r.create_date ? Date.parse(r.create_date) : NaN;
  return {
    id: r.id,
    url: `${SAUTO_WEB}/osobni/detail/${f.manufacturerSeo}/${f.modelSeo}/${r.id}`,
    title: String(r.name ?? '').slice(0, 100),
    price,
    year,
    km,
    fuel: r.fuel_cb?.name ?? '',
    gearbox: r.gearbox_cb?.name ?? '',
    seller: r.premise ? 'dealer' : 'soukromý',
    daysListed: Number.isFinite(created) ? Math.max(0, Math.round((Date.now() - created) / 86_400_000)) : 0,
  };
}

// ── 3.–4. Statistika ───────────────────────────────────────────────────────

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function stats(values: number[]): PriceStats {
  const s = [...values].sort((a, b) => a - b);
  const r = (x: number) => Math.round(x / 1000) * 1000;
  return {
    n: s.length,
    min: s[0] ?? 0,
    p25: r(quantile(s, 0.25)),
    median: r(quantile(s, 0.5)),
    p75: r(quantile(s, 0.75)),
    max: s[s.length - 1] ?? 0,
    mean: r(s.reduce((a, b) => a + b, 0) / (s.length || 1)),
  };
}

// Rozumné meze a výchozí hodnoty koeficientů pro český trh ojetin.
const PER10K_BOUNDS = [-0.07, -0.005] as const;
const PER10K_DEFAULT = -0.025;
const PERYEAR_BOUNDS = [0.02, 0.2] as const;
const PERYEAR_DEFAULT = 0.08;

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));

/**
 * OLS na ln(cena) ~ km/10k + rok. Vrací koeficienty, nebo null když data
 * neumožní odhad (málo vozů, nulový rozptyl, singulární matice).
 */
function fitCoefficients(items: Array<{ price: number; km: number; year: number }>): { per10k: number; perYear: number } | null {
  if (items.length < 8) return null;
  const xs = items.map((i) => [1, i.km / 10_000, i.year]);
  const ys = items.map((i) => Math.log(i.price));
  const yearVar = new Set(items.map((i) => i.year)).size > 1;
  const cols = yearVar ? 3 : 2;

  // Normální rovnice (X'X) b = X'y, Gaussova eliminace
  const A: number[][] = Array.from({ length: cols }, () => new Array(cols + 1).fill(0));
  for (let r = 0; r < xs.length; r++) {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) A[i][j] += xs[r][i] * xs[r][j];
      A[i][cols] += xs[r][i] * ys[r];
    }
  }
  for (let i = 0; i < cols; i++) {
    let pivot = i;
    for (let k = i + 1; k < cols; k++) if (Math.abs(A[k][i]) > Math.abs(A[pivot][i])) pivot = k;
    [A[i], A[pivot]] = [A[pivot], A[i]];
    if (Math.abs(A[i][i]) < 1e-9) return null;
    for (let k = 0; k < cols; k++) {
      if (k === i) continue;
      const f = A[k][i] / A[i][i];
      for (let j = i; j <= cols; j++) A[k][j] -= f * A[i][j];
    }
  }
  const b = A.map((row, i) => row[cols] / row[i]);
  // Koeficienty na ln-škále ≈ relativní změna ceny
  return { per10k: b[1], perYear: yearVar ? b[2] : NaN };
}

function adjustPrice(p: { price: number; km: number; year: number }, targetKm: number, targetYear: number, per10k: number, perYear: number): number {
  return p.price * Math.exp(per10k * ((targetKm - p.km) / 10_000) + perYear * (targetYear - p.year));
}

/** Odstraní odlehlé hodnoty na ln-škále pomocí MAD (robustní vůči extrémům). */
function removeOutliers<T extends { adjustedPrice: number }>(items: T[]): { kept: T[]; removed: number } {
  if (items.length < 6) return { kept: items, removed: 0 };
  const logs = items.map((i) => Math.log(i.adjustedPrice));
  const sorted = [...logs].sort((a, b) => a - b);
  const med = quantile(sorted, 0.5);
  const mad = quantile([...logs.map((l) => Math.abs(l - med))].sort((a, b) => a - b), 0.5);
  const threshold = Math.max(3 * 1.4826 * mad, 0.25);
  const kept = items.filter((_, idx) => Math.abs(logs[idx] - med) <= threshold);
  return { kept, removed: items.length - kept.length };
}

// ── 5. Detail inzerátu ─────────────────────────────────────────────────────

interface RawDetail {
  result?: {
    engine_power?: number;
    vehicle_body_cb?: { name?: string } | null;
    drive_cb?: { name?: string } | null;
    country_of_origin_cb?: { name?: string } | null;
    crashed_in_past?: boolean | null;
    service_book?: boolean | null;
    first_owner?: boolean | null;
    equipment_cb?: Array<{ name?: string }> | null;
  };
}

async function enrichWithDetail(listing: SautoListing): Promise<void> {
  try {
    const data = await sautoGet<RawDetail>(`/items/${listing.id}`, {});
    const d = data.result;
    if (!d) return;
    if (d.engine_power) listing.powerKw = d.engine_power;
    if (d.vehicle_body_cb?.name) listing.body = d.vehicle_body_cb.name;
    if (d.drive_cb?.name) listing.drive = d.drive_cb.name;
    if (d.country_of_origin_cb?.name) listing.origin = d.country_of_origin_cb.name;
    if (typeof d.crashed_in_past === 'boolean') listing.crashedInPast = d.crashed_in_past;
    if (typeof d.service_book === 'boolean') listing.serviceBook = d.service_book;
    if (typeof d.first_owner === 'boolean') listing.firstOwner = d.first_owner;
    if (Array.isArray(d.equipment_cb)) {
      listing.equipment = d.equipment_cb.map((e) => String(e.name ?? '')).filter(Boolean);
    }
  } catch {
    // Detail je bonus — bez něj se ocenění neruší
  }
}

async function mapPool<T>(items: T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const idx = next++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

// ── Veřejné API modulu ─────────────────────────────────────────────────────

/**
 * Najde srovnatelné vozy na Sauto.cz a spočítá cenové pásmo.
 * Nikdy nevyhazuje — při jakékoli chybě (Sauto nedostupné, neznámý model)
 * vrací null a volající pokračuje bez těchto dat.
 *
 * @param detailCount kolik nejbližších vozů doplnit o detail (výbava, stav)
 */
export async function fetchSautoMarket(car: CarInput, detailCount = 0): Promise<SautoMarket | null> {
  try {
    const resolved = await resolveSautoModel(String(car.brand), String(car.model));
    if (!resolved) return null;

    const targetYear = Number(car.year);
    const targetKm = Number(car.mileage) || 0;
    const levels = buildLevels(car, resolved);

    let chosen: { level: number; filters: SearchFilters; total: number; items: Omit<SautoListing, 'adjustedPrice'>[] } | null = null;
    for (let i = 0; i < levels.length; i++) {
      const f = levels[i];
      const data = await sautoGet<SearchResponse>('/items/search', toApiParams(f, PAGE_LIMIT));
      const items = (data.results ?? [])
        .map((r) => parseItem(r, f))
        .filter((x): x is Omit<SautoListing, 'adjustedPrice'> => x !== null);
      // Uchovej nejlepší dosavadní výsledek pro případ, že ani nejvolnější filtr nestačí
      if (!chosen || items.length > chosen.items.length) {
        chosen = { level: i + 1, filters: f, total: Number(data.pagination?.total) || items.length, items };
      }
      if (items.length >= MIN_COMPARABLES) {
        chosen = { level: i + 1, filters: f, total: Number(data.pagination?.total) || items.length, items };
        break;
      }
    }
    if (!chosen || chosen.items.length < 3) return null;

    // Koeficienty přepočtu z téže nabídky (s mezemi), jinak výchozí
    const fit = fitCoefficients(chosen.items);
    let per10k = PER10K_DEFAULT;
    let perYear = PERYEAR_DEFAULT;
    let coefSource: 'trh' | 'výchozí' = 'výchozí';
    if (fit) {
      per10k = clamp(fit.per10k, PER10K_BOUNDS);
      perYear = Number.isFinite(fit.perYear) ? clamp(fit.perYear, PERYEAR_BOUNDS) : PERYEAR_DEFAULT;
      coefSource = 'trh';
    }
    const effectiveKm = targetKm > 0 ? targetKm : quantile([...chosen.items.map((i) => i.km)].sort((a, b) => a - b), 0.5);

    const adjusted: SautoListing[] = chosen.items.map((i) => ({
      ...i,
      adjustedPrice: Math.round(adjustPrice(i, effectiveKm, targetYear, per10k, perYear)),
    }));
    const { kept, removed } = removeOutliers(adjusted);

    // Nejbližší vozy (rok + nájezd) nahoru — ty jsou pro srovnání nejcennější
    const distance = (l: SautoListing) => Math.abs(l.year - targetYear) + Math.abs(l.km - effectiveKm) / 30_000;
    kept.sort((a, b) => distance(a) - distance(b));

    if (detailCount > 0) {
      await mapPool(kept.slice(0, detailCount), 4, enrichWithDetail);
    }

    return {
      filterDescription: describeFilters(chosen.filters),
      relaxLevel: chosen.level,
      searchUrl: toWebUrl(chosen.filters),
      totalMatching: chosen.total,
      outliersRemoved: removed,
      listings: kept,
      asking: stats(kept.map((l) => l.price)),
      adjusted: stats(kept.map((l) => l.adjustedPrice)),
      coefficients: {
        per10kKm: Math.round(per10k * 1000) / 1000,
        perYear: Math.round(perYear * 1000) / 1000,
        source: coefSource,
      },
    };
  } catch (err) {
    console.error('[sauto] fetchSautoMarket failed (continuing without Sauto data):', err);
    return null;
  }
}

/** Kompaktní textová podoba trhu pro prompt (tabulka nejbližších vozů). */
export function formatMarketForPrompt(market: SautoMarket, maxRows: number): string {
  const fmt = (n: number) => n.toLocaleString('cs-CZ');
  const pct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)} %`;
  const lines: string[] = [];

  lines.push(`Filtr: ${market.filterDescription} (stupeň uvolnění ${market.relaxLevel}/5)`);
  lines.push(`Odpovídajících inzerátů na Sauto celkem: ${market.totalMatching}; v analýze ${market.listings.length} (odlehlých vyřazeno: ${market.outliersRemoved})`);
  lines.push(
    `Inzerované ceny: min ${fmt(market.asking.min)} | P25 ${fmt(market.asking.p25)} | medián ${fmt(market.asking.median)} | P75 ${fmt(market.asking.p75)} | max ${fmt(market.asking.max)} Kč`
  );
  lines.push(
    `Ceny PŘEPOČTENÉ na rok a nájezd oceňovaného vozu: P25 ${fmt(market.adjusted.p25)} | medián ${fmt(market.adjusted.median)} | P75 ${fmt(market.adjusted.p75)} Kč`
  );
  lines.push(
    `Koeficienty přepočtu (${market.coefficients.source === 'trh' ? 'odhad z této nabídky' : 'výchozí pro CZ trh'}): ` +
      `${pct(market.coefficients.per10kKm)} na každých +10 000 km, ${pct(market.coefficients.perYear)} za každý rok mladší`
  );
  // Výbavu, kterou má skoro každý srovnávaný vůz (ABS, ESP, …), nevypisujeme —
  // cenu odlišuje jen výbava, která u části vozů chybí.
  const rows = market.listings.slice(0, maxRows);
  const detailed = rows.filter((l) => l.equipment?.length);
  const common = new Set<string>();
  if (detailed.length >= 4) {
    const freq = new Map<string, number>();
    detailed.forEach((l) => l.equipment!.forEach((e) => freq.set(e, (freq.get(e) ?? 0) + 1)));
    freq.forEach((count, item) => { if (count / detailed.length >= 0.8) common.add(item); });
    if (common.size) lines.push(`Standardní výbava téměř všech srovnávaných vozů (v tabulce vynechána): ${[...common].join(', ')}`);
  }

  lines.push('');
  lines.push('| # | Titulek | Rok | Km | Výkon | Prodejce | Dní v inzerci | Cena | Přepočteno | Stav a odlišující výbava (z detailu) | Odkaz |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
  rows.forEach((l, idx) => {
    const flags: string[] = [];
    if (l.crashedInPast === true) flags.push('HAVAROVANÉ');
    if (l.serviceBook === true) flags.push('servisní knížka');
    if (l.firstOwner === true) flags.push('1. majitel');
    if (l.origin) flags.push(`původ ${l.origin}`);
    if (l.drive) flags.push(l.drive);
    if (l.equipment?.length) {
      const distinctive = l.equipment.filter((e) => !common.has(e));
      flags.push(`výbava ${l.equipment.length} položek${distinctive.length ? ': ' + distinctive.slice(0, 40).join(', ') : ''}`);
    }
    lines.push(
      `| ${idx + 1} | ${l.title.replace(/\|/g, '/')} | ${l.year} | ${fmt(l.km)} | ${l.powerKw ? l.powerKw + ' kW' : '–'} | ${l.seller} | ${l.daysListed} | ${fmt(l.price)} | ${fmt(l.adjustedPrice)} | ${flags.join('; ') || '–'} | ${l.url} |`
    );
  });
  return lines.join('\n');
}
