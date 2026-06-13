// Server-only — jednoduchá autentizace admin CMS (/admin).
// Přihlašovací údaje: ADMIN_USERNAME / ADMIN_PASSWORD (výchozí admin / admin),
// přepsatelné proměnnými prostředí (na Vercelu). Po přihlášení se nastaví
// podepsaná httpOnly cookie; její platnost ověřuje requireAdmin() / isAdminAuthenticated().
// Soubor je server-only (next/headers + node:crypto) — neimportovat z klienta.
import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'cargent_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hodin

export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME || 'admin';
}

function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || 'admin';
}

function getSessionSecret(): string {
  // Pokud není explicitní secret, odvodíme ho z údajů — změna hesla tak
  // automaticky zneplatní staré cookies.
  return (
    process.env.ADMIN_SESSION_SECRET ||
    `cargent::${getAdminUsername()}::${getAdminPassword()}`
  );
}

/** Ověří zadané jméno + heslo proti konfiguraci (konstantní čas). */
export function verifyCredentials(username: string, password: string): boolean {
  return (
    safeEqual(username, getAdminUsername()) &&
    safeEqual(password, getAdminPassword())
  );
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function sign(payload: string): string {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

/** Vytvoří podepsaný token „<expEpoch>.<hmac>". */
function createToken(): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = String(exp);
  return `${payload}.${sign(payload)}`;
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;

  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = sign(payload);
  if (!safeEqual(sig, expected)) return false;

  const exp = Number(payload);
  return Number.isFinite(exp) && exp > Math.floor(Date.now() / 1000);
}

/** Nastaví přihlašovací cookie (volat z route handleru po ověření údajů). */
export async function setAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Smaže přihlašovací cookie (odhlášení). */
export async function clearAdminCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** True, pokud je aktuální request přihlášený jako admin. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidToken(cookieStore.get(COOKIE_NAME)?.value);
}
