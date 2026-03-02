/**
 * Shared market reference price cache.
 * Populated by /api/market/listings route after processing listings + sales.
 * Consumed by /api/market/reference-prices for portfolio valuation injection.
 * Module-level singleton — shared within the same serverless invocation.
 */

export interface MarketReferencePrice {
  floorGun: number;
  avgSaleGun7d: number | null;
  listingCount: number;
  recentSales: number;
}

export interface MarketReferencePriceCache {
  byItemName: Record<string, MarketReferencePrice>;
  updatedAt: string;
}

let referencePriceCache: MarketReferencePriceCache | null = null;
let referencePriceCacheExpiresAt = 0;
const REFERENCE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes (same as market listings)

export function getReferencePriceCache(): MarketReferencePriceCache | null {
  if (referencePriceCache && Date.now() < referencePriceCacheExpiresAt) {
    return referencePriceCache;
  }
  return null;
}

export function setReferencePriceCache(data: MarketReferencePriceCache): void {
  referencePriceCache = data;
  referencePriceCacheExpiresAt = Date.now() + REFERENCE_CACHE_TTL_MS;
}
