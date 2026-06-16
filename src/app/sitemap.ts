import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.cargent.cz';
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/odhad-ceny`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/cenik`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/kontakt`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${base}/podminky`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/ochrana-udaju`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/zdroje-dat`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
