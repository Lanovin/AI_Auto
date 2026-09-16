'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/config';

export type ClientRole = 'guest' | 'person' | 'dealer';

type ClientAuthState = {
  ready: boolean;
  role: ClientRole;
  isAuthenticated: boolean;
  isAdmin: boolean;
  email: string | null;
  fullName: string | null;
  companyName: string | null;
};

const DEFAULT_STATE: Omit<ClientAuthState, 'ready' | 'isAdmin'> = {
  role: 'guest',
  isAuthenticated: false,
  email: null,
  fullName: null,
  companyName: null,
};

function resolveIdentity(user: User | null | undefined): Omit<ClientAuthState, 'ready' | 'isAdmin'> {
  if (!user) return DEFAULT_STATE;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    role: metadata.account_type === 'dealer' ? 'dealer' : 'person',
    isAuthenticated: true,
    email: user.email ?? null,
    fullName:
      typeof metadata.full_name === 'string'
        ? metadata.full_name
        : typeof metadata.name === 'string'
          ? metadata.name
          : null,
    companyName: typeof metadata.company_name === 'string' ? metadata.company_name : null,
  };
}

/**
 * Stav přihlášení na klientovi. Jediný zdroj pravdy je Supabase session
 * (+ admin cookie ověřená serverem). Žádný lokální „demo“ režim.
 */
export function useClientAuthState(): ClientAuthState {
  const [identity, setIdentity] = useState(DEFAULT_STATE);
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    // Admin (cargent_admin) je httpOnly cookie, kterou klient nepřečte —
    // stav zjistíme ze serveru, ať admin v aplikaci nevypadá jako odhlášený.
    async function syncAdminStatus() {
      try {
        const res = await fetch('/api/auth/status', { cache: 'no-store' });
        if (!active || !res.ok) return;
        const json = (await res.json()) as { admin?: boolean };
        setIsAdmin(Boolean(json.admin));
      } catch {
        if (active) setIsAdmin(false);
      }
    }
    void syncAdminStatus();

    if (!hasSupabaseEnv()) {
      setReady(true);
      return () => { active = false; };
    }

    const supabase = createClient();

    async function syncUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) return;
        setIdentity(resolveIdentity(user));
      } catch {
        if (active) setIdentity(DEFAULT_STATE);
      } finally {
        if (active) setReady(true);
      }
    }
    void syncUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setIdentity(resolveIdentity(session?.user));
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return { ready, isAdmin, ...identity };
}
