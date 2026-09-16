'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ResultPanel, { type EstimateResult } from './ResultPanel';
import { CREDITS_CHANGED_EVENT } from '@/components/token-badge';
import { ESTIMATOR_TIERS, TOKEN_VALUE_CZK, formatTokens, type EstimatorTierKey, type TokenFeature } from '@/lib/tokens';
import {
  ACCIDENTS, BODY_TYPES, CAR_BRANDS, CAR_MODELS, COLORS, EQUIPMENT, FUELS, IMPORT_DETAILS,
  ORIGINS, OWNERS, PAINT_CONDITIONS, SERVICE_HISTORY, TECH_CONDITIONS, TIRES, TRANSMISSIONS,
} from '@/data/car-models';

type Scope = 'czech' | 'international';

interface FormState {
  brand: string; model: string; year: string; mileage: string; fuel: string; transmission: string;
  trim: string; vin: string; powerKw: string; engineCapacity: string; bodyType: string; color: string;
  techCondition: string; paintCondition: string; accidents: string; serviceHistory: string; owners: string;
  originCountry: string; importDetail: string; stkValidity: string; tires: string; notes: string;
  equipment: string[];
}

const EMPTY: FormState = {
  brand: '', model: '', year: '', mileage: '', fuel: '', transmission: '',
  trim: '', vin: '', powerKw: '', engineCapacity: '', bodyType: '', color: '',
  techCondition: '', paintCondition: '', accidents: '', serviceHistory: '', owners: '',
  originCountry: '', importDetail: '', stkValidity: '', tires: '', notes: '', equipment: [],
};

const DRAFT_KEY = 'cargent_estimator_draft_v2';
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => String(CURRENT_YEAR - i));

interface Props {
  pricing: Record<TokenFeature, number>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  balance: number | null;
}

