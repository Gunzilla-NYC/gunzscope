/**
 * Historical GUN Price Service
 *
 * Fetches and caches GUN/USD prices from CoinGecko for calculating
 * NFT cost basis at time of acquisition.
 *
 * @note CoinGecko free tier limits historical data to the past 365 days.
 *       For older data, upgrade to a paid plan or use a fallback source.
 */

// =============================================================================
// Types
// =============================================================================

export interface PriceResult {
  priceUSD: number;
  timestamp: Date;
  source: 'coingecko' | 'cache' | 'interpolated';
  confidence: 'exact' | 'interpolated' | 'estimated';
}

interface MarketChartResponse {
  prices: Array<[number, number]>; // [timestamp_ms, price]
}

interface HistoricalResponse {
  market_data?: {
    current_price?: {
      usd?: number;
    };
  };
}

// =============================================================================
// Constants
// =============================================================================

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const GUN_TOKEN_ID = 'gunz';

// Cache TTLs
const CURRENT_PRICE_TTL_MS = 30 * 1000; // 30 seconds for current price
const HISTORICAL_PRICE_TTL_MS = Infinity; // Historical prices never change

// Rate limiting
const MIN_REQUEST_INTERVAL_MS = 1500; // CoinGecko free tier: ~30 req/min
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

// Debug logging
const DEBUG = process.env.NODE_ENV === 'development';

// =============================================================================
// In-Memory Cache
// =============================================================================

interface CacheEntry {
  result: PriceResult;
  expiresAt: number;
}

const priceCache = new Map<string, CacheEntry>();
let lastRequestTime = 0;

/**
 * Format a date as YYYY-MM-DD for cache key
 */
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `gun_usd_${year}-${month}-${day}`;
}

/**
 * Format a date as DD-MM-YYYY for CoinGecko API
 */
function formatDateForApi(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Get cached price if available and not expired
 */
function getCachedPrice(key: string): PriceResult | null {
  const entry = priceCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt !== Infinity && Date.now() > entry.expiresAt) {
    priceCache.delete(key);
    return null;
  }

  return { ...entry.result, source: 'cache' };
}

/**
 * Store price in cache
 */
function setCachedPrice(key: string, result: PriceResult, ttlMs: number): void {
  priceCache.set(key, {
    result,
    expiresAt: ttlMs === Infinity ? Infinity : Date.now() + ttlMs,
  });
}

// =============================================================================
// Rate Limiting & HTTP
// =============================================================================

/**
 * Wait to respect rate limits
 */
