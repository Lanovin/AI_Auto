'use client';

import Link from 'next/link';
import Navbar from '../../../components/Navbar';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AccountType = 'person' | 'dealer';

const ACCOUNT_CONFIG = {
  person: {
    label: 'Jsem člověk',
    badge: 'Osobní účet',
    tooltip: 'Soukromý účet pro jednotlivce. Získáte historii ocenění, skauta nabídek a startovací kredit v tokenech.',
    detailLabel: 'Jméno a příjmení',
    detailPlaceholder: 'Např. Jan Novák',
    autoComplete: 'name',
    cta: 'Vytvořit osobní účet',
    confirmationTitle: 'Potvrďte e-mail',
    confirmationLead: 'Jakmile e-mail potvrdíte, přihlásíte se do osobního účtu a uvidíte svůj dashboard.',
    nextSteps: [
      'Otevřete potvrzovací e-mail a klikněte na odkaz.',
      'Po potvrzení se přihlaste do AutoAI.',
      'V dashboardu uvidíte historii ocenění a startovací kredit.',
    ],
  },
  dealer: {
    label: 'Jsem bazar',
    badge: 'Firemní účet',
    tooltip: 'Firemní účet pro autobazary. Obsahuje monitoring trhu, generátor popisků a B2B workflow pod jedním přihlášením.',
    detailLabel: 'Název autobazaru',
    detailPlaceholder: 'Např. Auto Novák',
    autoComplete: 'organization',
    cta: 'Vytvořit firemní účet',
    confirmationTitle: 'Potvrďte firemní e-mail',
    confirmationLead: 'Po potvrzení dokončíte firemní profil a odemknete B2B nástroje.',
    nextSteps: [
      'Otevřete potvrzovací e-mail a aktivujte účet.',
      'Po přihlášení dokončíte firemní profil a kontaktní údaje.',
      'Monitoring, popisky i firemní workflow poběží v jedné větvi účtu.',
    ],
  },
} as const;

export default function SignupPage() {
  return (
    <>
      <Navbar brandName="AutoAI" />
      <Suspense fallback={<div className="min-h-screen bg-white" />}>
        <SignupForm />
      </Suspense>
    </>
  );
}

