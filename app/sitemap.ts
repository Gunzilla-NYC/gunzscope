import type { MetadataRoute } from 'next';

const BASE_URL = 'https://gunzscope.xyz';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Public pages with their relative priority and change frequency
  const staticPages: {
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }[] = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/portfolio', changeFrequency: 'always', priority: 0.9 },
    { path: '/market', changeFrequency: 'hourly', priority: 0.8 },
    { path: '/scarcity', changeFrequency: 'daily', priority: 0.7 },
    { path: '/leaderboard', changeFrequency: 'daily', priority: 0.7 },
    { path: '/waitlist', changeFrequency: 'weekly', priority: 0.6 },
    { path: '/updates', changeFrequency: 'weekly', priority: 0.5 },
    { path: '/changelog', changeFrequency: 'weekly', priority: 0.4 },
    { path: '/feature-requests', changeFrequency: 'weekly', priority: 0.4 },
    { path: '/credits', changeFrequency: 'monthly', priority: 0.2 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.1 },
    { path: '/terms', changeFrequency: 'yearly', priority: 0.1 },
    { path: '/cookies', changeFrequency: 'yearly', priority: 0.1 },
  ];

  return staticPages.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