export default function EstimatorForm({ pricing, isAuthenticated, isAdmin, balance: initialBalance }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [tier, setTier] = useState<EstimatorTierKey>('standard');
  const [scope, setScope] = useState<Scope>('czech');
  const [moreOpen, setMoreOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [balance, setBalance] = useState<number | null>(initialBalance);
  const [elapsed, setElapsed] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  // Obnova rozepsaného formuláře (pohodlí, jen v tomto prohlížeči)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<FormState> & { tier?: EstimatorTierKey; scope?: Scope };
        setForm({ ...EMPTY, ...saved, equipment: Array.isArray(saved.equipment) ? saved.equipment : [] });
        if (saved.tier && ESTIMATOR_TIERS.some((t) => t.key === saved.tier)) setTier(saved.tier);
        if (saved.scope === 'international') setScope('international');
      }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...form, tier, scope })); } catch { /* ignore */ }
  }, [form, tier, scope]);

  useEffect(() => {
    if (status !== 'running') return;
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [status]);

  const tierDef = ESTIMATOR_TIERS.find((t) => t.key === tier)!;
  const cost = pricing[tierDef.feature];
  const models = useMemo(() => CAR_MODELS[form.brand] ?? [], [form.brand]);
  const insufficient = isAuthenticated && !isAdmin && balance != null && balance < cost;
  const richFieldsIgnored = tier === 'quick' || tier === 'standard';

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.brand.trim()) next.brand = 'Zadejte značku.';
    if (!form.model.trim()) next.model = 'Zadejte model.';
    if (!form.year) next.year = 'Vyberte rok výroby.';
    const km = Number(form.mileage);
    if (!form.mileage || !Number.isFinite(km) || km < 0) next.mileage = 'Zadejte nájezd v km.';
    if (km > 2_000_000) next.mileage = 'To je moc kilometrů. Zkontrolujte hodnotu.';
    const vin = form.vin.trim();
    if (vin && vin.length !== 17) next.vin = 'VIN má 17 znaků.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!isAuthenticated && !isAdmin) {
      window.location.assign('/prihlaseni?next=%2Fodhad-ceny');
      return;
    }

    setStatus('running');
    setErrorMsg(null);
    setResult(null);
    setElapsed(0);

    const num = (v: string) => (v.trim() === '' ? undefined : Number(v));
    const str = (v: string) => (v.trim() === '' ? undefined : v.trim());
    const car = {
      brand: form.brand.trim(), model: form.model.trim(), year: Number(form.year), mileage: Number(form.mileage) || 0,
      fuel: str(form.fuel), transmission: str(form.transmission),
      trim: str(form.trim), vin: str(form.vin.toUpperCase()), powerKw: num(form.powerKw), engineCapacity: num(form.engineCapacity),
      bodyType: str(form.bodyType), color: str(form.color), techCondition: str(form.techCondition), paintCondition: str(form.paintCondition),
      accidents: str(form.accidents), serviceHistory: str(form.serviceHistory), owners: str(form.owners), originCountry: str(form.originCountry),
      importDetail: str(form.importDetail), stkValidity: str(form.stkValidity), tires: str(form.tires), notes: str(form.notes),
      equipment: form.equipment.length ? form.equipment : undefined,
    };

    try {
      const res = await fetch('/api/price-estimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ car, tier, scope }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<EstimateResult> & { error?: string; code?: string };
      if (!res.ok) {
        if (res.status === 401) { window.location.assign('/prihlaseni?next=%2Fodhad-ceny'); return; }
        throw new Error(data.error ?? `Chyba serveru (${res.status}).`);
      }
      setResult({
        markdownText: data.markdownText ?? '',
        averagePrice: data.averagePrice ?? 0,
        minPrice: data.minPrice ?? 0,
        maxPrice: data.maxPrice ?? 0,
        listingCount: data.listingCount ?? 0,
        sources: data.sources ?? [],
        summary: data.summary,
        valuation: data.valuation ?? null,
        cached: Boolean(data.cached),
        ageHours: data.ageHours ?? null,
        tokensDeducted: data.tokensDeducted ?? 0,
        tier: data.tier ?? tier,
      });
      setStatus('done');
      if (balance != null && data.tokensDeducted) setBalance(balance - data.tokensDeducted);
      window.dispatchEvent(new CustomEvent(CREDITS_CHANGED_EVENT));
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Ocenění se nepodařilo dokončit.');
      window.dispatchEvent(new CustomEvent(CREDITS_CHANGED_EVENT));
    }
  }

  function reset() {
    setResult(null);
    setStatus('idle');
    setErrorMsg(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const carTitle = [form.brand, form.model, form.year].filter(Boolean).join(' ');

  if (status === 'done' && result) {
    return (
      <div ref={resultRef} className="scroll-mt-24">
        <ResultPanel result={result} carTitle={carTitle} onReset={reset} />
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-16">
      <div className="space-y-12">
        {/* ── Auto ──────────────────────────────────────────────── */}
        <fieldset disabled={status === 'running'}>
          <legend className="text-[18px] font-bold tracking-tight text-ink">Auto</legend>
          <p className="mt-1 text-[13.5px] text-dim">Stačí základní údaje. Čím přesnější, tím lepší srovnání.</p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <Field label="Značka" error={errors.brand} htmlFor="brand" required>
              <input id="brand" list="brand-list" autoComplete="off" value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="Škoda" className={inputClass(errors.brand)} />
              <datalist id="brand-list">{CAR_BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
            </Field>
            <Field label="Model" error={errors.model} htmlFor="model" required>
              <input id="model" list="model-list" autoComplete="off" value={form.model} onChange={(e) => set('model', e.target.value)} placeholder="Octavia Combi" className={inputClass(errors.model)} />
              <datalist id="model-list">{models.map((m) => <option key={m} value={m} />)}</datalist>
            </Field>
            <Field label="Rok výroby" error={errors.year} htmlFor="year" required>
              <select id="year" value={form.year} onChange={(e) => set('year', e.target.value)} className={inputClass(errors.year)}>
                <option value="">Vyberte</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Najeto" error={errors.mileage} htmlFor="mileage" required suffix="km">
              <input id="mileage" type="number" inputMode="numeric" min={0} step={1000} value={form.mileage} onChange={(e) => set('mileage', e.target.value)} placeholder="125 000" className={inputClass(errors.mileage)} />
            </Field>
            <Field label="Palivo" htmlFor="fuel">
              <select id="fuel" value={form.fuel} onChange={(e) => set('fuel', e.target.value)} className={inputClass()}>
                <option value="">Vyberte</option>
                {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Převodovka" htmlFor="transmission">
              <select id="transmission" value={form.transmission} onChange={(e) => set('transmission', e.target.value)} className={inputClass()}>
                <option value="">Vyberte</option>
                {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        </fieldset>

        {/* ── Více údajů ────────────────────────────────────────── */}
        <fieldset disabled={status === 'running'} className="border-t border-line pt-8">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            aria-controls="more-fields"
            className="flex w-full items-center justify-between gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
          >
            <span>
              <span className="block text-[18px] font-bold tracking-tight text-ink">Více údajů</span>
              <span className="mt-1 block text-[13.5px] text-dim">
                Nepovinné. Stav, výbava a historie zpřesní Detailní a Expertní posudek.
              </span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-dim transition-transform ${moreOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>

          {moreOpen ? (
            <div id="more-fields" className="mt-6 space-y-8">
              {richFieldsIgnored ? (
                <p className="rounded-md border border-line bg-paper-2 px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
                  U úrovně {tierDef.label} se tyto údaje předají AI jen orientačně. Plný rozbor stavu a výbavy v korunách dostanete u Detailní a Expertní úrovně.
                </p>
              ) : null}

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Verze / výbava" htmlFor="trim"><input id="trim" value={form.trim} onChange={(e) => set('trim', e.target.value)} placeholder="Style, 2.0 TDI" className={inputClass()} /></Field>
                <Field label="VIN" htmlFor="vin" error={errors.vin}><input id="vin" value={form.vin} maxLength={17} autoCapitalize="characters" spellCheck={false} onChange={(e) => set('vin', e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))} placeholder="TMBJH7NX8PY123456" className={`${inputClass(errors.vin)} cargent-mono`} /></Field>
                <Field label="Výkon" htmlFor="powerKw" suffix="kW"><input id="powerKw" type="number" inputMode="numeric" min={0} value={form.powerKw} onChange={(e) => set('powerKw', e.target.value)} placeholder="110" className={inputClass()} /></Field>
                <Field label="Objem motoru" htmlFor="engineCapacity" suffix="ccm"><input id="engineCapacity" type="number" inputMode="numeric" min={0} value={form.engineCapacity} onChange={(e) => set('engineCapacity', e.target.value)} placeholder="1968" className={inputClass()} /></Field>
                <SelectField label="Karoserie" id="bodyType" value={form.bodyType} onChange={(v) => set('bodyType', v)} options={BODY_TYPES} />
                <SelectField label="Barva" id="color" value={form.color} onChange={(v) => set('color', v)} options={COLORS} />
              </div>

              <div>
                <h3 className="text-[15px] font-bold text-ink">Stav a historie</h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <SelectField label="Technický stav" id="techCondition" value={form.techCondition} onChange={(v) => set('techCondition', v)} options={TECH_CONDITIONS} />
                  <SelectField label="Lak a karoserie" id="paintCondition" value={form.paintCondition} onChange={(v) => set('paintCondition', v)} options={PAINT_CONDITIONS} />
                  <SelectField label="Nehody" id="accidents" value={form.accidents} onChange={(v) => set('accidents', v)} options={ACCIDENTS} />
                  <SelectField label="Servisní historie" id="serviceHistory" value={form.serviceHistory} onChange={(v) => set('serviceHistory', v)} options={SERVICE_HISTORY} />
                  <SelectField label="Počet majitelů" id="owners" value={form.owners} onChange={(v) => set('owners', v)} options={OWNERS} />
                  <SelectField label="Země původu" id="originCountry" value={form.originCountry} onChange={(v) => set('originCountry', v)} options={ORIGINS} />
                  <SelectField label="Dovoz / historie v ČR" id="importDetail" value={form.importDetail} onChange={(v) => set('importDetail', v)} options={IMPORT_DETAILS} />
                  <SelectField label="Pneumatiky" id="tires" value={form.tires} onChange={(v) => set('tires', v)} options={TIRES} />
                  <Field label="Platnost STK" htmlFor="stkValidity"><input id="stkValidity" value={form.stkValidity} onChange={(e) => set('stkValidity', e.target.value)} placeholder="03/2027" className={inputClass()} /></Field>
                </div>
              </div>

              <div>
                <h3 className="text-[15px] font-bold text-ink">Výbava</h3>
                <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2 md:grid-cols-3">
                  {EQUIPMENT.map((item) => {
                    const checked = form.equipment.includes(item);
                    return (
                      <label key={item} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink-soft">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => set('equipment', e.target.checked ? [...form.equipment, item] : form.equipment.filter((x) => x !== item))}
                          className="h-4 w-4 accent-[#2563EB]"
                        />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>

              <Field label="Poznámky" htmlFor="notes">
                <textarea id="notes" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Závady, důvod prodeje, nadstandardní výbava, chystáte se kupovat nebo prodávat…" className={`${inputClass()} resize-y`} />
              </Field>
            </div>
          ) : null}
        </fieldset>
      </div>

      {/* ── Pravý sloupec: úroveň + spuštění ─────────────────────── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <fieldset disabled={status === 'running'}>
          <legend className="text-[18px] font-bold tracking-tight text-ink">Úroveň ocenění</legend>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {ESTIMATOR_TIERS.map((t) => {
              const c = pricing[t.feature];
              const active = tier === t.key;
              return (
                <label
                  key={t.key}
                  className={`flex cursor-pointer items-start gap-3 py-3.5 transition-colors ${active ? '' : 'hover:bg-paper-2/60'}`}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={t.key}
                    checked={active}
                    onChange={() => setTier(t.key)}
                    className="mt-1 h-4 w-4 accent-[#2563EB]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className={`text-[15px] font-semibold ${active ? 'text-ink' : 'text-ink-soft'}`}>{t.label}</span>
                      <span className="cargent-mono shrink-0 text-[13px] text-ink">
                        {c === 0 ? 'zdarma' : `${c} tok.`}
                        <span className="text-faint"> · ≈ {c * TOKEN_VALUE_CZK} Kč</span>
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[13px] text-dim">{t.tagline} · ~{Math.round(t.durationSec / 60 * 10) / 10 < 1 ? `${t.durationSec} s` : `${Math.round(t.durationSec / 60)} min`}</span>
                    {active ? (
                      <ul className="mt-2 space-y-0.5 text-[13px] text-ink-soft">
                        {t.includes.map((inc) => <li key={inc}>· {inc}</li>)}
                      </ul>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-5">
            <span className="text-[13px] font-medium text-ink-soft">Kde hledat</span>
            <div className="mt-2 inline-flex rounded-md border border-line-2 p-0.5" role="radiogroup" aria-label="Rozsah hledání">
              {([['czech', 'Jen ČR'], ['international', 'ČR + zahraničí']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={scope === value}
                  onClick={() => setScope(value)}
                  className={`rounded px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${scope === value ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[12px] text-faint">
              {scope === 'czech' ? 'Sauto, TipCars, AutoScout24 a další české portály.' : 'Navíc mobile.de, AutoScout24.de, otomoto.pl, willhaben.at (ceny přepočtené do Kč).'}
            </p>
          </div>
        </fieldset>

        <div className="mt-7 border-t border-line pt-6">
          {status === 'running' ? (
            <Progress tier={tier} elapsed={elapsed} scope={scope} />
          ) : (
            <>
              {!isAuthenticated && !isAdmin ? (
                <p className="mb-4 text-[13.5px] leading-relaxed text-ink-soft">
                  Pro ocenění se <Link href="/prihlaseni?next=%2Fodhad-ceny" className="cargent-link font-medium text-brass">přihlaste</Link> nebo si <Link href="/registrace?next=%2Fodhad-ceny" className="cargent-link font-medium text-brass">založte účet</Link>. Registrace je zdarma, ocenění se platí tokeny.
                </p>
              ) : insufficient ? (
                <p className="mb-4 rounded-md border border-negative/20 bg-negative/5 px-4 py-3 text-[13.5px] leading-relaxed text-negative">
                  Máte {formatTokens(balance ?? 0)}, tato úroveň stojí {formatTokens(cost)}. <Link href="/cenik" className="cargent-link font-semibold">Dobít kredit</Link>
                </p>
              ) : null}

              <button
                type="submit"
                disabled={insufficient}
                className="w-full rounded-md bg-brass px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-faint"
              >
                {!isAuthenticated && !isAdmin ? 'Přihlásit se a ocenit' : `Odhadnout cenu · ${isAdmin ? 'admin' : cost === 0 ? 'zdarma' : formatTokens(cost)}`}
              </button>
              {isAuthenticated && balance != null && !isAdmin ? (
                <p className="mt-2 text-center text-[12px] text-faint">Zůstatek {formatTokens(balance)}</p>
              ) : null}

              {status === 'error' && errorMsg ? (
                <p role="alert" className="mt-4 rounded-md border border-negative/20 bg-negative/5 px-4 py-3 text-[13.5px] leading-relaxed text-negative">
                  {errorMsg}
                </p>
              ) : null}
            </>
          )}
        </div>
      </aside>
    </form>
  );
}

// ── Pomocné komponenty ────────────────────────────────────────────────────

function inputClass(error?: string) {
  return [
    'w-full rounded-md border bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:ring-2 focus:ring-brass/20',
    error ? 'border-negative' : 'border-line-2',
  ].join(' ');
}

function Field({ label, htmlFor, error, required, suffix, children }: {
  label: string; htmlFor: string; error?: string; required?: boolean; suffix?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-soft">
        {label}{required ? <span className="text-brass"> *</span> : null}
      </label>
      {suffix ? (
        <div className="relative">
          {children}
          <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-[13px] text-faint">{suffix}</span>
        </div>
      ) : children}
      {error ? <span className="text-[12.5px] text-negative">{error}</span> : null}
    </div>
  );
}

function SelectField({ label, id, value, onChange, options }: {
  label: string; id: string; value: string; onChange: (v: string) => void; options: readonly string[];
}) {
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass()}>
        <option value="">Vyberte</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

function Progress({ tier, elapsed, scope }: { tier: EstimatorTierKey; elapsed: number; scope: Scope }) {
  const def = ESTIMATOR_TIERS.find((t) => t.key === tier)!;
  const est = def.durationSec;
  const ratio = Math.min(elapsed / est, 1);
  const portals = scope === 'international' ? 'české i zahraniční portály' : 'české inzertní portály';
  const stages = [
    { at: 0, text: 'Sestavuji dotaz…' },
    { at: 0.08, text: `Prohledávám ${portals}…` },
    { at: 0.45, text: 'Porovnávám nalezené ceny, vyřazuji odlehlé…' },
    { at: 0.7, text: 'Zohledňuji nájezd, stáří a výbavu…' },
    { at: 0.88, text: 'Sestavuji výsledek…' },
  ];
  const stage = stages.reduce((acc, s) => (ratio >= s.at ? s : acc), stages[0]);

  return (
    <div role="status" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brass/30 border-t-brass" aria-hidden="true" />
          {def.label} ocenění probíhá
        </span>
        <span className="cargent-mono text-[13px] text-dim">{elapsed} s</span>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-paper-2">
        <div className="h-full rounded-full bg-brass transition-[width] duration-500" style={{ width: `${Math.min(95, ratio * 95)}%` }} />
      </div>
      <p className="mt-3 text-[13.5px] text-ink-soft">{stage.text}</p>
      <p className="mt-1.5 text-[12px] text-faint">
        Obvykle do {est >= 60 ? `${Math.round(est / 60)} min` : `${est} s`}. Nechte prosím stránku otevřenou.
      </p>
    </div>
  );
}
