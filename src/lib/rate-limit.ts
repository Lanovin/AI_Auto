// Server-only — uses the service-role Supabase client. Never import from Client Components.
import { createHash } from 'node:crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Denní limit skenů na uživatele.
 *
 * Účel je PRÁVNÍ, ne kapacitní: každý sken čerpá malé výňatky z inzertních
 * portálů (filtrované vyhledávání na Sauto.cz, případně Anthropic web search). Bez limitu by se naše API dalo použít
 * jako nástroj systematické extrakce dat z cizích databází — opakovaná a
 * systematická extrakce i nepodstatných částí může porušit zvláštní právo
 * pořizovatele databáze (směrnice 96/9/ES čl. 7 odst. 5, AZ § 92). Limit
 * drží užívání v mezích běžného individuálního použití.
 *
 * Vynucuje se atomicky v DB funkci charge_tokens (migrace 0010) spolu
 * s odečtem tokenů — počítá se z usage_log, kterou uživatel nemůže smazat,
 * a souběžné požadavky limit nepřekročí. Viz chargeTokens() v tokens-server.ts.
 *
 * Market monitor (`/api/market-monitor/scan`) tímto limitem neprochází.
 * Čte jen jedno filtrované vyhledávání na Sauto.cz bez detailů inzerátů,
 * výsledek se sdílí v cache 3,5 dne a každý sken se platí tokeny.
 */
const DAILY_SCAN_LIMIT = Number(process.env.DAILY_SCAN_LIMIT ?? 30);

/** Limit pro chargeTokens(), nebo undefined, pokud je vypnutý (DAILY_SCAN_LIMIT=0). */
export const ESTIMATOR_DAILY_LIMIT =
  DAILY_SCAN_LIMIT > 0 ? { prefix: 'estimator:', limit: DAILY_SCAN_LIMIT } : undefined;

// ── Limity požadavků na veřejné/citlivé endpointy ─────────────────────────
// Server-only (service-role klient). Počítadla jsou v Supabase
// (rate_limit_hits, migrace 0011) — na Vercelu nemá smysl držet je v paměti,
// každá instance funkce by měla vlastní.

/** Pevné limity jednotlivých endpointů. */
export const REQUEST_LIMITS = {
  kontakt:    { max: 5,  windowSeconds: 60 * 60 },  // 5 zpráv za hodinu
  promo:      { max: 10, windowSeconds: 60 * 60 },  // 10 pokusů o kód za hodinu
  adminLogin: { max: 10, windowSeconds: 15 * 60 },  // 10 pokusů o přihlášení za 15 min
} as const;

export type RequestLimitName = keyof typeof REQUEST_LIMITS;

/**
 * Hash IP adresy klienta — IP je osobní údaj, do DB ji neukládáme.
 * Na Vercelu je první položka x-forwarded-for skutečná IP klienta.
 */
function clientIpHash(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip') || 'unknown';
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

/**
 * Připočte požadavek z IP klienta k limitu `name` a vrátí, zda smí projít.
 *
 * `failOpen` určuje chování, když limit nejde ověřit (chybí service-role,
 * DB je nedostupná, migrace 0011 neběžela): true = pustit (kontakt, admin
 * login — dostupnost má přednost), false = odmítnout (promo kódy).
 */
export async function checkRequestLimit(
  request: Request,
  name: RequestLimitName,
  { failOpen }: { failOpen: boolean }
): Promise<boolean> {
  const { max, windowSeconds } = REQUEST_LIMITS[name];
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error(`[rate-limit] ${name}: SUPABASE_SERVICE_ROLE_KEY chybí — limit neověřen.`);
    return failOpen;
  }

  try {
    const { data, error } = await admin.rpc('hit_rate_limit', {
      p_key: `${name}:${clientIpHash(request)}`,
      p_window_seconds: windowSeconds,
      p_max: max,
    });
    if (error) {
      console.error(`[rate-limit] ${name}: hit_rate_limit error:`, error.message);
      return failOpen;
    }
    return data === true;
  } catch (err) {
    console.error(`[rate-limit] ${name}: unexpected error:`, err);
    return failOpen;
  }
}