function InfoButton({ type }: { type: AccountType }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={`Co je ${ACCOUNT_CONFIG[type].label}?`}
        className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-white text-[10px] font-bold text-brand-400 transition-colors hover:border-brand-400 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        i
      </button>
      {open && (
        <div
          className="absolute right-0 top-6 z-30 w-56 rounded-2xl border border-brand-100 bg-white p-3 text-[13px] leading-relaxed text-neutral-600 shadow-[0_8px_32px_rgba(24,95,165,0.14)]"
          role="tooltip"
        >
          {ACCOUNT_CONFIG[type].tooltip}
        </div>
      )}
    </div>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const preferredType: AccountType = searchParams.get('type') === 'dealer' ? 'dealer' : 'person';
  const destination =
    requestedNext &&
    requestedNext !== '/' &&
    requestedNext !== '/prihlaseni' &&
    requestedNext !== '/registrace'
      ? requestedNext
      : '/dashboard';

  const [accountType, setAccountType] = useState<AccountType>(preferredType);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setAccountType(preferredType);
  }, [preferredType]);

  const config = ACCOUNT_CONFIG[accountType];
  const detailValue = accountType === 'dealer' ? companyName : fullName;

  const loginHref =
    destination !== '/dashboard'
      ? `/prihlaseni?next=${encodeURIComponent(destination)}`
      : '/prihlaseni';

  useEffect(() => {
    let active = true;
    async function redirectIfAuthenticated() {
      const response = await fetch('/api/auth/status', { cache: 'no-store' });
      if (!active || !response.ok) return;
      const { authenticated } = (await response.json()) as { authenticated: boolean };
      if (authenticated && active) window.location.replace(destination);
    }
    void redirectIfAuthenticated();
    return () => { active = false; };
  }, [destination]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const metadata =
      accountType === 'dealer'
        ? { account_type: 'dealer', company_name: companyName.trim() }
        : { account_type: 'person', full_name: fullName.trim() };

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });

    if (error) {
      setError(mapAuthError(error.message));
      setLoading(false);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[linear-gradient(180deg,#F4F8FD_0%,#FFFFFF_50%)] px-4 py-10" id="main">
        <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white p-8 text-center shadow-[0_24px_60px_rgba(24,95,165,0.10)]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <svg aria-hidden="true" className="h-7 w-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-[26px] font-medium tracking-tight text-brand-900">
            {config.confirmationTitle}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">
            Poslali jsme odkaz na{' '}
            <strong className="font-medium text-brand-900">{email}</strong>.
            <br />
            {config.confirmationLead}
          </p>
          <div className="mt-6 grid gap-2 text-left sm:grid-cols-3">
            {config.nextSteps.map((step, i) => (
              <article className="rounded-xl border border-brand-100 bg-brand-50/40 p-3" key={step}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-medium text-brand-700 shadow-sm">
                  {i + 1}
                </span>
                <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">{step}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-neutral-400">
            E-mail nedorazil? Zkontrolujte spam nebo složku Hromadné.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              className="rounded-full bg-brand-600 px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              href={loginHref}
            >
              Mám potvrzeno — přihlásit se
            </Link>
            <Link
              className="rounded-full border border-brand-100 px-5 py-2.5 text-[14px] font-medium text-neutral-600 transition-colors hover:border-brand-200 hover:text-brand-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              href="/"
            >
              Zpět na hlavní stránku
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[linear-gradient(180deg,#F4F8FD_0%,#FFFFFF_50%)] px-4 py-10" id="main">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-[28px] font-medium tracking-tight text-brand-900">Registrace</h1>
          <p className="mt-2 text-[14px] text-neutral-500">
            Máte účet?{' '}
            <Link className="font-medium text-brand-600 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href={loginHref}>
              Přihlaste se
            </Link>
          </p>
        </div>

        <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-[0_24px_60px_rgba(24,95,165,0.10)] md:p-8">
          {/* Account type toggle */}
          <fieldset className="mb-5">
            <legend className="sr-only">Typ účtu</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['person', 'dealer'] as const).map((type) => {
                const isSelected = accountType === type;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`relative flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left text-[14px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${
                      isSelected
                        ? 'border-brand-300 bg-brand-50 text-brand-900 shadow-[0_4px_16px_rgba(24,95,165,0.10)]'
                        : 'border-brand-100 bg-white text-neutral-600 hover:border-brand-200 hover:bg-brand-50/40'
                    }`}
                    key={type}
                    onClick={() => setAccountType(type)}
                    type="button"
                  >
                    <span>{ACCOUNT_CONFIG[type].label}</span>
                    <InfoButton type={type} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          <form
            aria-busy={loading}
            aria-describedby={error ? 'signup-error' : undefined}
            className="flex flex-col gap-4"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-brand-900" htmlFor="identity">
                {config.detailLabel}
              </label>
              <input
                autoComplete={config.autoComplete}
                autoFocus
                className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                id="identity"
                onChange={(e) => {
                  if (accountType === 'dealer') {
                    setCompanyName(e.target.value);
                  } else {
                    setFullName(e.target.value);
                  }
                }}
                placeholder={config.detailPlaceholder}
                required
                type="text"
                value={detailValue}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-brand-900" htmlFor="email">
                E-mail
              </label>
              <input
                autoComplete="email"
                className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                id="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                required
                type="email"
                value={email}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-brand-900" htmlFor="password">
                Heslo
              </label>
              <input
                autoComplete="new-password"
                className="rounded-xl border border-brand-100 bg-white px-4 py-3 text-[15px] text-brand-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                id="password"
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimálně 6 znaků"
                required
                type="password"
                value={password}
              />
            </div>

            {error && (
              <p
                className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[13px] leading-normal text-red-700"
                id="signup-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              className="mt-1 rounded-full bg-brand-600 px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? 'Registruji…' : config.cta}
            </button>

            {loading && (
              <span className="sr-only" role="status">
                Odesílám registraci, prosím čekejte.
              </span>
            )}

            <p className="text-center text-[12px] leading-relaxed text-neutral-400">
              Registrací souhlasíte se zpracováním e-mailu pro autentizaci.
              Žádná data nesdílíme s třetími stranami.
            </p>
          </form>
        </div>

        <p className="mt-5 text-center text-[13px] text-neutral-400">
          <Link className="hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2" href="/">
            ← Zpět na hlavní stránku
          </Link>
        </p>
      </div>
    </main>
  );
}

function mapAuthError(message: string): string {
  if (message.includes('already registered') || message.includes('User already registered')) {
    return 'Tento e-mail je již registrován. Přihlaste se.';
  }
  if (message.includes('Password should be at least')) {
    return 'Heslo musí mít alespoň 6 znaků.';
  }
  if (message.includes('Unable to validate email')) {
    return 'Zadejte platnou e-mailovou adresu.';
  }
  if (message.includes('Too many requests')) {
    return 'Příliš mnoho pokusů. Zkuste to za chvíli.';
  }
  return 'Registrace se nezdařila. Zkuste to prosím znovu.';
}
