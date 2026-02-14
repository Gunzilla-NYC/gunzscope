import { NextResponse } from 'next/server';
import { OpenSeaService } from '@/lib/api/opensea';

/**
 * GET /api/opensea/rarity-floors
 *
 * Returns per-rarity-tier floor prices from recent sales data.
 * Server-side cached for 1 hour. Client should call once per portfolio load.
 *
 * Response: { floors: { Epic: 1500, Rare: 800, ... }, salesCount: {...}, updatedAt: ISO }
 */

interface CachedResult {
  floors: Record<string, number>;
  salesCount: Record<string, number>;
  updatedAt: string;
}

// In-memory cache — survives across requests within the same serverless invocation
let cache: CachedResult | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const now = Date.now();

  // Return cached result if fresh
  if (cache && now < cacheExpiresAt) {
    const res = NextResponse.json(cache);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=300');
    return res;
  }

  try {
    const openSea = new OpenSeaService();
    const result = await openSea.getRarityFloorTable();

    // Only cache if we got meaningful data
    if (Object.keys(result.floors).length > 0) {
      cache = result;
      cacheExpiresAt = now + CACHE_TTL_MS;
    }

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=300');
    return res;
  } catch (error) {
    console.error('[Rarity Floors] Error:', error);

    // Return stale cache if available
    if (cache) {
      const res = NextResponse.json(cache);
      res.headers.set('Cache-Control', 'public, s-maxage=600');
      return res;
    }

    return NextResponse.json(
      { floors: {}, salesCount: {}, updatedAt: new Date().toISOString(), error: 'Failed to fetch rarity floors' },
      { status: 500 }
    );
  }
}
