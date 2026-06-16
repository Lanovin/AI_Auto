import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.cargent.cz';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/dashboard', '/predplatne', '/registrace', '/prihlaseni'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
