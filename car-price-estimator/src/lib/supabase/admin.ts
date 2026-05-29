// Server-only admin client used for unauthenticated server-to-server operations
// (Stripe webhook, scheduled jobs). Bypasses RLS — use sparingly and ONLY from
// trusted server contexts. Never import from Client Components or expose to browser.

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './config';

let _admin: SupabaseClient | null = null;

/**
 * Returns a Supabase client authenticated with the service-role key.
 * Returns null if SUPABASE_SERVICE_ROLE_KEY (or env URL) is missing — the caller
 * is expected to handle this gracefully (eg. log + return non-blocking error).
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (_admin) return _admin;

  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  _admin = createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return _admin;
}
