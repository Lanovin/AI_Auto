import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { isAdminAuthenticated } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Admin používá vlastní httpOnly cookie (cargent_admin), kterou klient
  // nevidí — proto stav vracíme ze serveru, ať se admin v aplikaci
  // nezobrazuje jako odhlášený. Funguje na localhostu i na Vercelu.
  const admin = await isAdminAuthenticated();

  if (!hasSupabaseEnv()) {
    return NextResponse.json({ authenticated: false, admin });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return NextResponse.json({ authenticated: Boolean(user), admin });
  } catch (err) {
    console.error('[auth/status] getUser failed:', err);
    return NextResponse.json({ authenticated: false, admin });
  }
}
