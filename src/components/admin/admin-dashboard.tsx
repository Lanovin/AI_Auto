'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type ContentField = {
  key: string;
  group: string;
  label: string;
  multiline: boolean;
  default: string;
  value: string;
  customized: boolean;
};

type PromoCode = {
  id: string;
  code: string;
  tokens: number;
  max_uses: number;
  uses: number;
  active: boolean;
  note: string | null;
  created_at: string;
};

type PricingFeature = {
  feature: string;
  label: string;
  default: number;
  cost: number;
  customized: boolean;
};

type Tab = 'content' | 'pricing' | 'promo' | 'tokens';

export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('content');

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-[960px] px-[22px] py-10 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="cargent-h2 text-[30px]">Administrace</h1>
          <p className="mt-1 text-[14px] text-ink-soft">
            Úprava textů na úvodní stránce, ceník služeb a správa promo kódů.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-[10px] border border-line-2 bg-surface px-4 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Odhlásit se
        </button>
      </header>

      <nav className="mt-8 flex gap-1 border-b border-line" aria-label="Sekce administrace">
        <TabButton active={tab === 'content'} onClick={() => setTab('content')}>
          Texty webu
        </TabButton>
        <TabButton active={tab === 'pricing'} onClick={() => setTab('pricing')}>
          Ceník služeb
        </TabButton>
        <TabButton active={tab === 'promo'} onClick={() => setTab('promo')}>
          Promo kódy
        </TabButton>
        <TabButton active={tab === 'tokens'} onClick={() => setTab('tokens')}>
          Tokeny
        </TabButton>
      </nav>

      <div className="mt-8">
        {tab === 'content' ? (
          <ContentEditor />
        ) : tab === 'pricing' ? (
          <PricingEditor />
        ) : tab === 'promo' ? (
          <PromoManager />
        ) : (
          <TokenGranter />
        )}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        '-mb-px border-b-2 px-4 py-2.5 text-[15px] font-medium transition-colors',
        active
          ? 'border-brass text-ink'
          : 'border-transparent text-ink-soft hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

