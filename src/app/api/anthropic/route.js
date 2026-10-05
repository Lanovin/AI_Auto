import { NextResponse } from 'next/server';
import { deductTokens, isUserAuthenticated } from '@/lib/tokens-server';
import { TOKEN_COSTS } from '@/lib/tokens';
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

    // Optional app-token billing: clients identify the billable action via
    // the x-autoai-feature header (e.g. 'popisky:generate'). Price comes from
    // the admin price list (token_pricing override → TOKEN_COSTS default).
    // Admin is not billed (the response carries x-autoai-tokens-deducted: 0).
    const feature = request.headers.get('x-autoai-feature');
    let tokensDeducted = 0;
    if (!isAdmin && feature && feature in TOKEN_COSTS) {
      try {
        const deductResult = await deductTokens(feature);
        if (deductResult.ok) {
          tokensDeducted = deductResult.cost;
        } else if (deductResult.reason !== 'Nejste přihlášeni.') {
          return NextResponse.json(
            { error: { message: deductResult.reason } },
            { status: 402 }
          );
        }
      } catch (tokenErr) {
        console.error('[api/anthropic] deductTokens threw unexpectedly (non-blocking):', tokenErr);
      }
    }

    if (!resolvedApiKey) {
      return NextResponse.json(
        {
          error: {
            message: 'Anthropic API key is not configured on the server.'
          }
        },
        { status: 500 }
      );
    }

    const upstreamResponse = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': resolvedApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    const responseText = await upstreamResponse.text();

    return new Response(responseText, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
        'x-autoai-tokens-deducted': String(tokensDeducted)
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Invalid request payload.'
        }
      },
      { status: 400 }
    );
  }
}