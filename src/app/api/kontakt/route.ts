import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface ContactBody {
  jmeno: string;
  email: string;
  zprava: string;
  typ?: string;
}

export async function POST(request: Request) {
  const apiKey = process.env.BREVO_API_KEY;
  const toEmail = process.env.BREVO_CONTACT_TO_EMAIL ?? 'ytlaso2@gmail.com';

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Kontaktní formulář není nakonfigurován.' },
      { status: 503 },
    );
  }

  let body: ContactBody;
  try {
    body = (await request.json()) as ContactBody;
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const { jmeno, email, zprava, typ } = body;

  if (!jmeno?.trim() || !email?.trim() || !zprava?.trim()) {
    return NextResponse.json({ error: 'Vyplňte prosím všechna povinná pole.' }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Neplatná e-mailová adresa.' }, { status: 422 });
  }

  const htmlContent = `
    <h2>Nová zpráva z kontaktního formuláře</h2>
    <p><strong>Jméno:</strong> ${jmeno}</p>
    <p><strong>E-mail:</strong> ${email}</p>
    ${typ ? `<p><strong>Typ:</strong> ${typ}</p>` : ''}
    <p><strong>Zpráva:</strong></p>
    <p style="white-space:pre-wrap">${zprava}</p>
  `;

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Cargent Kontakt', email: 'noreply@cargent.cz' },
      to: [{ email: toEmail }],
      replyTo: { email, name: jmeno },
      subject: `Cargent — zpráva od ${jmeno}`,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error('[kontakt] Brevo error:', res.status, detail);
    return NextResponse.json(
      { error: 'Zprávu se nepodařilo odeslat. Zkuste to prosím znovu.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
