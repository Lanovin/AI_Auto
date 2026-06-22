import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const [{ data: { user } }, admin] = await Promise.all([
    supabase.auth.getUser(),
    // Admin používá vlastní httpOnly cookie (cargent_admin), kterou klient
    // nevidí — proto stav vracíme ze serveru, ať se admin v aplikaci
    // nezobrazuje jako odhlášený. Funguje na localhostu i na Vercelu.
    isAdminAuthenticated(),
  ]);

  return NextResponse.json({ authenticated: Boolean(user), admin });
}