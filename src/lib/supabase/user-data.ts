/**
 * USER DATA — Supabase
 * ════════════════════════════════════════════════════════════════════════════
 * Všechna uživatelská data (vyžadují auth session) se čtou/zapisují přes
 * tento soubor pomocí Supabase klienta s RLS.
 *
 * Odkud tahat data:
 *   auth.users       → identita (e-mail, Google UID, …) — via supabase.auth.getUser()
 *   public.profiles  → profil + tokens_balance            — via supabase.from('profiles')
 *   public.garage_cars      → uložená auta uživatele
 *   public.scan_history     → historie AI skenů
 *   public.monitor_watchlist → watchlist monitoringu
 *
 * SDÍLENÝ CACHE — Neon DB (src/lib/db.ts + lib/market-cache.ts)
 * ════════════════════════════════════════════════════════════════════════════
 * Anonymní cache AI skenů sdílená pro všechny uživatele.
 * Klíč: car_signature (bez user_id). Slouží ke zrychlení — nesouvisí s účtem.
 * Nikdy netáhni uživatelská data odsud.
 */

import { createClient } from '@/lib/supabase/server';

type SupabaseLikeError = {
  code?: string;
  message?: string;
};

function isMissingScanHistoryTable(error: SupabaseLikeError | null): boolean {
  if (!error) return false;

  return (
    error.code === 'PGRST205' ||
    error.message?.includes("Could not find the table 'public.scan_history'") === true
  );
}

// ── Typy ──────────────────────────────────────────────────────────────────

export interface GarageCar {
  id: string;
  user_id: string;
  brand: string;
  model: string;
  year: number;
  mileage?: number;
  fuel?: string;
  transmission?: string;
  vin?: string;
  trim_version?: string;
  engine_capacity?: number;
  power_kw?: number;
  color?: string;
  body_type?: string;
  equipment: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export type GarageCarInput = Omit<GarageCar, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface ScanHistoryEntry {
  id: string;
  user_id: string;
  car_data: Record<string, unknown>;
  tier: string;
  average_price?: number;
  min_price?: number;
  max_price?: number;
  listing_count?: number;
  garage_car_id?: string;
  tokens_spent: number;
  created_at: string;
}

export type ScanHistoryInput = Omit<ScanHistoryEntry, 'id' | 'user_id' | 'created_at'>;

// ── Garáž ─────────────────────────────────────────────────────────────────

export async function getGarageCars(): Promise<GarageCar[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('garage_cars')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[user-data] getGarageCars:', error.message);
    return [];
  }
  return (data ?? []) as GarageCar[];
}

export async function addGarageCar(car: GarageCarInput): Promise<GarageCar | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('garage_cars')
    .insert({ ...car, user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error('[user-data] addGarageCar:', error.message);
    return null;
  }
  return data as GarageCar;
}

export async function updateGarageCar(
  id: string,
  patch: Partial<GarageCarInput>
): Promise<GarageCar | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('garage_cars')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[user-data] updateGarageCar:', error.message);
    return null;
  }
  return data as GarageCar;
}

export async function deleteGarageCar(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('garage_cars')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[user-data] deleteGarageCar:', error.message);
    return false;
  }
  return true;
}

// ── Historie skenů ─────────────────────────────────────────────────────────

export async function saveScanHistory(entry: ScanHistoryInput): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('scan_history')
    .insert({ ...entry, user_id: user.id });

  if (error) {
    if (isMissingScanHistoryTable(error)) {
      return;
    }
    console.error('[user-data] saveScanHistory:', error.message);
  }
}

/** Smaže jeden záznam historie skenů přihlášeného uživatele (RLS hlídá vlastnictví). */
export async function deleteScanHistoryEntry(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('scan_history')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[user-data] deleteScanHistoryEntry:', error.message);
    return false;
  }
  return true;
}

/** Smaže CELOU historii skenů přihlášeného uživatele (GDPR — právo na výmaz). */
export async function clearScanHistory(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('scan_history')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('[user-data] clearScanHistory:', error.message);
    return false;
  }
  return true;
}

export async function getScanHistory(limit = 20): Promise<ScanHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('scan_history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (isMissingScanHistoryTable(error)) {
      return [];
    }
    console.error('[user-data] getScanHistory:', error.message);
    return [];
  }
  return (data ?? []) as ScanHistoryEntry[];
}
