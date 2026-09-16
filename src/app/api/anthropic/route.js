import { NextResponse } from 'next/server';
import { deductTokens, getSessionUser, refundTokens } from '@/lib/tokens-server';
import { TOKEN_COSTS } from '@/lib/tokens';
import { isAdminAuthenticated } from '@/lib/admin/auth';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// Modely, které smí legacy nástroje (popisky, skaut, monitoring) používat přes
// proxy. Cokoliv jiného se přepíše na výchozí — endpoint nesmí být volná brána
// k libovolnému (drahému) modelu.
const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5',
  'claude-sonnet-5',
  'claude-opus-5',
]);
const DEFAULT_MODEL = 'claude-sonnet-5';
const MAX_OUTPUT_TOKENS = 8000;

// Jen akce legacy nástrojů. Klient si hlavičku volí sám, proto sem nesmí
// patřit levnější položky (např. estimator:quick), kterými by šlo obejít cenu.
const LEGACY_FEATURES = new Set(['popisky:generate', 'scout:search', 'monitor:scan']);

/**
 * Proxy pro legacy nástroje. Bezpečnostní pravidla:
 *  - jen přihlášený uživatel (nebo admin) — každé volání stojí peníze,
 *  - povinná hlavička x-autoai-feature s platnou akcí (účtuje se z tokenů),
 *  - model z allowlistu, max_tokens zastropované.
 */
export async function POST(request) {
  let charged = null;
  try {
    const payload = (await request.json()) || {};
    const resolvedApiKey = process.env.ANTHROPIC_API_KEY;

    const feature = request.headers.get('x-autoai-feature');
    if (!feature || !(feature in TOKEN_COSTS) || !LEGACY_FEATURES.has(feature)) {
      return NextResponse.json({ error: { message: 'Neznámá akce (x-autoai-feature).' } }, { status: 400 });
    }

    const isAdmin = await isAdminAuthenticated();
    const user = isAdmin ? null : await getSessionUser();
    if (!isAdmin && !user) {
      return NextResponse.json(
        { error: { message: 'Pro použití nástroje se přihlaste.' }, code: 'unauthenticated' },
        { status: 401 }
      );
    }

    if (!resolvedApiKey) {
      return NextResponse.json({ error: { message: 'Anthropic API key is not configured on the server.' } }, { status: 500 });
    }

    let tokensDeducted = 0;
    if (!isAdmin) {
      const deductResult = await deductTokens(feature);
      if (!deductResult.ok) {
        const status = deductResult.code === 'unauthenticated' ? 401 : deductResult.code === 'insufficient' ? 402 : 500;
        return NextResponse.json({ error: { message: deductResult.reason }, code: deductResult.code }, { status });
      }
      tokensDeducted = deductResult.cost;
      if (tokensDeducted > 0) charged = { userId: user.id, amount: tokensDeducted };
    }

    const model = ALLOWED_MODELS.has(payload.model) ? payload.model : DEFAULT_MODEL;
    const maxTokens = Math.min(Number(payload.max_tokens) || 2000, MAX_OUTPUT_TOKENS);
    // Legacy nástroje posílají starší varianty web_search — sjednoť na aktuální.
    const tools = Array.isArray(payload.tools)
      ? payload.tools.map((t) =>
          t && typeof t.type === 'string' && t.type.startsWith('web_search')
            ? { ...t, type: 'web_search_20260209', max_uses: Math.min(Number(t.max_uses) || 5, 10) }
            : t
        )
      : undefined;
    const safePayload = { ...payload, model, max_tokens: maxTokens, stream: false };
    if (tools) safePayload.tools = tools;

    const upstreamResponse = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': resolvedApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(safePayload),
      cache: 'no-store'
    });

    const responseText = await upstreamResponse.text();
    if (upstreamResponse.ok) charged = null; // úspěch → tokeny zůstávají odečtené

    return new Response(responseText, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
        'x-autoai-tokens-deducted': String(tokensDeducted)
      }
    });
  } catch (error) {
    // Chyba sítě k Anthropic → 502 (tokeny se vrací ve finally); vadný JSON → 400.
    const isUpstream = error instanceof TypeError || (error instanceof Error && /fetch/i.test(error.message));
    console.error('[api/anthropic] error:', error);
    return NextResponse.json(
      {
        error: {
          message: isUpstream
            ? 'AI je dočasně nedostupná. Zkuste to prosím znovu — tokeny jsme vám vrátili.'
            : 'Neplatný požadavek.',
        },
      },
      { status: isUpstream ? 502 : 400 }
    );
  } finally {
    if (charged) await refundTokens(charged.userId, charged.amount);
  }
}
