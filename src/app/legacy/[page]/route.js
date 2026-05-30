import { readLegacyPage } from '@/lib/legacy-content';

export async function GET(_request, context) {
  const params = await context.params;
  const html = await readLegacyPage(params.page);

  if (!html) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}