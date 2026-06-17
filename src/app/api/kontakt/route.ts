import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

interface ContactBody {
  jmeno: string;
  email: string;
  zprava: string;
  typ?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  const smtpHost = process.env.BREVO_SMTP_HOST ?? 'smtp-relay.brevo.com';
  const smtpPort = Number(process.env.BREVO_SMTP_PORT ?? '587');
  const smtpUser = process.env.BREVO_SMTP_USER;
  const smtpPass = process.env.BREVO_SMTP_PASS;
  const toEmail = process.env.BREVO_CONTACT_TO_EMAIL ?? 'ytlaso2@gmail.com';
  const senderEmail = process.env.BREVO_SENDER_EMAIL ?? 'noreply@cargent.cz';
  const senderName = process.env.BREVO_SENDER_NAME ?? 'Cargent Kontakt';

  if (!smtpUser || !smtpPass) {
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
    <p><strong>Jméno:</strong> ${escapeHtml(jmeno)}</p>
    <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
    ${typ ? `<p><strong>Typ:</strong> ${escapeHtml(typ)}</p>` : ''}
    <p><strong>Zpráva:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(zprava)}</p>
  `;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // 465 = SSL, 587 = STARTTLS
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from: { name: senderName, address: senderEmail },
      to: toEmail,
      replyTo: { name: jmeno, address: email },
      subject: `Cargent — zpráva od ${jmeno}`,
      html: htmlContent,
    });
  } catch (err) {
    console.error('[kontakt] Brevo SMTP error:', err);
    return NextResponse.json(
      { error: 'Zprávu se nepodařilo odeslat. Zkuste to prosím znovu.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
