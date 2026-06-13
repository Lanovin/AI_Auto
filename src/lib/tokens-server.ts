// Server-only — imports next/headers via supabase/server. Never import from Client Components.
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { TOKEN_COSTS, type TokenFeature } from '@/lib/tokens';

/**
 * Returns the EFFECTIVE price list: defaults from TOKEN_COSTS overridden by
 * rows in the `token_pricing` table (managed in /admin → „Ceník služeb").
 * On any error (Supabase down / not configured) falls back to the defaults,
 * so billing never breaks the request.
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
      .single();

    return (data as { tokens_balance: number } | null)?.tokens_balance ?? null;
  } catch (err) {
    console.error('[tokens] getTokenBalance unexpected error (returning null):', err);
    return null;
  }
}

/**
 * Attempts to deduct `cost` tokens from the authenticated user's balance.
 * Uses the Postgres `deduct_tokens` function (security definer) so RLS
 * cannot be bypassed by a client faking the amount.
 *
 * The price is resolved dynamically (admin override → default), and the
 * actually-charged amount is returned as `cost` so callers can report it.
 *
 * Returns { ok: true, remaining, cost } on success.
 * Returns { ok: false, reason } if the user is unauthenticated, has insufficient
 * tokens, or if Supabase is unavailable / not configured.
 *
 * NOTE: This function never throws — any unexpected Supabase error is swallowed
 * and treated as "not authenticated" so the caller can fall back to client-side
 * localStorage token deduction without returning a 500 to the user.
 */
export async function deductTokens(
  feature: TokenFeature
): Promise<{ ok: true; remaining: number; cost: number } | { ok: false; reason: string }> {
  // Guard: Supabase not configured in this environment → treat as unauthenticated
  if (!hasSupabaseEnv()) return { ok: false, reason: 'Nejste přihlášeni.' };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: 'Nejste přihlášeni.' };

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
        return { ok: false, reason: 'Nedostatek tokenů. Doplňte kredit.' };
      }
      console.error('[tokens] deduct_tokens RPC error:', error.message);
      return { ok: false, reason: 'Chyba při odečítání tokenů.' };
    }

    return { ok: true, remaining: data as number, cost };
  } catch (err) {
    // Network error, Supabase project paused, cookie issues, invalid key, etc.
    // Log the error but never propagate — the scan result must still reach the user.
    console.error('[tokens] deductTokens unexpected error (treated as unauthenticated):', err);
    return { ok: false, reason: 'Nejste přihlášeni.' };
  }
}
