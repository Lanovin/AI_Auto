'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/landing/Header';

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
      'Po potvrzení se přihlaste do Cargent.',
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
      <Header />
      <Suspense fallback={<div className="min-h-screen bg-paper" />}>
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
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-line-2 bg-paper-2 text-[10px] font-bold text-dim transition-colors hover:border-brass/40 hover:text-brass focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
      >
        i
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-7 z-30 w-60 rounded-lg border border-line bg-surface p-3 text-[13px] leading-relaxed text-ink-soft"
          style={{ boxShadow: 'var(--shadow-cargent-2)' }}
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
    requestedNext && requestedNext !== '/' && requestedNext !== '/prihlaseni' && requestedNext !== '/registrace'
      ? requestedNext
      : '/dashboard';

  const [accountType, setAccountType] = useState<AccountType>(preferredType);
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { setAccountType(preferredType); }, [preferredType]);

  const config = ACCOUNT_CONFIG[accountType];
  const detailValue = accountType === 'dealer' ? companyName : fullName;
  const loginHref = destination !== '/dashboard' ? `/prihlaseni?next=${encodeURIComponent(destination)}` : '/prihlaseni';

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

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
  }

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
    if (error) { setError(mapAuthError(error.message)); setLoading(false); return; }
    setSent(true);
  }

  /* ── Confirmation screen ──────────────────────────────────────── */
  if (sent) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-paper px-5 py-12" id="main">
        <div
          className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center"
          style={{ boxShadow: 'var(--shadow-cargent)' }}
        >
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-brass/30 bg-brass/10"
          >
            <svg aria-hidden="true" className="h-7 w-7 text-brass" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="cargent-h1 text-[26px]">
            {config.confirmationTitle}
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
            Poslali jsme odkaz na{' '}
            <strong className="font-medium text-ink">{email}</strong>.
            <br />
            {config.confirmationLead}
          </p>
          <div className="mt-6 grid gap-2 text-left sm:grid-cols-3">
            {config.nextSteps.map((step, i) => (
              <article
                key={step}
                className="rounded-[14px] border border-line bg-paper-2/60 p-3"
              >
                <span className="cargent-mono inline-flex h-6 w-6 items-center justify-center rounded-full border border-brass/30 bg-surface text-[11px] font-medium text-brass">
                  {i + 1}
                </span>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{step}</p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-[12px] text-faint">
            E-mail nedorazil? Zkontrolujte spam nebo složku Hromadné.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href={loginHref}
              className="rounded-md bg-brass px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              Mám potvrzeno — přihlásit se
            </Link>
            <Link
              href="/"
              className="rounded-md border border-line px-5 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-line-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2"
            >
              Zpět na hlavní stránku
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ── Registration form ────────────────────────────────────────── */
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-paper px-5 py-12" id="main">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <h1 className="cargent-h1 text-[30px]">
            Registrace
          </h1>
          <p className="mt-2 text-[14px] text-dim">
            Máte účet?{' '}
            <Link
              href={loginHref}
              className="font-medium text-brass transition-colors hover:text-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            >
              Přihlaste se
            </Link>
          </p>
        </div>

        <div
          className="rounded-2xl border border-line bg-surface p-6 md:p-8"
          style={{ boxShadow: 'var(--shadow-cargent)' }}
        >
          {/* Account type toggle */}
          <fieldset className="mb-5">
            <legend className="sr-only">Typ účtu</legend>
            <div className="grid grid-cols-2 gap-3">
              {(['person', 'dealer'] as const).map((type) => {
                const active = accountType === type;
                return (
                  <button
                    key={type}
                    aria-pressed={active}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={[
                      'relative flex items-center justify-between gap-2 rounded-lg border px-4 py-3 text-left text-[14px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2',
                      active
                        ? 'border-brass/40 bg-brass/8 text-ink'
                        : 'border-line bg-paper-2/40 text-ink-soft hover:border-line-2 hover:bg-paper-2',
                    ].join(' ')}
                  >
                    <span>{ACCOUNT_CONFIG[type].label}</span>
                    <InfoButton type={type} />
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Google OAuth */}
          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={() => void handleGoogleSignIn()}
            className="mb-4 flex w-full items-center justify-center gap-3 rounded-[10px] border border-line bg-paper-2/50 px-4 py-3 text-[15px] font-medium text-ink transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:opacity-50"
          >
            <GoogleIcon />
            {googleLoading ? 'Přesměrovávám…' : 'Pokračovat přes Google'}
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-line" />
            <span className="text-[12px] text-faint">nebo e-mailem</span>
            <div className="h-px flex-1 bg-line" />
          </div>

          <form
            aria-busy={loading}
            aria-describedby={error ? 'signup-error' : undefined}
            className="flex flex-col gap-4"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink-soft" htmlFor="identity">
                {config.detailLabel}
              </label>
              <input
                autoComplete={config.autoComplete}
                autoFocus
                id="identity"
                placeholder={config.detailPlaceholder}
                required
                type="text"
                value={detailValue}
                onChange={(e) => accountType === 'dealer' ? setCompanyName(e.target.value) : setFullName(e.target.value)}
                className="rounded-[10px] border border-line bg-paper-2/50 px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:bg-surface focus:ring-2 focus:ring-brass/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink-soft" htmlFor="email">
                E-mail
              </label>
              <input
                autoComplete="email"
                id="email"
                placeholder="vas@email.cz"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-[10px] border border-line bg-paper-2/50 px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:bg-surface focus:ring-2 focus:ring-brass/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-ink-soft" htmlFor="password">
                Heslo
              </label>
              <input
                autoComplete="new-password"
                id="password"
                minLength={6}
                placeholder="Minimálně 6 znaků"
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-[10px] border border-line bg-paper-2/50 px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brass focus:bg-surface focus:ring-2 focus:ring-brass/20"
              />
            </div>

            {error && (
              <p
                id="signup-error"
                role="alert"
                className="rounded-lg border border-negative/20 bg-negative/8 px-4 py-3 text-[13px] leading-normal text-negative"
              >
                {error}
              </p>
            )}

            <button
              disabled={loading}
              type="submit"
              className="mt-1 rounded-md bg-brass px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-brass-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Registruji…' : config.cta}
            </button>

            {loading && <span className="sr-only" role="status">Odesílám registraci, prosím čekejte.</span>}

            <p className="text-center text-[12px] leading-relaxed text-faint">
              Registrací souhlasíte se zpracováním e-mailu pro autentizaci.
              Žádná data nesdílíme s třetími stranami.
            </p>
          </form>
        </div>

        <p className="mt-5 text-center text-[13px] text-faint">
          <Link
            href="/"
            className="transition-colors hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            ← Zpět na hlavní stránku
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function mapAuthError(message: string): string {
  if (message.includes('already registered') || message.includes('User already registered')) return 'Tento e-mail je již registrován. Přihlaste se.';
  if (message.includes('Password should be at least')) return 'Heslo musí mít alespoň 6 znaků.';
  if (message.includes('Unable to validate email')) return 'Zadejte platnou e-mailovou adresu.';
  if (message.includes('Too many requests')) return 'Příliš mnoho pokusů. Zkuste to za chvíli.';
  return 'Registrace se nezdařila. Zkuste to prosím znovu.';
}
