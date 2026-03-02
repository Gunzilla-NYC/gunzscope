import { getReferencePriceCache } from '@/lib/api/marketCache';

/**
 * GET /api/market/reference-prices
 *
 * Returns per-item-name floor prices and 7-day avg sale prices derived from
 * the market listings cache. Lightweight — no OpenSea calls of its own.
 * If market data isn't cached yet, returns empty (non-blocking).
 *
 * Portfolio enrichment uses this as an additional signal for currentLowestListing
 * without requiring individual per-NFT listing calls.
 */
export async function GET(): Promise<Response> {
  const cached = getReferencePriceCache();

  if (!cached) {
    return Response.json(
      { byItemName: {}, updatedAt: null, cached: false },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      }
    );
  }

  return Response.json(
    { ...cached, cached: true },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    }
  );
}
