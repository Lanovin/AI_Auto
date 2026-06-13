import { NextResponse } from 'next/server';
import { deductTokens } from '@/lib/tokens-server';
import { TOKEN_COSTS } from '@/lib/tokens';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = (await request.json()) || {};
    const resolvedApiKey = process.env.ANTHROPIC_API_KEY;

    // Optional app-token billing: clients identify the billable action via
    // the x-autoai-feature header (e.g. 'popisky:generate'). Price comes from
    // the admin price list (token_pricing override → TOKEN_COSTS default).
    // Unauthenticated users pass through and are billed client-side
    // (the response carries x-autoai-tokens-deducted: 0).
    const feature = request.headers.get('x-autoai-feature');
    let tokensDeducted = 0;
    if (feature && feature in TOKEN_COSTS) {
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