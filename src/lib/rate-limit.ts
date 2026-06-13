// Server-only — imports next/headers via supabase/server. Never import from Client Components.
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';

/**
 * Denní limit skenů na uživatele.
 *
 * Účel je PRÁVNÍ, ne kapacitní: každý sken čerpá malé výňatky z inzertních
 * portálů (přes Anthropic web search). Bez limitu by se naše API dalo použít
 * jako nástroj systematické extrakce dat z cizích databází — opakovaná a
 * systematická extrakce i nepodstatných částí může porušit zvláštní právo
 * pořizovatele databáze (směrnice 96/9/ES čl. 7 odst. 5, AZ § 92). Limit
 * drží užívání v mezích běžného individuálního použití.
 *
 * Anonymní (nepřihlášení) uživatelé limit nemají — jsou ekonomicky omezeni
 * klientskými tokeny a bez účtu nelze počítat okno; přihlášení k vyššímu
 * objemu je zároveň žádoucí friction proti automatizaci.
 *
 * Market monitor (`/api/market-monitor/scan`) je záměrně BEZ limitu —
 * runMonitorScan nepoužívá web search, takže z portálů nic neextrahuje
 * (a jeho skeny se nezapisují do scan_history, čítač by je neviděl).
 */
const DAILY_SCAN_LIMIT = Number(process.env.DAILY_SCAN_LIMIT ?? 30);

export type DailyCapResult =
  | { ok: true }
  | { ok: false; limit: number };

/**
 * Checks the rolling 24h window of the authenticated user's scans
 * (counted from scan_history). Never throws; on any error or for
 * anonymous users returns ok (availability over enforcement).
 */
export async function checkDailyScanCap(): Promise<DailyCapResult> {
  if (!hasSupabaseEnv() || DAILY_SCAN_LIMIT <= 0) return { ok: true };

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: true };

    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('scan_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', windowStart);

    if (error) {
      console.error('[rate-limit] count query failed (allowing request):', error.message);
      return { ok: true };
    }

    if ((count ?? 0) >= DAILY_SCAN_LIMIT) {
      return { ok: false, limit: DAILY_SCAN_LIMIT };
    }

    return { ok: true };
  } catch (err) {
    console.error('[rate-limit] unexpected error (allowing request):', err);
    return { ok: true };
  }
}
