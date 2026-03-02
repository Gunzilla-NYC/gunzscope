import { NextResponse } from 'next/server';
import { getAllItemOrigins, type ItemOriginsDataset } from '@/lib/services/itemOriginService';

/**
 * GET /api/item-origins
 *
 * Returns the full item origins dataset (releases, items, match rules).
 * Server-side cached for 5 minutes. Client fetches once per session.
 */

let cache: ItemOriginsDataset | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Called by admin route after mutations to force a refresh */
export function invalidateItemOriginsCache() {
  cache = null;
  cacheExpiresAt = 0;
}

export async function GET() {
  const now = Date.now();

  if (cache && now < cacheExpiresAt) {
    const res = NextResponse.json(cache);
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res;
  }

  try {
    const dataset = await getAllItemOrigins();
    cache = dataset;
    cacheExpiresAt = now + CACHE_TTL_MS;

    const res = NextResponse.json(dataset);
    res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res;
  } catch (error) {
    console.error('[Item Origins] Error:', error);

    // Return stale cache if available
    if (cache) {
      const res = NextResponse.json(cache);
      res.headers.set('Cache-Control', 'public, s-maxage=60');
      return res;
    }

    return NextResponse.json(
      { error: 'Failed to fetch item origins' },
      { status: 500 },
    );
  }
}
