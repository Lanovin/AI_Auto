// Server-only — imports next/headers via supabase/server. Never import from Client Components.
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { TOKEN_COSTS, type TokenFeature } from '@/lib/tokens';

/**
 * Returns the EFFECTIVE price list: defaults from TOKEN_COSTS overridden by
 * rows in the `token_pricing` table (managed in /admin → „Ceník služeb").
 * On any error (Supabase down / not configured) falls back to the defaults.
 */
export async function getTokenPricing(): Promise<Record<TokenFeature, number>> {
  const pricing: Record<TokenFeature, number> = { ...TOKEN_COSTS };
  if (!hasSupabaseEnv()) return pricing;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('token_pricing').select('feature, cost');
    if (error) {
      console.error('[tokens] getTokenPricing select error (using defaults):', error.message);
      return pricing;
    }
    for (const row of (data as { feature: string; cost: number }[] | null) ?? []) {
      if (row.feature in pricing && Number.isInteger(row.cost) && row.cost >= 0) {
        pricing[row.feature as TokenFeature] = row.cost;
      }
    }
    return pricing;
  } catch (err) {
    console.error('[tokens] getTokenPricing unexpected error (using defaults):', err);
    return pricing;
  }
}

/** Effective price of a single action (admin override, or default). */
export async function getTokenCost(feature: TokenFeature): Promise<number> {
  const pricing = await getTokenPricing();
  return pricing[feature];
}

/**
 * Přihlášený uživatel (Supabase session) nebo null. Nikdy nevyhazuje.
 */
export async function getSessionUser(): Promise<{ id: string; email: string | null; accountType: 'person' | 'dealer' } | null> {
  if (!hasSupabaseEnv()) return null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    return {
      id: user.id,
      email: user.email ?? null,
      accountType: meta.account_type === 'dealer' ? 'dealer' : 'person',
    };
  } catch (err) {
    console.error('[tokens] getSessionUser unexpected error:', err);
    return null;
  }
}

/**
 * Returns the current token balance for the authenticated user.
 * Returns null if the user is not authenticated, the profile row is missing,
 * or Supabase is unavailable / not configured.
 */
export async function getTokenBalance(): Promise<number | null> {
  if (!hasSupabaseEnv()) return null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('profiles')
      .select('tokens_balance')
      .eq('id', user.id)
      .maybeSingle();

    return (data as { tokens_balance: number } | null)?.tokens_balance ?? 0;
  } catch (err) {
    console.error('[tokens] getTokenBalance unexpected error (returning null):', err);
    return null;
  }
}

export type DeductResult =
  | { ok: true; remaining: number; cost: number }
  | { ok: false; code: 'unauthenticated' | 'insufficient' | 'error'; reason: string; cost?: number; balance?: number };

/**
 * Attempts to deduct the price of `feature` from the authenticated user's
 * balance. Uses the Postgres `deduct_tokens` function (security definer),
 * so a client cannot fake the amount. Never throws.
 */
export async function deductTokens(feature: TokenFeature): Promise<DeductResult> {
  if (!hasSupabaseEnv()) return { ok: false, code: 'unauthenticated', reason: 'Nejste přihlášeni.' };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, code: 'unauthenticated', reason: 'Nejste přihlášeni.' };

    const cost = await getTokenCost(feature);
    // Free actions (cost 0 set by admin) skip the RPC entirely.
    if (cost === 0) {
      const balance = await getTokenBalance();
      return { ok: true, remaining: balance ?? 0, cost: 0 };
    }

    const { data, error } = await supabase.rpc('deduct_tokens', {
      p_user_id: user.id,
      p_amount: cost,
    });

    if (error) {
      if (error.message.includes('Nedostatek')) {
        const balance = await getTokenBalance();
        return {
          ok: false,
          code: 'insufficient',
          reason: `Nedostatek tokenů — tato akce stojí ${cost} tokenů, máte ${balance ?? 0}. Dobijte kredit v ceníku.`,
          cost,
          balance: balance ?? 0,
        };
      }
      console.error('[tokens] deduct_tokens RPC error:', error.message);
      return { ok: false, code: 'error', reason: 'Chyba při odečítání tokenů. Zkuste to prosím znovu.' };
    }

    return { ok: true, remaining: data as number, cost };
  } catch (err) {
    console.error('[tokens] deductTokens unexpected error:', err);
    return { ok: false, code: 'error', reason: 'Chyba při odečítání tokenů. Zkuste to prosím znovu.' };
  }
}

/**
 * Vrátí tokeny zpět (např. když sken po odečtení selhal). Jde přes service-role
 * klient, protože `add_tokens` smí volat jen server. Nikdy nevyhazuje.
 */
export async function refundTokens(userId: string, amount: number): Promise<boolean> {
  if (amount <= 0) return true;
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[tokens] refundTokens: SUPABASE_SERVICE_ROLE_KEY chybí — tokeny nelze vrátit', { userId, amount });
    return false;
  }
  const { error } = await admin.rpc('add_tokens', { p_user_id: userId, p_amount: amount });
  if (error) {
    console.error('[tokens] refundTokens add_tokens RPC failed:', error.message, { userId, amount });
    return false;
  }
  return true;
}
