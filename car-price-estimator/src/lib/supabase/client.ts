import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from './config';

export function createClient() {
  const { url, publishableKey } = requireSupabaseEnv();

  return createBrowserClient(
    url,
    publishableKey
  );
}
