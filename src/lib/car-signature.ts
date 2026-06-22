export interface CarInput {
  // ── Core (used by generateSignature → cache key) ──
  brand: string;
  model: string;
  year: number | string;
  mileage?: number | string;
  transmission?: string;
  fuel?: string;

  // ── Rich fields (used ONLY by detailed/expert tier prompts) ──
  // These do NOT participate in the cache signature — they're variable per
  // user. The route bypasses the shared cache for detailed/expert so each
  // request gets a fresh analysis with these inputs.
  trim?: string;
  vin?: string;
  engineCapacity?: number | string;
  powerKw?: number | string;
  drivetrain?: string;
  bodyType?: string;
  color?: string;
  techCondition?: string;
  paintCondition?: string;
  accidents?: string;
  serviceHistory?: string;
  owners?: number | string;
  consumption?: string;
  originCountry?: string;
  tires?: string;        // stav/typ pneu (letní/zimní/celoroční + zbytek dezénu)
  stkValidity?: string;  // platnost STK (do kdy)
  importDetail?: string; // detail dovozu (první majitel v ČR / dovoz z …)
  equipment?: string[];
  notes?: string;
}

function removeDiacritics(str: string): string {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function slugify(str: string): string {
  return removeDiacritics(str.trim().toLowerCase())
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getYearBand(year: number): string {
  return `${year - 1}_${year + 1}`;
}

function getKmBand(km: number): string {
  const bandStart = Math.floor(Math.max(0, km) / 20_000) * 20;
  return `${bandStart}k_${bandStart + 20}k`;
}

function normalizeTransmission(val: string): string {
  const v = removeDiacritics(val.toLowerCase());
  if (v.includes('manual') || v.includes('manu')) return 'manual';
  if (v.includes('auto') || v.includes('dsg') || v.includes('pdk') || v.includes('cvt')) return 'automat';
  return 'any';
}

function normalizeFuel(val: string): string {
  const v = removeDiacritics(val.toLowerCase());
  if (v.includes('elektr') || v === 'ev') return 'elektro';
  if (v.includes('plug') || v.includes('phev')) return 'hybrid';
  if (v.includes('hybrid')) return 'hybrid';
  if (v.includes('diesel') || v.includes('nafta')) return 'diesel';
  if (v.includes('benz') || v.includes('petrol') || v.includes('gasoline')) return 'benzin';
  if (v.includes('lpg')) return 'lpg';
  if (v.includes('cng')) return 'cng';
  return 'any';
}

/**
 * Generates a normalized cache key for a car.
 * Example: "skoda-octavia-2017_2019-100k_120k-manual-diesel"
 *
 * Year banding: ±1 year (2018 → "2017_2019")
 * Mileage banding: 20 000 km bands (115 000 → "100k_120k")
 */
export function generateSignature(car: CarInput): string {
  const brandStr = car.brand?.toString().trim();
  const modelStr = car.model?.toString().trim();

  if (!brandStr) {
    throw new Error('generateSignature: chybí povinné pole "brand" (značka)');
  }
  if (!modelStr) {
    throw new Error('generateSignature: chybí povinné pole "model"');
  }
  if (car.year === undefined || car.year === null || car.year === '') {
    throw new Error('generateSignature: chybí povinné pole "year" (rok výroby)');
  }

  const year = Number(car.year);
  if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
    throw new Error(`generateSignature: neplatný rok výroby "${car.year}"`);
  }

  const brand = slugify(brandStr);
  const model = slugify(modelStr);
  const yearBand = getYearBand(year);
  const kmBand = getKmBand(car.mileage ? Number(car.mileage) : 0);
  const transmission = car.transmission ? normalizeTransmission(car.transmission) : 'any';
  const fuel = car.fuel ? normalizeFuel(car.fuel) : 'any';

  return `${brand}-${model}-${yearBand}-${kmBand}-${transmission}-${fuel}`;
}
