import type { PriceStatsPrior } from './price-stats';

/**
 * valuation.ts — SERVEROVÝ robustní výpočet tržní ceny z nalezených inzerátů.
 *
 * Model (Claude + web search) dodá strojově čitelné `comparables`. Tady každý
 * inzerát normalizujeme na oceňovaný vůz (korekce na nájezd, stáří, převodovku),
 * ohodnotíme podobnost (váha), vyhodíme odlehlé hodnoty a spočítáme VÁŽENÝ
 * medián + pásmo (vážené percentily). Výsledek sloučíme s historickým priorem
 * (vlastní agregáty Cargent) a křížově ověříme proti číslu modelu.
 *
 * Vše deterministické a reprodukovatelné — headline číslo nikdy nepochází
 * z „pocitu“ modelu, ale z transparentní statistiky nad reálnými inzeráty.
 * Používá se pro VŠECHNY tiery (quick i expert).
 */

/** Jeden srovnávací inzerát tak, jak ho vrací model v poli `comparables`. */
export interface Comparable {
  portal?: string;
  url?: string;
  price?: number;
  year?: number;
  mileageKm?: number;
  powerKw?: number;
  transmission?: string;
  fuel?: string;
  trim?: string;
  /** Model sám označí, zda jde o stejný model/generaci (ne jen příbuzný). */
  sameModel?: boolean;
}

/** Oceňovaný vůz (subjekt), na který se inzeráty normalizují. */
export interface ValuationSubject {
  year: number;
  mileageKm: number;
  transmission?: string;
  fuel?: string;
  powerKw?: number;
}

export interface ValuationResult {
  averagePrice: number;   // robustní střed (vážený medián normalizovaných cen)
  minPrice: number;       // dolní mez pásma (p25 z očištěné sady)
  maxPrice: number;       // horní mez pásma (p75 z očištěné sady)
  p25: number;
  p50: number;
  p75: number;
  /** Orientační výkupní cena pro autobazar (marže + riziko + přípravné náklady). */
  dealerBuyPrice: number;
  nComps: number;         // počet inzerátů použitých po očištění
  nRaw: number;           // počet platných inzerátů před očištěním
  /** 0–1: jak moc věřit výsledku (počet + podobnost + rozptyl). */
  confidence: number;
  methodologyMarkdown: string;
  notes: string[];
}

// ── Koeficienty korekcí (konzervativní, s tvrdými stropy) ──────────────────
// Nájezd: vliv km na cenu s věkem klesá (u 12 let starého vozu 20 000 km navíc
// nehraje takovou roli jako u tříletého).
function mileageRatePer10k(ageYears: number): number {
  if (ageYears <= 3) return 0.030;
  if (ageYears <= 6) return 0.025;
  if (ageYears <= 10) return 0.018;
  return 0.012;
}
// Stáří: roční depreciace — mladší vozy ztrácí rychleji.
function depreciationPerYear(ageYears: number): number {
  if (ageYears <= 3) return 0.12;
  if (ageYears <= 7) return 0.09;
  if (ageYears <= 12) return 0.06;
  return 0.04;
}
const AUTOMAT_PREMIUM = 0.05;        // automat ~ +5 % oproti manuálu
const MIN_COMPS_FOR_ROBUST = 3;      // pod tímto počtem nemá smysl statistika
const DEALER_BUY_RATIO = 0.86;       // výkup ≈ 86 % doporučené prodejní ceny

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function isAutomatic(t?: string): boolean | null {
  if (!t) return null;
  const v = t.toLowerCase();
  if (v.includes('manu')) return false;
  if (v.includes('auto') || v.includes('dsg') || v.includes('pdk') || v.includes('cvt') || v.includes('tiptr')) return true;
  return null;
}

function fuelClass(f?: string): string | null {
  if (!f) return null;
  const v = f.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (v.includes('plug') || v.includes('phev')) return 'phev';
  if (v.includes('elektr') || v === 'ev' || v.includes('electric')) return 'ev';
  if (v.includes('hybrid')) return 'hybrid';
  if (v.includes('diesel') || v.includes('nafta') || v.includes('tdi')) return 'diesel';
  if (v.includes('benz') || v.includes('petrol') || v.includes('gasoline') || v.includes('tsi')) return 'benzin';
  if (v.includes('lpg')) return 'lpg';
  if (v.includes('cng')) return 'cng';
  return null;
}

/**
 * Normalizuje cenu jednoho inzerátu na oceňovaný vůz. Každou korekci aplikuje
 * jen když jsou data k dispozici; výsledný násobič je zastropovaný, aby jeden
 * extrémní inzerát nerozhodil odhad.
 */
