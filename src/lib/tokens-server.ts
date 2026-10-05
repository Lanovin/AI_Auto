// Server-only — imports next/headers via supabase/server. Never import from Client Components.
import { createClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
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

/** True when a Supabase user is signed in (never throws). */
export async function isUserAuthenticated(): Promise<boolean> {
  if (!hasSupabaseEnv()) return false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

export type ChargeResult =
  | { ok: true; cost: number; remaining: number; usageId: number }
  | { ok: false; status: 401 | 402 | 429 | 503; reason: string };

const CHARGE_UNAVAILABLE = 'Tokeny se teď nepodařilo odečíst. Zkuste to prosím za chvíli znovu.';

/**
 * Charges the authenticated user for `feature` BEFORE the paid action runs.
 *
 * One atomic DB call (`charge_tokens`, migration 0010): locks the profile row,
 * checks the optional rolling 24h limit, checks the balance, deducts and logs
 * the usage. Parallel requests are serialized by the row lock, so neither the
 * balance nor the daily limit can be bypassed. If the action then fails, call
 * refundCharge(usageId).
 *
 * The user id comes from the verified session, never from the request; the
 * RPC is executable only with the service-role key.
 *
 * Fail-closed: any unexpected error returns ok: false (503) — a paid action
 * must never run unbilled. Never throws.
 */
export async function chargeTokens(
  feature: TokenFeature,
  dailyLimit?: { prefix: string; limit: number }
): Promise<ChargeResult> {
  if (!hasSupabaseEnv()) return { ok: false, status: 503, reason: CHARGE_UNAVAILABLE };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, status: 401, reason: 'Nejste přihlášeni.' };

    const admin = getSupabaseAdmin();
    if (!admin) {
      console.error('[tokens] SUPABASE_SERVICE_ROLE_KEY není nastaven — nelze účtovat tokeny.');
      return { ok: false, status: 503, reason: CHARGE_UNAVAILABLE };
    }

    const cost = await getTokenCost(feature);
    const { data, error } = await admin.rpc('charge_tokens', {
      p_user_id: user.id,
      p_feature: feature,
      p_amount: cost,
      p_limit_prefix: dailyLimit?.prefix ?? null,
      p_daily_limit: dailyLimit?.limit ?? null,
    });

    if (error) {
      if (error.message.includes('DAILY_LIMIT')) {
        return {
          ok: false,
          status: 429,
          reason: `Dosáhli jste denního limitu (${dailyLimit?.limit} za 24 hodin). Zkuste to znovu později.`,
        };
      }
      if (error.message.includes('Nedostatek')) {
        return { ok: false, status: 402, reason: 'Nedostatek tokenů. Doplňte kredit.' };
      }
      console.error('[tokens] charge_tokens RPC error:', error.message);
      return { ok: false, status: 503, reason: CHARGE_UNAVAILABLE };
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | { usage_id: number; new_balance: number }
      | null;
    if (!row) {
      console.error('[tokens] charge_tokens returned no row');
      return { ok: false, status: 503, reason: CHARGE_UNAVAILABLE };
    }

    return { ok: true, cost, remaining: row.new_balance, usageId: row.usage_id };
  } catch (err) {
    console.error('[tokens] chargeTokens unexpected error:', err);
    return { ok: false, status: 503, reason: CHARGE_UNAVAILABLE };
  }
}

/**
 * Returns the tokens of a charge whose action failed (upstream error, timeout)
 * and marks it refunded, so it also stops counting toward the daily limit.
 * Idempotent. Never throws; returns false (and logs) if the refund failed.
 */
export async function refundCharge(usageId: number): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('[tokens] refundCharge: SUPABASE_SERVICE_ROLE_KEY chybí — refund usage', usageId, 'neproběhl.');
    return false;
  }

  try {
    const { error } = await admin.rpc('refund_charge', { p_usage_id: usageId });
    if (error) {
      console.error('[tokens] refund_charge error for usage', usageId, ':', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[tokens] refundCharge unexpected error:', err);
    return false;
  }
}
