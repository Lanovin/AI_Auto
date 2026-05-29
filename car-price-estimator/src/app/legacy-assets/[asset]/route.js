import { readLegacyAsset } from '@/lib/legacy-content';

export async function GET(_request, context) {
  const params = await context.params;
  const asset = await readLegacyAsset(params.asset);

  if (!asset) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(asset.content, {
    headers: {
      'Content-Type': asset.contentType,
      'Cache-Control': 'no-store'
    }
  });
}