// ── Texty webu ─────────────────────────────────────────────────────────────
function ContentEditor() {
  const [groups, setGroups] = useState<string[]>([]);
  const [fields, setFields] = useState<ContentField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/content', { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setStatus({ kind: 'err', msg: json.error ?? 'Načtení selhalo.' });
          return;
        }
        setGroups(json.groups ?? []);
        setFields(json.fields ?? []);
        const initial: Record<string, string> = {};
        for (const f of json.fields as ContentField[]) initial[f.key] = f.value;
        setValues(initial);
      } catch {
        if (active) setStatus({ kind: 'err', msg: 'Načtení selhalo.' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: values }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ kind: 'err', msg: json.error ?? 'Uložení selhalo.' });
        return;
      }
      setStatus({ kind: 'ok', msg: 'Změny uloženy. Projeví se na webu okamžitě.' });
    } catch {
      setStatus({ kind: 'err', msg: 'Uložení selhalo.' });
    } finally {
      setSaving(false);
    }
  }

  function resetField(field: ContentField) {
    setValues((v) => ({ ...v, [field.key]: field.default }));
  }

  if (loading) {
    return <p className="text-[14px] text-ink-soft">Načítám texty…</p>;
  }

  return (
    <div>
      <div className="rounded-[12px] border border-line bg-paper-2 px-4 py-3 text-[13px] text-ink-soft">
        Tip: nový řádek (Enter) zalomí text. Slovo obklopené podtržítky{' '}
        <code className="cargent-mono">_takto_</code> se zobrazí kurzívou (zlatý akcent v nadpisech).
      </div>

      {groups.map((group) => (
        <section key={group} className="mt-8">
          <h2 className="cargent-h3 text-[18px] text-ink">{group}</h2>
          <div className="mt-4 grid gap-4">
            {fields
              .filter((f) => f.group === group)
              .map((field) => (
                <div key={field.key} className="rounded-[12px] border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor={field.key}
                      className="text-[13px] font-medium text-ink"
                    >
                      {field.label}
                    </label>
                    {values[field.key] !== field.default && (
                      <button
                        type="button"
                        onClick={() => resetField(field)}
                        className="text-[12px] text-ink-soft underline-offset-2 hover:text-brass hover:underline"
                      >
                        Vrátit výchozí
                      </button>
                    )}
                  </div>
                  {field.multiline ? (
                    <textarea
                      id={field.key}
                      value={values[field.key] ?? ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      rows={3}
                      className="mt-2 w-full resize-y rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-brass"
                    />
                  ) : (
                    <input
                      id={field.key}
                      type="text"
                      value={values[field.key] ?? ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [field.key]: e.target.value }))
                      }
                      className="mt-2 w-full rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-brass"
                    />
                  )}
                </div>
              ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-0 mt-8 flex items-center justify-end gap-4 border-t border-line bg-paper/90 py-4 backdrop-blur">
        {status && (
          <span
            className={[
              'text-[13px]',
              status.kind === 'ok' ? 'text-emerald' : 'text-[#9C3A2A]',
            ].join(' ')}
          >
            {status.msg}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[10px] bg-ink px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-60"
          style={{ color: '#FFFFFF' }}
        >
          {saving ? 'Ukládám…' : 'Uložit změny'}
        </button>
      </div>
    </div>
  );
}

// ── Ceník služeb ───────────────────────────────────────────────────────────
function PricingEditor() {
  const [features, setFeatures] = useState<PricingFeature[]>([]);
  const [tokenValueCzk, setTokenValueCzk] = useState(5);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/pricing', { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          setStatus({ kind: 'err', msg: json.error ?? 'Načtení selhalo.' });
          return;
        }
        setFeatures(json.features ?? []);
        setTokenValueCzk(json.tokenValueCzk ?? 5);
        const initial: Record<string, string> = {};
        for (const f of json.features as PricingFeature[]) initial[f.feature] = String(f.cost);
        setValues(initial);
      } catch {
        if (active) setStatus({ kind: 'err', msg: 'Načtení selhalo.' });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    // Validace na klientovi — celá nezáporná čísla.
    for (const f of features) {
      const n = Number(values[f.feature]);
      if (!Number.isInteger(n) || n < 0) {
        setStatus({ kind: 'err', msg: `Neplatná cena u „${f.label}" — zadejte celé číslo ≥ 0.` });
        return;
      }
    }

    setSaving(true);
    setStatus(null);
    try {
      const entries: Record<string, number> = {};
      for (const f of features) entries[f.feature] = Number(values[f.feature]);

      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ kind: 'err', msg: json.error ?? 'Uložení selhalo.' });
        return;
      }
      setStatus({ kind: 'ok', msg: 'Ceník uložen. Nové ceny platí okamžitě.' });
    } catch {
      setStatus({ kind: 'err', msg: 'Uložení selhalo.' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-[14px] text-ink-soft">Načítám ceník…</p>;
  }

  return (
    <div>
      <div className="rounded-[12px] border border-line bg-paper-2 px-4 py-3 text-[13px] text-ink-soft">
        Ceny jsou v tokenech — 1 token ≈ {tokenValueCzk} Kč. Cena 0 = akce je zdarma.
        Změny platí okamžitě pro všechny uživatele.
      </div>

      <div className="mt-6 overflow-x-auto rounded-[12px] border border-line">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-line bg-paper-2 text-[11px] uppercase tracking-[0.08em] text-faint">
              <th className="px-4 py-2.5 text-left font-medium">Služba</th>
              <th className="px-4 py-2.5 text-right font-medium">Cena (tokenů)</th>
              <th className="px-4 py-2.5 text-right font-medium">Přepočet</th>
              <th className="px-4 py-2.5 text-right font-medium">Výchozí</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => {
              const current = Number(values[f.feature]);
              const valid = Number.isInteger(current) && current >= 0;
              const changed = valid && current !== f.default;
              return (
                <tr key={f.feature} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{f.label}</span>
                    <span className="cargent-mono block text-[11px] text-faint">{f.feature}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={values[f.feature] ?? ''}
                      onChange={(e) =>
                        setValues((v) => ({ ...v, [f.feature]: e.target.value }))
                      }
                      aria-label={`Cena — ${f.label}`}
                      className={[
                        'cargent-mono w-24 rounded-[8px] border bg-paper px-3 py-2 text-right text-[14px] tabular-nums text-ink outline-none focus:border-brass',
                        valid ? 'border-line-2' : 'border-[#9C3A2A]',
                      ].join(' ')}
                    />
                  </td>
                  <td className="cargent-mono px-4 py-3 text-right tabular-nums text-ink-soft">
                    {valid ? `≈ ${(current * tokenValueCzk).toLocaleString('cs-CZ')} Kč` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {changed ? (
                      <button
                        type="button"
                        onClick={() =>
                          setValues((v) => ({ ...v, [f.feature]: String(f.default) }))
                        }
                        className="text-[12px] text-ink-soft underline-offset-2 hover:text-brass hover:underline"
                      >
                        Vrátit {f.default}
                      </button>
                    ) : (
                      <span className="cargent-mono text-[12px] tabular-nums text-faint">
                        {f.default}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 mt-8 flex items-center justify-end gap-4 border-t border-line bg-paper/90 py-4 backdrop-blur">
        {status && (
          <span
            className={[
              'text-[13px]',
              status.kind === 'ok' ? 'text-emerald' : 'text-[#9C3A2A]',
            ].join(' ')}
          >
            {status.msg}
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[10px] bg-ink px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-60"
          style={{ color: '#FFFFFF' }}
        >
          {saving ? 'Ukládám…' : 'Uložit ceník'}
        </button>
      </div>
    </div>
  );
}

// ── Ruční přičítání tokenů ─────────────────────────────────────────────────
function TokenGranter() {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), amount: Number(amount) }),
      });
      const json = await res.json() as { ok?: boolean; newBalance?: number; error?: string };
      if (!res.ok) {
        setStatus({ kind: 'err', msg: json.error ?? 'Přičtení selhalo.' });
        return;
      }
      setStatus({
        kind: 'ok',
        msg: `✓ Přičteno ${amount} tokenů na účet ${email}. Nový zůstatek: ${json.newBalance ?? '?'} tokenů.`,
      });
      setAmount('');
    } catch {
      setStatus({ kind: 'err', msg: 'Síťová chyba.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-120">
      <div className="rounded-xl border border-line bg-paper-2 px-4 py-3 text-[13px] text-ink-soft mb-6">
        Přičti libovolný počet tokenů na jakýkoliv účet podle e-mailu. Funguje okamžitě bez Stripe.
      </div>
      <form onSubmit={handleSubmit} className="rounded-[14px] border border-line bg-surface p-5 flex flex-col gap-4">
        <label className="block text-[13px] font-medium text-ink-soft">
          E-mail uživatele
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vas@email.cz"
            required
            className="mt-1.5 w-full rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-brass"
          />
        </label>
        <label className="block text-[13px] font-medium text-ink-soft">
          Počet tokenů
          <input
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100"
            required
            className="mt-1.5 w-full rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-brass"
          />
        </label>
        {status && (
          <p className={`text-[13px] ${status.kind === 'ok' ? 'text-emerald' : 'text-[#9C3A2A]'}`}>
            {status.msg}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="rounded-[10px] bg-ink px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-60"
          style={{ color: '#FFFFFF' }}
        >
          {loading ? 'Přičítám…' : 'Přičíst tokeny'}
        </button>
      </form>
    </div>
  );
}

// ── Promo kódy ─────────────────────────────────────────────────────────────
function PromoManager() {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [tokens, setTokens] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
    void loadCodes();
  }, []);

  async function loadCodes() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/promo', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setCodes(json.codes ?? []);
      else setStatus({ kind: 'err', msg: json.error ?? 'Načtení selhalo.' });
    } catch {
      setStatus({ kind: 'err', msg: 'Načtení selhalo.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setCreating(true);
    try {
      const res = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          tokens: Number(tokens),
          max_uses: Number(maxUses),
          note,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatus({ kind: 'err', msg: json.error ?? 'Vytvoření selhalo.' });
        return;
      }
      setCodes((prev) => [json.code, ...prev]);
      setCode('');
      setTokens('');
      setMaxUses('');
      setNote('');
      setStatus({ kind: 'ok', msg: 'Kód vytvořen.' });
    } catch {
      setStatus({ kind: 'err', msg: 'Vytvoření selhalo.' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(c: PromoCode) {
    const res = await fetch(`/api/admin/promo/${c.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    });
    const json = await res.json();
    if (res.ok) setCodes((prev) => prev.map((x) => (x.id === c.id ? json.code : x)));
  }

  async function deleteCode(c: PromoCode) {
    if (!window.confirm(`Smazat kód „${c.code}"? Tuto akci nelze vrátit.`)) return;
    const res = await fetch(`/api/admin/promo/${c.id}`, { method: 'DELETE' });
    if (res.ok) setCodes((prev) => prev.filter((x) => x.id !== c.id));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[340px_1fr]">
      {/* ── Tvorba kódu ──────────────────────────────────────────────── */}
      <form
        onSubmit={handleCreate}
        className="h-fit rounded-[14px] border border-line bg-surface p-5"
      >
        <h2 className="cargent-h3 text-[18px]">Nový promo kód</h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Uživatel kód zadá v profilu a připíší se mu tokeny zdarma.
        </p>

        <label className="mt-4 block text-[13px] font-medium text-ink-soft">
          Text kódu
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="napr. LETO2026"
            required
            className="mt-1.5 w-full rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-brass"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block text-[13px] font-medium text-ink-soft">
            Tokenů
            <input
              type="number"
              min={1}
              value={tokens}
              onChange={(e) => setTokens(e.target.value)}
              placeholder="50"
              required
              className="mt-1.5 w-full rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-brass"
            />
          </label>
          <label className="block text-[13px] font-medium text-ink-soft">
            Počet použití
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="100"
              required
              className="mt-1.5 w-full rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-brass"
            />
          </label>
        </div>

        <label className="mt-4 block text-[13px] font-medium text-ink-soft">
          Poznámka (volitelné)
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Letní kampaň"
            className="mt-1.5 w-full rounded-[8px] border border-line-2 bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-brass"
          />
        </label>

        {status && (
          <p
            className={[
              'mt-4 text-[13px]',
              status.kind === 'ok' ? 'text-emerald' : 'text-[#9C3A2A]',
            ].join(' ')}
          >
            {status.msg}
          </p>
        )}

        <button
          type="submit"
          disabled={creating}
          className="mt-5 w-full rounded-[10px] bg-ink px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-ink-soft disabled:opacity-60"
          style={{ color: '#FFFFFF' }}
        >
          {creating ? 'Vytvářím…' : 'Vytvořit kód'}
        </button>
      </form>

      {/* ── Seznam kódů ──────────────────────────────────────────────── */}
      <div>
        <h2 className="cargent-h3 text-[18px]">Existující kódy</h2>
        {loading ? (
          <p className="mt-4 text-[14px] text-ink-soft">Načítám…</p>
        ) : codes.length === 0 ? (
          <p className="mt-4 text-[14px] text-ink-soft">Zatím žádné promo kódy.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[12px] border border-line">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-paper-2 text-[11px] uppercase tracking-[0.08em] text-faint">
                  <th className="px-3 py-2.5 text-left font-medium">Kód</th>
                  <th className="px-3 py-2.5 text-right font-medium">Tokenů</th>
                  <th className="px-3 py-2.5 text-right font-medium">Využití</th>
                  <th className="px-3 py-2.5 text-center font-medium">Stav</th>
                  <th className="px-3 py-2.5 text-right font-medium">Akce</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const exhausted = c.uses >= c.max_uses;
                  return (
                    <tr key={c.id} className="border-b border-line last:border-b-0">
                      <td className="px-3 py-3">
                        <span className="cargent-mono font-medium text-ink">{c.code}</span>
                        {c.note && (
                          <span className="block text-[11px] text-faint">{c.note}</span>
                        )}
                      </td>
                      <td className="cargent-mono px-3 py-3 text-right tabular-nums text-ink">
                        {c.tokens}
                      </td>
                      <td className="cargent-mono px-3 py-3 text-right tabular-nums text-ink-soft">
                        {c.uses} / {c.max_uses}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={[
                            'inline-block rounded-full px-2 py-0.5 text-[11px] font-medium',
                            exhausted
                              ? 'bg-[#9C3A2A]/10 text-[#9C3A2A]'
                              : c.active
                                ? 'bg-emerald/10 text-emerald'
                                : 'bg-faint/10 text-faint',
                          ].join(' ')}
                        >
                          {exhausted ? 'Vyčerpán' : c.active ? 'Aktivní' : 'Vypnutý'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <button
                          onClick={() => toggleActive(c)}
                          className="text-[12px] text-ink-soft hover:text-brass"
                        >
                          {c.active ? 'Vypnout' : 'Zapnout'}
                        </button>
                        <span className="mx-2 text-line-2">·</span>
                        <button
                          onClick={() => deleteCode(c)}
                          className="text-[12px] text-ink-soft hover:text-[#9C3A2A]"
                        >
                          Smazat
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
