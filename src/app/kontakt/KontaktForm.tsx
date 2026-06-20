'use client';

import { useState } from 'react';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function KontaktForm() {
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [form, setForm] = useState({
    jmeno: '',
    email: '',
    typ: 'soukromy',
    zprava: '',
  });

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/kontakt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jmeno: form.jmeno,
          email: form.email,
          zprava: form.zprava,
          typ: form.typ === 'autobazar' ? 'Autobazar' : 'Soukromá osoba',
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? 'Neznámá chyba.');
      }
      setStatus('success');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Neznámá chyba.');
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-lg border border-emerald/20 bg-emerald/5 p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald/10 text-2xl text-emerald">
          ✓
        </div>
        <h2 className="cargent-h3 mt-4 text-[20px]">Zpráva odeslána</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
          Děkujeme za zprávu. Ozveme se vám do 24 hodin v pracovní dny.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="jmeno" className="text-[13px] font-medium text-ink">
            Jméno <span className="text-negative">*</span>
          </label>
          <input
            id="jmeno"
            type="text"
            required
            autoComplete="name"
            value={form.jmeno}
            onChange={(e) => update('jmeno', e.target.value)}
            placeholder="Jan Novák"
            className="rounded-lg border border-line bg-white px-4 py-3 text-[14px] text-ink placeholder:text-ink/30 focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[13px] font-medium text-ink">
            E-mail <span className="text-negative">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="jan@priklad.cz"
            className="rounded-lg border border-line bg-white px-4 py-3 text-[14px] text-ink placeholder:text-ink/30 focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink">Jsem</span>
        <div className="flex gap-3">
          {[
            { value: 'soukromy', label: 'Soukromá osoba' },
            { value: 'autobazar', label: 'Autobazar / firma' },
          ].map(({ value, label }) => (
            <label
              key={value}
              className={[
                'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-[13px] font-medium transition-colors',
                form.typ === value
                  ? 'border-brass/30 bg-brass/10 text-brass'
                  : 'border-line bg-white text-ink/60 hover:border-ink/20',
              ].join(' ')}
            >
              <input
                type="radio"
                name="typ"
                value={value}
                checked={form.typ === value}
                onChange={(e) => update('typ', e.target.value)}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="zprava" className="text-[13px] font-medium text-ink">
          Zpráva <span className="text-negative">*</span>
        </label>
        <textarea
          id="zprava"
          required
          rows={6}
          value={form.zprava}
          onChange={(e) => update('zprava', e.target.value)}
          placeholder="Popište váš dotaz nebo záměr…"
          className="resize-none rounded-lg border border-line bg-white px-4 py-3 text-[14px] text-ink placeholder:text-ink/30 focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20"
        />
      </div>

      {status === 'error' ? (
        <p className="rounded-lg border border-negative/20 bg-negative/8 px-4 py-3 text-[13px] text-negative" role="alert">
          {errorMsg}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'loading'}
        className="rounded-md bg-brass px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'loading' ? 'Odesílám…' : 'Odeslat zprávu'}
      </button>
    </form>
  );
}