async function respectRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    const waitTime = MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest;
    if (DEBUG) console.log(`[priceHistory] Rate limiting: waiting ${waitTime}ms`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (apiKey) {
    headers['x-cg-demo-api-key'] = apiKey;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await respectRateLimit();

    try {
      const response = await fetch(url, { ...options, headers });

      if (response.ok) {
        return response;
      }

      // Handle rate limiting
      if (response.status === 429) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        if (DEBUG) console.log(`[priceHistory] Rate limited, backing off ${backoff}ms`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      // Other errors
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
      if (DEBUG) console.error(`[priceHistory] Fetch attempt ${attempt + 1} failed:`, error);

      if (attempt < MAX_RETRIES - 1) {
        const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

// =============================================================================
// Interpolation
// =============================================================================

/**
 * Linear interpolate between two price points
 */
function interpolatePrice(
  prices: Array<[number, number]>,
  targetTimestamp: number
): number | null {
  if (prices.length === 0) return null;
  if (prices.length === 1) return prices[0][1];

  // Sort by timestamp
  const sorted = [...prices].sort((a, b) => a[0] - b[0]);

  // If target is before all data, use first price
  if (targetTimestamp <= sorted[0][0]) {
    return sorted[0][1];
  }

  // If target is after all data, use last price
  if (targetTimestamp >= sorted[sorted.length - 1][0]) {
    return sorted[sorted.length - 1][1];
  }

  // Find surrounding points
  for (let i = 0; i < sorted.length - 1; i++) {
    const [t1, p1] = sorted[i];
    const [t2, p2] = sorted[i + 1];

    if (targetTimestamp >= t1 && targetTimestamp <= t2) {
      // Linear interpolation
      const ratio = (targetTimestamp - t1) / (t2 - t1);
      return p1 + ratio * (p2 - p1);
    }
  }

  return null;
}

// =============================================================================
// Core API Functions
// =============================================================================

/**
 * Get GUN price at a specific timestamp
 *
 * Uses market_chart/range for precise interpolation when needed.
 *
 * @param timestamp - The date/time to get price for
 * @returns PriceResult with price and metadata
 */
export async function getGunPriceAtTime(timestamp: Date): Promise<PriceResult> {
  const dateKey = formatDateKey(timestamp);

  // Check cache first
  const cached = getCachedPrice(dateKey);
  if (cached) {
    if (DEBUG) console.log(`[priceHistory] Cache hit for ${dateKey}`);
    return cached;
  }

  try {
    // For today's date, use simple/price endpoint
    const now = new Date();
    const isToday =
      timestamp.getFullYear() === now.getFullYear() &&
      timestamp.getMonth() === now.getMonth() &&
      timestamp.getDate() === now.getDate();

    if (isToday) {
      const currentPrice = await getCurrentGunPrice();
      if (currentPrice !== null) {
        const result: PriceResult = {
          priceUSD: currentPrice,
          timestamp: now,
          source: 'coingecko',
          confidence: 'exact',
        };
        setCachedPrice(dateKey, result, CURRENT_PRICE_TTL_MS);
        return result;
      }
    }

    // For historical dates, use /history endpoint (free tier compatible)
    if (DEBUG) console.log(`[priceHistory] Fetching history for ${dateKey}`);

    const historyUrl = `${COINGECKO_BASE}/coins/${GUN_TOKEN_ID}/history?date=${formatDateForApi(timestamp)}&localization=false`;
    const historyResponse = await fetchWithRetry(historyUrl);
    const historyData: HistoricalResponse = await historyResponse.json();

    const price = historyData?.market_data?.current_price?.usd;

    if (price !== undefined && price !== null) {
      const result: PriceResult = {
        priceUSD: price,
        timestamp,
        source: 'coingecko',
        confidence: 'exact',
      };
      setCachedPrice(dateKey, result, HISTORICAL_PRICE_TTL_MS);
      return result;
    }

    // Fallback: try market_chart/range for interpolation (requires API key)
    if (process.env.COINGECKO_API_KEY) {
      if (DEBUG) console.log(`[priceHistory] Trying market_chart for ${dateKey}`);

      const startOfDay = new Date(timestamp);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(timestamp);
      endOfDay.setHours(23, 59, 59, 999);

      const fromUnix = Math.floor(startOfDay.getTime() / 1000);
      const toUnix = Math.floor(endOfDay.getTime() / 1000);

      const url = `${COINGECKO_BASE}/coins/${GUN_TOKEN_ID}/market_chart/range?vs_currency=usd&from=${fromUnix}&to=${toUnix}`;

      try {
        const response = await fetchWithRetry(url);
        const data: MarketChartResponse = await response.json();

        if (data.prices && data.prices.length > 0) {
          const targetMs = timestamp.getTime();
          const interpolated = interpolatePrice(data.prices, targetMs);

          if (interpolated !== null) {
            const result: PriceResult = {
              priceUSD: interpolated,
              timestamp,
              source: 'coingecko',
              confidence: data.prices.length > 1 ? 'interpolated' : 'exact',
            };
            setCachedPrice(dateKey, result, HISTORICAL_PRICE_TTL_MS);
            return result;
          }
        }
      } catch {
        // market_chart failed, continue to return estimated
        if (DEBUG) console.log(`[priceHistory] market_chart failed for ${dateKey}`);
      }
    }

    // No data available - return estimated price of 0
    if (DEBUG) console.log(`[priceHistory] No price data available for ${dateKey}`);

    const result: PriceResult = {
      priceUSD: 0,
      timestamp,
      source: 'coingecko',
      confidence: 'estimated',
    };
    return result;
  } catch (error) {
    console.error(`[priceHistory] Error fetching price for ${dateKey}:`, error);

    // Check cache again in case of stale data
    const stale = priceCache.get(dateKey);
    if (stale) {
      return { ...stale.result, source: 'cache' };
    }

    // Return zero price as fallback
    return {
      priceUSD: 0,
      timestamp,
      source: 'coingecko',
      confidence: 'estimated',
    };
  }
}

/**
 * Get current GUN price
 *
 * @returns Current price in USD or null if unavailable
 */
export async function getCurrentGunPrice(): Promise<number | null> {
  const cacheKey = 'gun_usd_current';

  // Check cache
  const cached = getCachedPrice(cacheKey);
  if (cached) {
    if (DEBUG) console.log('[priceHistory] Cache hit for current price');
    return cached.priceUSD;
  }

  try {
    const url = `${COINGECKO_BASE}/simple/price?ids=${GUN_TOKEN_ID}&vs_currencies=usd`;

    if (DEBUG) console.log('[priceHistory] Fetching current price');

    const response = await fetchWithRetry(url);
    const data = await response.json();

    const price = data[GUN_TOKEN_ID]?.usd;

    if (price !== undefined && price !== null) {
      const result: PriceResult = {
        priceUSD: price,
        timestamp: new Date(),
        source: 'coingecko',
        confidence: 'exact',
      };
      setCachedPrice(cacheKey, result, CURRENT_PRICE_TTL_MS);
      return price;
    }

    return null;
  } catch (error) {
    console.error('[priceHistory] Error fetching current price:', error);
    return null;
  }
}

/**
 * Batch fetch prices for multiple timestamps efficiently
 *
 * Groups requests by date to minimize API calls.
 *
 * @param timestamps - Array of dates to get prices for
 * @returns Map of ISO timestamp string to PriceResult
 */
export async function getGunPricesForTimestamps(
  timestamps: Date[]
): Promise<Map<string, PriceResult>> {
  const results = new Map<string, PriceResult>();

  if (timestamps.length === 0) {
    return results;
  }

  // Group by date to minimize API calls
  const byDate = new Map<string, Date[]>();
  for (const ts of timestamps) {
    const dateKey = formatDateKey(ts);
    const existing = byDate.get(dateKey) || [];
    existing.push(ts);
    byDate.set(dateKey, existing);
  }

  if (DEBUG) {
    console.log(
      `[priceHistory] Batch fetching ${timestamps.length} timestamps across ${byDate.size} unique dates`
    );
  }

  // Process each unique date
  for (const [dateKey, dateTimestamps] of Array.from(byDate.entries())) {
    // Check cache first
    const cached = getCachedPrice(dateKey);

    if (cached) {
      // Use cached price for all timestamps on this date
      for (const ts of dateTimestamps) {
        results.set(ts.toISOString(), {
          ...cached,
          timestamp: ts,
        });
      }
      continue;
    }

    // Fetch price for this date (first timestamp)
    const firstTs = dateTimestamps[0];
    const priceResult = await getGunPriceAtTime(firstTs);

    // Apply to all timestamps on this date
    for (const ts of dateTimestamps) {
      results.set(ts.toISOString(), {
        ...priceResult,
        timestamp: ts,
      });
    }
  }

  return results;
}

// =============================================================================
// Testing & Debugging Utilities
// =============================================================================

/**
 * Clear the price cache (for testing)
 */
export function clearPriceCache(): void {
  priceCache.clear();
  if (DEBUG) console.log('[priceHistory] Cache cleared');
}

/**
 * Get cache statistics (for debugging)
 */
export function getPriceCacheStats(): { size: number; keys: string[] } {
  return {
    size: priceCache.size,
    keys: Array.from(priceCache.keys()),
  };
}

/**
 * Prefetch prices for a date range (useful for warming cache)
 *
 * @param startDate - Start of range
 * @param endDate - End of range
 */
export async function prefetchPriceRange(
  startDate: Date,
  endDate: Date
): Promise<void> {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  if (DEBUG) {
    console.log(`[priceHistory] Prefetching ${dates.length} days of price data`);
  }

  await getGunPricesForTimestamps(dates);
}
