import { NextResponse } from 'next/server';
import { OpenSeaService, type WaterfallData } from '@/lib/api/opensea';

/**
 * GET /api/opensea/comparable-sales
 *
 * Returns a per-item-name valuation table built from recent sales.
 * Groups by "itemName::rarity" key with median and min sale prices.
 * Also includes waterfall data for Track B market exit valuation.
 * Server-side cached for 2 hours. Client calls once per portfolio load.
 *
 * Response: { items: {...}, waterfall: { byTokenId, byName, bySkin, byWeapon } }
 */

interface CachedResult {
  items: Record<string, { medianGun: number; minGun: number; saleCount: number; rarity: string; name: string }>;
  waterfall: WaterfallData;
  totalSalesAnalyzed: number;
  updatedAt: string;
}

// In-memory cache — survives across requests within the same serverless invocation
let cache: CachedResult | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function GET() {
  const now = Date.now();

  // Return cached result if fresh
  if (cache && now < cacheExpiresAt) {
    const res = NextResponse.json(cache);
    res.headers.set('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=600');
    return res;
  }

  try {
    const openSea = new OpenSeaService();
    const result = await openSea.getComparableSalesTable();

    // Only cache if we got meaningful data
    if (Object.keys(result.items).length > 0) {
      cache = result;
      cacheExpiresAt = now + CACHE_TTL_MS;
    }

    const res = NextResponse.json(result);
    res.headers.set('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=600');
    return res;
  } catch (error) {
    console.error('[Comparable Sales] Error:', error);

    // Return stale cache if available
    if (cache) {
      const res = NextResponse.json(cache);
      res.headers.set('Cache-Control', 'public, s-maxage=600');
      return res;
    }

    return NextResponse.json(
      { items: {}, waterfall: { byTokenId: {}, byName: {}, bySkin: {}, byWeapon: {} }, totalSalesAnalyzed: 0, updatedAt: new Date().toISOString(), error: 'Failed to fetch comparable sales' },
      { status: 500 }
    );
  }
}
