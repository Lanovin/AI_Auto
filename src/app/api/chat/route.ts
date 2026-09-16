import { NextResponse } from 'next/server';
import { buildChatFacts, buildSystemPrompt } from '@/lib/chat/knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * David — pomocník v pravém dolním rohu webu.
 *
 * GET  → fakta o službě (ceny, balíčky) pro předpřipravené odpovědi v UI.
 *        Ty se odpovídají lokálně, bez volání AI a bez nákladu.
 * POST → volný dotaz. Odpovídá Claude Haiku (rychlý a levný) se systémovým
 *        promptem, který obsahuje kompletní znalost webu.
 *
 * Běží na stejném ANTHROPIC_API_KEY jako zbytek systému. Uživatelské tokeny
 * se NEÚČTUJÍ — chat je podpora, ne placená funkce. Proti zneužití proto
 * hlídáme limit na IP, délku dotazu i délku historie.
 */
const CHAT_MODEL = process.env.ANTHROPIC_CHAT_MODEL || 'claude-haiku-4-5';
const MAX_OUTPUT_TOKENS = 800;
const MAX_MESSAGE_CHARS = 700;
const MAX_HISTORY = 10;
const REQUEST_TIMEOUT_MS = 45_000;

// ── Limit na IP: 25 dotazů / 15 min (per instance, stačí proti běžnému spamu) ──
const WINDOW_MS = 15 * 60_000;
const MAX_PER_WINDOW = 25;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (arr.length >= MAX_PER_WINDOW) {
    hits.set(ip, arr);
    return true;
  }
  arr.push(now);
  hits.set(ip, arr);
  // Drobný úklid, ať mapa neroste donekonečna.
  if (hits.size > 5000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return false;
}

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

export async function GET() {
  try {
    const facts = await buildChatFacts();
    return NextResponse.json(facts, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch (err) {
    console.error('[chat] buildChatFacts failed:', err);
    return NextResponse.json({ error: 'Fakta se nepodařilo načíst.' }, { status: 500 });
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function parseMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const cleaned: ChatMessage[] = [];
  for (const m of raw.slice(-MAX_HISTORY)) {
    if (!m || typeof m !== 'object') continue;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') continue;
    const text = String(content ?? '').trim().slice(0, MAX_MESSAGE_CHARS);
    if (!text) continue;
    // Anthropic vyžaduje střídání rolí — slouč po sobě jdoucí stejné role.
    const last = cleaned[cleaned.length - 1];
    if (last && last.role === role) last.content += '\n' + text;
    else cleaned.push({ role, content: text });
  }

  if (cleaned.length === 0) return null;
  // Konverzace musí začínat i končit uživatelem.
  while (cleaned.length > 0 && cleaned[0].role !== 'user') cleaned.shift();
  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== 'user') return null;
  return cleaned;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Chat teď není dostupný. Napište nám prosím přes stránku /kontakt.' },
      { status: 503 },
    );
  }

  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: 'Zeptal jste se na hodně věcí za krátkou dobu. Zkuste to prosím za chvíli, nebo napište na /kontakt.' },
      { status: 429 },
    );
  }

  let body: { messages?: unknown };
  try {
    body = (await request.json()) as { messages?: unknown };
  } catch {
    return NextResponse.json({ error: 'Neplatný požadavek.' }, { status: 400 });
  }

  const messages = parseMessages(body.messages);
  if (!messages) {
    return NextResponse.json({ error: 'Chybí dotaz.' }, { status: 400 });
  }

  let systemPrompt: string;
  try {
    systemPrompt = buildSystemPrompt(await buildChatFacts());
  } catch (err) {
    console.error('[chat] system prompt build failed:', err);
    return NextResponse.json({ error: 'Chat teď není dostupný. Zkuste to prosím později.' }, { status: 503 });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      cache: 'no-store',
      signal: controller.signal,
      body: JSON.stringify({
        model: CHAT_MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: true,
        // Systémový prompt je pro všechny stejný → cache_control ho drží levný.
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages,
      }),
    });
  } catch (err) {
    clearTimeout(timeoutId);
    const aborted = err instanceof Error && err.name === 'AbortError';
    console.error('[chat] upstream request failed:', err);
    return NextResponse.json(
      {
        error: aborted
          ? 'Odpověď trvala příliš dlouho. Zkuste otázku položit stručněji.'
          : 'Chat je dočasně nedostupný. Zkuste to prosím za chvíli.',
      },
      { status: 503 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    clearTimeout(timeoutId);
    const detail = await upstream.text().catch(() => '');
    console.error('[chat] Anthropic error:', upstream.status, detail.slice(0, 300));
    return NextResponse.json(
      { error: 'Chat je dočasně nedostupný. Zkuste to prosím za chvíli, nebo napište na /kontakt.' },
      { status: 503 },
    );
  }

  // Přepošli jen textové delty jako prostý text — klient je rovnou vypisuje.
  //
  // POZOR: SSE událost se běžně rozdělí na hranici dvou chunků. Proto držíme
  // buffer napříč čteními a zpracováváme jen celé řádky (ukončené \n) —
  // bez toho by se poslední, nedokončený řádek každého chunku zahodil
  // a odpověď by se uživateli usekla uprostřed slova.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(ctrl) {
      let buffer = '';

      const emitLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) return;
        const data = trimmed.slice(5).trim();
        if (!data || data === '[DONE]') return;
        try {
          const evt = JSON.parse(data) as { type?: string; delta?: { type?: string; text?: string } };
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
            ctrl.enqueue(encoder.encode(evt.delta.text));
          }
        } catch {
          // Neplatný JSON (například keep-alive komentář) — přeskoč.
        }
      };

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let nl: number;
          while ((nl = buffer.indexOf('\n')) >= 0) {
            emitLine(buffer.slice(0, nl));
            buffer = buffer.slice(nl + 1);
          }
        }
        // Zbytek bufferu po konci streamu (poslední řádek bez \n).
        if (buffer.trim()) emitLine(buffer);
      } catch (err) {
        console.error('[chat] stream read failed:', err);
      } finally {
        clearTimeout(timeoutId);
        try { ctrl.close(); } catch { /* už zavřeno */ }
      }
    },
    cancel() {
      clearTimeout(timeoutId);
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
}
