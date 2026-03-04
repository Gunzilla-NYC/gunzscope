/**
 * Shared server-side GUN price fetcher with in-memory cache.
 * Replaces self-fetch calls to /api/price/gun from other API routes.
 */

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const COIN_ID = 'gunz';
const CACHE_TTL_MS = 60_000; // 60 seconds

let cachedPrice: { gunTokenPrice: number; timestamp: string } | null = null;
let cacheExpiresAt = 0;

export async function getGunPriceUsd(): Promise<number> {
  // Return cached value if fresh
  if (cachedPrice && Date.now() < cacheExpiresAt) {
    return cachedPrice.gunTokenPrice;
  }

  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const res = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${COIN_ID}&vs_currencies=usd`,
      { headers, signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) {
      // Return stale cache if available
      return cachedPrice?.gunTokenPrice ?? 0;
    }

    const data = await res.json();
    const price = data?.[COIN_ID]?.usd ?? 0;

    if (price > 0) {
      cachedPrice = { gunTokenPrice: price, timestamp: new Date().toISOString() };
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    }

    return price;
  } catch {
    // Return stale cache on error
    return cachedPrice?.gunTokenPrice ?? 0;
  }
}
