import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/config';
import { clearScanHistory, deleteScanHistoryEntry } from '@/lib/supabase/user-data';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/scan-history          → smaže CELOU historii skenů uživatele
 * DELETE /api/scan-history?id=<id>  → smaže jeden záznam
 *
 * GDPR — právo na výmaz: uživatel může svou historii ocenění kdykoli smazat
 * přímo z dashboardu. Vlastnictví řádků hlídá RLS (migrace 0003).
 */
export async function DELETE(request: Request) {
  if (!hasSupabaseEnv()) {
    return NextResponse.json({ error: 'Nejste přihlášeni.' }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Nejste přihlášeni.' }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get('id');

  const ok = id ? await deleteScanHistoryEntry(id) : await clearScanHistory();
  if (!ok) {
    return NextResponse.json({ error: 'Smazání se nepodařilo. Zkuste to znovu.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
