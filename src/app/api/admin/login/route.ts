import { NextResponse } from 'next/server';
import { verifyCredentials, setAdminCookie } from '@/lib/admin/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const username = (body.username ?? '').trim();
  const password = body.password ?? '';

  if (!verifyCredentials(username, password)) {
    return NextResponse.json(
      { ok: false, error: 'Nesprávné jméno nebo heslo.' },
      { status: 401 }
    );
  }

  await setAdminCookie();
  return NextResponse.json({ ok: true });
}
