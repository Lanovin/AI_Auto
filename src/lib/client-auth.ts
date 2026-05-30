'use client';

import type { User } from '@supabase/supabase-js';
import { useEffect, useMemo, useState } from 'react';
import { APP_SESSION_EVENT, getAppSession } from '@/lib/app-session';
import { createClient } from '@/lib/supabase/client';
import { hasSupabaseEnv } from '@/lib/supabase/config';

export type ClientRole = 'guest' | 'person' | 'dealer';

type SupabaseIdentity = {
  role: ClientRole;
  email: string | null;
  fullName: string | null;
  companyName: string | null;
};

type ClientAuthState = {
  ready: boolean;
  role: ClientRole;
  isSupabaseAuthenticated: boolean;
  email: string | null;
  fullName: string | null;
  companyName: string | null;
};

const DEFAULT_IDENTITY: SupabaseIdentity = {
  role: 'guest',
  email: null,
  fullName: null,
  companyName: null,
};

function getLegacyRole(): ClientRole {
  const role = getAppSession().role;
  return role === 'dealer' || role === 'person' ? role : 'guest';
}

function resolveSupabaseIdentity(user: User | null | undefined): SupabaseIdentity {
  if (!user) {
    return DEFAULT_IDENTITY;
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  return {
    role: metadata.account_type === 'dealer' ? 'dealer' : 'person',
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

export function useClientAuthState(): ClientAuthState {
  const [legacyRole, setLegacyRole] = useState<ClientRole>(() => getLegacyRole());
  const [supabaseIdentity, setSupabaseIdentity] = useState<SupabaseIdentity>(DEFAULT_IDENTITY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    function syncLegacyRole() {
      if (!active) {
        return;
      }

      const nextRole = getLegacyRole();
      setLegacyRole(nextRole);
      if (nextRole !== 'guest') {
        setReady(true);
      }
    }

    syncLegacyRole();
    window.addEventListener(APP_SESSION_EVENT, syncLegacyRole);
    window.addEventListener('storage', syncLegacyRole);

    if (!hasSupabaseEnv()) {
      setReady(true);
      return () => {
        active = false;
        window.removeEventListener(APP_SESSION_EVENT, syncLegacyRole);
        window.removeEventListener('storage', syncLegacyRole);
      };
    }

    const supabase = createClient();

    async function syncSupabaseUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!active) {
          return;
        }

        setSupabaseIdentity(resolveSupabaseIdentity(user));
      } catch {
        if (!active) {
          return;
        }

        setSupabaseIdentity(DEFAULT_IDENTITY);
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    void syncSupabaseUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) {
        return;
      }

      setSupabaseIdentity(resolveSupabaseIdentity(session?.user));
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      window.removeEventListener(APP_SESSION_EVENT, syncLegacyRole);
      window.removeEventListener('storage', syncLegacyRole);
    };
  }, []);

  const role = useMemo<ClientRole>(() => {
    if (legacyRole !== 'guest') {
      return legacyRole;
    }

    return supabaseIdentity.role;
  }, [legacyRole, supabaseIdentity.role]);

  return {
    ready,
    role,
    isSupabaseAuthenticated: supabaseIdentity.role !== 'guest',
    email: supabaseIdentity.email,
    fullName: supabaseIdentity.fullName,
    companyName: supabaseIdentity.companyName,
  };
}