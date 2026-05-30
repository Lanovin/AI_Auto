import { NextResponse } from 'next/server';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const payload = (await request.json()) || {};
    const resolvedApiKey = process.env.ANTHROPIC_API_KEY;

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
        'Cache-Control': 'no-store'
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