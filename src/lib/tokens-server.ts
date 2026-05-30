// Server-only — imports next/headers via supabase/server. Never import from Client Components.
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { TOKEN_COSTS, type TokenFeature } from '@/lib/tokens';

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
 * Returns { ok: true, remaining } on success.
 * Returns { ok: false, reason } if the user is unauthenticated, has insufficient
 * tokens, or if Supabase is unavailable / not configured.
 *
 * NOTE: This function never throws — any unexpected Supabase error is swallowed
 * and treated as "not authenticated" so the caller can fall back to client-side
 * localStorage token deduction without returning a 500 to the user.
 */
export async function deductTokens(
  feature: TokenFeature
): Promise<{ ok: true; remaining: number } | { ok: false; reason: string }> {
  // Guard: Supabase not configured in this environment → treat as unauthenticated
  if (!hasSupabaseEnv()) return { ok: false, reason: 'Nejste přihlášeni.' };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, reason: 'Nejste přihlášeni.' };

    const cost = TOKEN_COSTS[feature];

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

    return { ok: true, remaining: data as number };
  } catch (err) {
    // Network error, Supabase project paused, cookie issues, invalid key, etc.
    // Log the error but never propagate — the scan result must still reach the user.
    console.error('[tokens] deductTokens unexpected error (treated as unauthenticated):', err);
    return { ok: false, reason: 'Nejste přihlášeni.' };
  }
}