export function adjustCompToSubject(comp: Comparable, subject: ValuationSubject): number | null {
  const price = Number(comp.price);
  if (!Number.isFinite(price) || price <= 0) return null;

  const nowYear = new Date().getFullYear();
  const subjAge = Math.max(0, nowYear - Number(subject.year));
  let factor = 1;

  // Nájezd: víc km u inzerátu než u subjektu → inzerát je levnější → škálujeme NAHORU.
  if (Number.isFinite(comp.mileageKm) && Number(comp.mileageKm) > 0 && Number.isFinite(subject.mileageKm) && subject.mileageKm > 0) {
    const deltaKm = Number(comp.mileageKm) - Number(subject.mileageKm);
    factor *= 1 + mileageRatePer10k(subjAge) * (deltaKm / 10_000);
  }

  // Stáří: subjekt novější → má vyšší hodnotu → starší inzerát škálujeme nahoru.
  if (Number.isFinite(comp.year) && Number(comp.year) > 1900 && Number.isFinite(subject.year)) {
    const yearsSubjectNewer = Number(subject.year) - Number(comp.year);
    factor *= Math.pow(1 + depreciationPerYear(subjAge), yearsSubjectNewer);
  }

  // Převodovka: automat má prémii. Sjednotíme na typ subjektu.
  const subjAuto = isAutomatic(subject.transmission);
  const compAuto = isAutomatic(comp.transmission);
  if (subjAuto !== null && compAuto !== null && subjAuto !== compAuto) {
    factor *= subjAuto ? (1 + AUTOMAT_PREMIUM) : 1 / (1 + AUTOMAT_PREMIUM);
  }

  // Tvrdý strop, aby jeden divoký inzerát nerozhodil agregaci.
  factor = clamp(factor, 0.6, 1.6);
  return Math.round(price * factor);
}

/**
 * Váha inzerátu podle podobnosti se subjektem (0.05–1). Blízké roky, nájezd a
 * stejný model dostanou plnou váhu; příbuzné vozy jen zlomek.
 */
export function similarityWeight(comp: Comparable, subject: ValuationSubject): number {
  let w = comp.sameModel === false ? 0.35 : 1;

  if (Number.isFinite(comp.year) && Number(comp.year) > 1900) {
    const dy = Math.abs(Number(comp.year) - subject.year);
    w *= 1 / (1 + 0.45 * dy);
  } else {
    w *= 0.6; // neznámý rok = méně věrohodné
  }

  if (Number.isFinite(comp.mileageKm) && Number(comp.mileageKm) > 0 && subject.mileageKm > 0) {
    const dkm = Math.abs(Number(comp.mileageKm) - subject.mileageKm);
    w *= 1 / (1 + dkm / 50_000);
  } else {
    w *= 0.6;
  }

  if (Number.isFinite(comp.powerKw) && Number(comp.powerKw) > 0 && subject.powerKw && subject.powerKw > 0) {
    const rel = Math.abs(Number(comp.powerKw) - subject.powerKw) / subject.powerKw;
    if (rel > 0.35) w *= 0.5;
  }

  const sf = fuelClass(subject.fuel);
  const cf = fuelClass(comp.fuel);
  if (sf && cf && sf !== cf) w *= 0.4;

  return clamp(w, 0.05, 1);
}

interface Weighted { v: number; w: number }

/** Vážený kvantil (lineární interpolace na kumulativních vahách). */
function weightedQuantile(items: Weighted[], q: number): number {
  if (items.length === 0) return 0;
  const sorted = [...items].sort((a, b) => a.v - b.v);
  const total = sorted.reduce((s, x) => s + x.w, 0);
  if (total <= 0) return sorted[Math.floor((sorted.length - 1) * q)].v;
  const target = q * total;
  let acc = 0;
  for (let i = 0; i < sorted.length; i++) {
    const prev = acc;
    acc += sorted[i].w;
    if (acc >= target) {
      if (i === 0 || sorted[i].w === 0) return Math.round(sorted[i].v);
      // interpolace mezi předchozí a aktuální hodnotou
      const t = (target - prev) / sorted[i].w;
      const lo = sorted[i - 1].v;
      return Math.round(lo + t * (sorted[i].v - lo));
    }
  }
  return Math.round(sorted[sorted.length - 1].v);
}

