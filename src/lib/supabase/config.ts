export interface SupabaseEnv {
  url: string;
  publishableKey: string;
}

export function getSupabaseEnv(): Partial<SupabaseEnv> {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function hasSupabaseEnv(): boolean {
  const { url, publishableKey } = getSupabaseEnv();
  return Boolean(url && publishableKey);
}

export function requireSupabaseEnv(): SupabaseEnv {
  const { url, publishableKey } = getSupabaseEnv();

  if (!url || !publishableKey) {
    throw new Error(
      'Supabase environment variables are missing. ' +
        'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ' +
        '(or NEXT_PUBLIC_SUPABASE_ANON_KEY).'
    );
  }

  return { url, publishableKey };
}