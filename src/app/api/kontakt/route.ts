import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Kontaktní formulář → e-mail přes Resend (https://resend.com).
 *
 * Env:
 *   RESEND_API_KEY      — klíč z Resend dashboardu (re_...)
 *   CONTACT_TO_EMAIL    — kam zprávy chodí (výchozí ytlaso2@gmail.com)
 *   CONTACT_FROM_EMAIL  — odesílatel; musí být na ověřené doméně v Resend.
 *                         Bez vlastní domény funguje "Cargent <onboarding@resend.dev>"
 *                         (jen na e-mail vlastníka Resend účtu).
 */
interface ContactBody {
  jmeno: string;
  email: string;
  zprava: string;
  typ?: string;
  /** Honeypot — reální lidé ho nevyplní. */
  web?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Jednoduchý in-memory limit: max 5 zpráv / 10 min z jedné IP (na Vercelu
// per instance, ale i tak zastaví hloupé spamování).
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (arr.length >= 5) return true;
  arr.push(now);
  hits.set(ip, arr);
  return false;
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL ?? 'ytlaso2@gmail.com';
  const fromEmail = process.env.CONTACT_FROM_EMAIL ?? 'Cargent <onboarding@resend.dev>';

  let body: ContactBody;
  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const { jmeno, email, zprava, typ, web } = body;

  // Honeypot: bot vyplnil skryté pole → tvař se, že prošlo.
  if (web && web.trim()) return NextResponse.json({ ok: true });

  if (!jmeno?.trim() || !email?.trim() || !zprava?.trim()) {
    return NextResponse.json({ error: 'Vyplňte prosím jméno, e-mail a zprávu.' }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Neplatná e-mailová adresa.' }, { status: 422 });
  }
  if (zprava.length > 5000 || jmeno.length > 120) {
    return NextResponse.json({ error: 'Zpráva je příliš dlouhá.' }, { status: 422 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Příliš mnoho zpráv. Zkuste to za chvíli.' }, { status: 429 });
  }

  if (!apiKey) {
    console.error('[kontakt] RESEND_API_KEY chybí — zpráva nebyla odeslána:', { jmeno, email, typ });
    return NextResponse.json(
      { error: 'Odesílání zpráv zatím není nastavené. Napište nám prosím přímo na ' + toEmail + '.' },
      { status: 503 },
    );
  }

  const html = `
    <h2>Nová zpráva z kontaktního formuláře Cargent</h2>
    <p><strong>Jméno:</strong> ${escapeHtml(jmeno)}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
    ${typ ? `<p><strong>Typ:</strong> ${escapeHtml(typ)}</p>` : ''}
    <p><strong>Zpráva:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(zprava)}</p>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `Cargent — zpráva od ${jmeno}${typ ? ` (${typ})` : ''}`,
        html,
        text: `Jméno: ${jmeno}\nE-mail: ${email}\nTyp: ${typ ?? '-'}\n\n${zprava}`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[kontakt] Resend error:', res.status, detail);
      return NextResponse.json(
        { error: 'Zprávu se nepodařilo odeslat. Zkuste to prosím znovu nebo napište na ' + toEmail + '.' },
        { status: 502 },
      );
    }
  } catch (err) {
    console.error('[kontakt] Resend request failed:', err);
    return NextResponse.json(
      { error: 'Zprávu se nepodařilo odeslat. Zkuste to prosím znovu.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
