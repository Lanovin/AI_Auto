import { NextResponse } from 'next/server';
import { chargeTokens, isUserAuthenticated, refundCharge } from '@/lib/tokens-server';
import { isAdminAuthenticated } from '@/lib/admin/auth';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

// Proxy platí serverový ANTHROPIC_API_KEY — dřív přijala libovolný payload od
// kohokoli (i nepřihlášeného) s libovolným modelem a max_tokens. Teď jen
// přihlášení uživatelé (nebo admin), jen povolené modely a omezený výstup.
const ALLOWED_MODELS = new Set([
  'claude-opus-5-5',
  'claude-opus-4-8',
  'claude-opus-4-6',
  'claude-sonnet-5-5',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
  'claude-haiku-4-5-20251001',
]);
const MAX_OUTPUT_TOKENS = 16000;
const MAX_WEB_SEARCH_USES = 10;
// Strop velikosti vstupu (system + messages), ať jedna akce za pár tokenů
// nemůže poslat obří prompt na náš účet.
const MAX_PAYLOAD_CHARS = 60000;

// Akce, které smí přes proxy volat legacy nástroje. Každý požadavek musí
// nést hlavičku x-autoai-feature s jednou z nich — bez ní se nic nevolá,
// jinak by šlo proxy používat zdarma.
const PROXY_FEATURES = new Set(['popisky:generate', 'scout:search', 'import:web']);

function sanitizePayload(payload) {
  if (!payload || typeof payload !== 'object' || !ALLOWED_MODELS.has(payload.model)) {
    return { error: 'Nepovolený model.' };
  }
  const clean = { ...payload };
  delete clean.stream;
  clean.max_tokens = Math.min(Number(clean.max_tokens) || 1024, MAX_OUTPUT_TOKENS);
  if (Array.isArray(clean.tools)) {
    clean.tools = clean.tools
      .filter((t) => t && typeof t.type === 'string' && t.type.startsWith('web_search'))
      .map((t) => ({ ...t, max_uses: Math.min(Number(t.max_uses) || 5, MAX_WEB_SEARCH_USES) }));
    if (!clean.tools.length) delete clean.tools;
  }
  return { payload: clean };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const rawPayload = (await request.json()) || {};
    const resolvedApiKey = process.env.ANTHROPIC_API_KEY;

    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin && !(await isUserAuthenticated())) {
      return NextResponse.json(
        { error: { message: 'Pro použití AI nástrojů se musíte přihlásit.' } },
        { status: 401 }
      );
    }

    const { payload, error: payloadError } = sanitizePayload(rawPayload);
    if (payloadError) {
      return NextResponse.json({ error: { message: payloadError } }, { status: 400 });
    }
    if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) {
      return NextResponse.json({ error: { message: 'Požadavek je příliš dlouhý.' } }, { status: 413 });
    }

    // Každé volání je účtované: klient označí akci hlavičkou x-autoai-feature,
    // cena jde z ceníku (token_pricing override → TOKEN_COSTS). Tokeny se
    // odečtou PŘED voláním Anthropicu; při chybě upstreamu se vrátí.
    // Admin se neúčtuje (odpověď nese x-autoai-tokens-deducted: 0).
    const feature = request.headers.get('x-autoai-feature');
    if (!isAdmin && !PROXY_FEATURES.has(feature)) {
      return NextResponse.json({ error: { message: 'Neznámý typ akce.' } }, { status: 400 });
    }

    if (!resolvedApiKey) {
      console.error('[api/anthropic] ANTHROPIC_API_KEY is not configured.');
      return NextResponse.json(
        { error: { message: 'AI služba je dočasně nedostupná.' } },
        { status: 503 }
      );
    }

    let usageId = null;
    let tokensDeducted = 0;
    if (!isAdmin) {
      const charge = await chargeTokens(feature);
      if (!charge.ok) {
        return NextResponse.json({ error: { message: charge.reason } }, { status: charge.status });
      }
      usageId = charge.usageId;
      tokensDeducted = charge.cost;
    }

    let upstreamResponse;
    let responseText;
    try {
      upstreamResponse = await fetch(ANTHROPIC_MESSAGES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': resolvedApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      responseText = await upstreamResponse.text();
    } catch (upstreamErr) {
      console.error('[api/anthropic] upstream fetch failed:', upstreamErr);
      const refunded = usageId !== null && (await refundCharge(usageId));
      return NextResponse.json(
        { error: { message: 'AI služba neodpověděla.' + (refunded ? ' Tokeny vám byly vráceny.' : '') } },
        { status: 502 }
      );
    }

    if (!upstreamResponse.ok) {
      console.error('[api/anthropic] upstream error', upstreamResponse.status, responseText.slice(0, 500));
      const refunded = usageId !== null && (await refundCharge(usageId));
      return NextResponse.json(
        { error: { message: 'AI služba vrátila chybu.' + (refunded ? ' Tokeny vám byly vráceny.' : '') } },
        { status: 502 }
      );
    }

    return new Response(responseText, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
        'x-autoai-tokens-deducted': String(tokensDeducted)
      }
    });
  } catch (error) {
    console.error('[api/anthropic] request failed:', error);
    return NextResponse.json({ error: { message: 'Neplatný požadavek.' } }, { status: 400 });
  }
}