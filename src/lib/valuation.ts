import type { PriceStatsPrior } from './price-stats';

/**
 * valuation.ts — SERVEROVÝ robustní výpočet tržní ceny z nalezených inzerátů.
 *
 * Proč: dřív bylo headline číslo (averagePrice) jen volný odhad modelu uvnitř
 * JSON — netransparentní a náchylné k halucinaci. Tady místo toho každý inzerát
 * normalizujeme na oceňovaný vůz (korekce na nájezd, stáří, převodovku), vyhodíme
 * odlehlé hodnoty (IQR) a spočítáme robustní střed (medián) + pásmo (percentily).
 * Výsledek pak sloučíme (blend) s historickým priorem a křížově ověříme proti
 * číslu modelu. Vše deterministické a reprodukovatelné.
 *
 * Použito pro expert/detailed tier (kde model vrací strojově čitelné `comparables`).
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
  powerKw?: number;
}

export interface ValuationResult {
  averagePrice: number;   // robustní střed (medián normalizovaných cen)
  minPrice: number;       // dolní mez pásma (p25 z očištěné sady)
  maxPrice: number;       // horní mez pásma (p75 z očištěné sady)
  p25: number;
  p50: number;
  p75: number;
  nComps: number;         // počet inzerátů použitých po očištění
  nRaw: number;           // počet platných inzerátů před očištěním
  methodologyMarkdown: string;
  notes: string[];
}

// ── Koeficienty korekcí (konzervativní, s tvrdými stropy) ──────────────────
const MILEAGE_RATE_PER_10K = 0.025;  // ~2,5 % ceny na každých 10 000 km rozdílu
const DEPR_PER_YEAR = 0.08;          // ~8 % ročně (stáří)
const AUTOMAT_PREMIUM = 0.05;        // automat ~ +5 % oproti manuálu
const MIN_COMPS_FOR_ROBUST = 4;      // pod tímto počtem nemá smysl statistika

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function isAutomatic(t?: string): boolean | null {
  if (!t) return null;
  const v = t.toLowerCase();
  if (v.includes('manu')) return false;
  if (v.includes('auto') || v.includes('dsg') || v.includes('pdk') || v.includes('cvt') || v.includes('tiptr')) return true;
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

  let factor = 1;

  // Nájezd: víc km u inzerátu než u subjektu → inzerát je levnější → škálujeme NAHORU.
  if (Number.isFinite(comp.mileageKm) && Number.isFinite(subject.mileageKm)) {
    const deltaKm = Number(comp.mileageKm) - Number(subject.mileageKm);
    factor *= 1 + MILEAGE_RATE_PER_10K * (deltaKm / 10_000);
  }

  // Stáří: subjekt novější → má vyšší hodnotu → starší inzerát škálujeme nahoru.
  if (Number.isFinite(comp.year) && Number.isFinite(subject.year)) {
    const yearsSubjectNewer = Number(subject.year) - Number(comp.year);
    factor *= Math.pow(1 + DEPR_PER_YEAR, yearsSubjectNewer);
  }

  // Převodovka: automat má prémii. Sjednotíme na typ subjektu.
  const subjAuto = isAutomatic(subject.transmission);
  const compAuto = isAutomatic(comp.transmission);
  if (subjAuto !== null && compAuto !== null && subjAuto !== compAuto) {
    factor *= subjAuto ? (1 + AUTOMAT_PREMIUM) : 1 / (1 + AUTOMAT_PREMIUM);
  }

  // Tvrdý strop, aby jeden divoký inzerát nerozhodil agregaci.
  factor = clamp(factor, 0.55, 1.8);
  return Math.round(price * factor);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? Math.round(sorted[base] + rest * (sorted[base + 1] - sorted[base]))
    : sorted[base];
}

/** Vyhodí odlehlé hodnoty metodou IQR (1.5×). */
function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const cleaned = sorted.filter((v) => v >= lo && v <= hi);
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

  // Preferuj inzeráty stejného modelu; pokud jich je málo, ber všechny.
  const sameModel = comparables.filter((c) => c.sameModel !== false);
  const pool = sameModel.length >= MIN_COMPS_FOR_ROBUST ? sameModel : comparables;

  const adjusted = pool
    .map((c) => adjustCompToSubject(c, subject))
    .filter((v): v is number => v != null && v > 0);

  const nRaw = adjusted.length;
  if (nRaw < MIN_COMPS_FOR_ROBUST) return null;

  const cleaned = removeOutliers(adjusted).sort((a, b) => a - b);
  const nComps = cleaned.length;
  const removed = nRaw - nComps;

  const p25 = quantile(cleaned, 0.25);
  const p50 = quantile(cleaned, 0.50);
  const p75 = quantile(cleaned, 0.75);

  let central = p50; // robustní střed

  // Blend s historickým priorem (vlastní agregáty Cargent). Váha priorem roste
  // s počtem vzorků (strop 5) a klesá s jeho stářím.
  const prior = opts.prior;
  if (prior && prior.nSamples >= 2 && prior.medianPrice > 0) {
    const ageDecay = clamp(1 - (prior.ageDays ?? 0) / 60, 0.2, 1); // starší než 60 dní → min váha
    const wPrior = Math.min(prior.nSamples, 5) * ageDecay;
    const wDet = nComps;
    const blended = (wDet * central + wPrior * prior.medianPrice) / (wDet + wPrior);
    notes.push(
      `Sloučeno s historickým priorem (medián ${fmtKc(prior.medianPrice)} z ${prior.nSamples} skenů, stáří ${prior.ageDays} dní).`
    );
    central = blended;
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

  const averagePrice = Math.round(central);

  const methodologyMarkdown =
    `## 🧮 Metodika výpočtu ceny\n` +
    `- **Doporučená cena (robustní medián): ${fmtKc(averagePrice)}**\n` +
    `- Pásmo (25.–75. percentil): ${fmtKc(lo)} – ${fmtKc(hi)}\n` +
    `- Použito inzerátů: ${nComps}${removed > 0 ? ` (vyřazeno ${removed} odlehlých)` : ''} z ${nRaw} nasbíraných\n` +
    `- Každý inzerát normalizován na tento vůz: korekce na nájezd ` +
    `(~${(MILEAGE_RATE_PER_10K * 100).toFixed(1)} %/10 000 km), stáří ` +
    `(~${(DEPR_PER_YEAR * 100).toFixed(0)} %/rok) a převodovku.\n` +
    (notes.length ? notes.map((n) => `- ${n}`).join('\n') + '\n' : '');

  return {
    averagePrice,
    minPrice: Math.round(lo),
    maxPrice: Math.round(hi),
    p25,
    p50,
    p75,
    nComps,
    nRaw,
    methodologyMarkdown,
    notes,
  };
}