/** Vyhodí odlehlé hodnoty metodou IQR (1.5×) nad (neváženými) hodnotami. */
function removeOutliers(items: Weighted[]): Weighted[] {
  if (items.length < 4) return items;
  const sorted = [...items].sort((a, b) => a.v - b.v);
  const plain = sorted.map((x) => ({ v: x.v, w: 1 }));
  const q1 = weightedQuantile(plain, 0.25);
  const q3 = weightedQuantile(plain, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const cleaned = sorted.filter((x) => x.v >= lo && x.v <= hi);
  return cleaned.length >= 3 ? cleaned : sorted;
}

const fmtKc = (n: number) => Math.round(n).toLocaleString('cs-CZ') + ' Kč';

/**
 * Spočítá robustní odhad z inzerátů a sloučí ho s priorem + číslem modelu.
 * Vrací null, pokud je platných inzerátů příliš málo (volající pak nechá čísla
 * modelu beze změny).
 */
export function computeValuation(
  comparables: Comparable[],
  subject: ValuationSubject,
  opts: { prior?: PriceStatsPrior | null; modelAveragePrice?: number } = {}
): ValuationResult | null {
  const notes: string[] = [];

  // Preferuj inzeráty stejného modelu; pokud jich je málo, ber všechny (s nižší váhou).
  const sameModel = comparables.filter((c) => c.sameModel !== false);
  const pool = sameModel.length >= MIN_COMPS_FOR_ROBUST ? sameModel : comparables;

  const weighted: Weighted[] = [];
  for (const c of pool) {
    const v = adjustCompToSubject(c, subject);
    if (v == null || v <= 0) continue;
    weighted.push({ v, w: similarityWeight(c, subject) });
  }

  const nRaw = weighted.length;
  if (nRaw < MIN_COMPS_FOR_ROBUST) return null;

  const cleaned = removeOutliers(weighted);
  const nComps = cleaned.length;
  const removed = nRaw - nComps;

  const p25 = weightedQuantile(cleaned, 0.25);
  const p50 = weightedQuantile(cleaned, 0.50);
  const p75 = weightedQuantile(cleaned, 0.75);

  let central = p50; // robustní střed

  // Blend s historickým priorem (vlastní agregáty Cargent). Váha priorem roste
  // s počtem vzorků (strop 4) a klesá s jeho stářím. Aktuální inzeráty mají vždy převahu.
  const prior = opts.prior;
  if (prior && prior.nSamples >= 2 && prior.medianPrice > 0) {
    const ageDecay = clamp(1 - (prior.ageDays ?? 0) / 60, 0.2, 1); // starší než 60 dní → min váha
    const wPrior = Math.min(prior.nSamples, 4) * ageDecay;
    const wDet = Math.max(nComps, 6);
    const rel = Math.abs(prior.medianPrice - central) / central;
    if (rel < 0.35) {
      const blended = (wDet * central + wPrior * prior.medianPrice) / (wDet + wPrior);
      notes.push(
        `Sloučeno s historickým priorem Cargent (medián ${fmtKc(prior.medianPrice)} z ${prior.nSamples} dřívějších ocenění, stáří ${prior.ageDays} dní).`
      );
      central = blended;
    } else {
      notes.push(
        `Historický prior (${fmtKc(prior.medianPrice)}) se výrazně liší od aktuálních inzerátů — ignorován, trh se posunul.`
      );
    }
  }

  // Křížová kontrola proti číslu modelu: velký rozpor → rozšíříme pásmo a varujeme.
  let lo = p25;
  let hi = p75;
  const modelAvg = Number(opts.modelAveragePrice);
  if (Number.isFinite(modelAvg) && modelAvg > 0) {
    const rel = Math.abs(modelAvg - central) / central;
    if (rel > 0.25) {
      lo = Math.min(lo, Math.round(modelAvg * 0.95));
      hi = Math.max(hi, Math.round(modelAvg * 1.05));
      notes.push(
        `Odhad modelu (${fmtKc(modelAvg)}) se liší od výpočtu z inzerátů o ${Math.round(rel * 100)} % — pásmo rozšířeno, ber s rezervou.`
      );
    }
  }

  // Pásmo nikdy nesmí být degenerované (stejná čísla) — min. ±4 %.
  const minSpread = Math.round(central * 0.04);
  if (hi - lo < 2 * minSpread) {
    lo = Math.round(central - minSpread);
    hi = Math.round(central + minSpread);
  }

  const averagePrice = Math.round(central);
  const dealerBuyPrice = Math.round(averagePrice * DEALER_BUY_RATIO / 1000) * 1000;

  // Spolehlivost: počet inzerátů (do 12 lineárně), průměrná váha podobnosti, rozptyl pásma.
  const avgW = cleaned.reduce((s, x) => s + x.w, 0) / cleaned.length;
  const spread = central > 0 ? (p75 - p25) / central : 1;
  const confidence = clamp(
    0.45 * Math.min(nComps / 12, 1) + 0.35 * avgW + 0.2 * clamp(1 - spread / 0.4, 0, 1),
    0.05,
    0.98,
  );

  const methodologyMarkdown =
    `## Metodika výpočtu ceny\n` +
    `- **Doporučená prodejní cena (vážený medián): ${fmtKc(averagePrice)}**\n` +
    `- Pásmo (25.–75. percentil): ${fmtKc(lo)} – ${fmtKc(hi)}\n` +
    `- Orientační výkupní cena pro autobazar: ${fmtKc(dealerBuyPrice)}\n` +
    `- Použito inzerátů: ${nComps}${removed > 0 ? ` (vyřazeno ${removed} odlehlých)` : ''} z ${nRaw} nasbíraných · spolehlivost ${Math.round(confidence * 100)} %\n` +
    `- Každý inzerát normalizován na tento vůz: korekce na nájezd, stáří a převodovku; váha podle podobnosti (rok, km, výkon, palivo, stejný model).\n` +
    (notes.length ? notes.map((n) => `- ${n}`).join('\n') + '\n' : '');

  return {
    averagePrice,
    minPrice: Math.round(lo),
    maxPrice: Math.round(hi),
    p25,
    p50,
    p75,
    dealerBuyPrice,
    nComps,
    nRaw,
    confidence,
    methodologyMarkdown,
    notes,
  };
}
