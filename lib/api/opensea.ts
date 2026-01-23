import axios from 'axios';
import { toOpenSeaChain } from '@/lib/utils/openseaChain';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// Circuit breaker: cache HARD failures only to avoid spamming
// Key: tokenKey, Value: { failedAt: timestamp, error: string }
// Note: We only cache 401/403/404 and config errors; NOT rate limits, aborts, or 5xx
const failureCache = new Map<string, { failedAt: number; error: string }>();
const FAILURE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Status codes that should be cached (hard failures unlikely to recover soon)
const CACHEABLE_STATUS_CODES = new Set([401, 403, 404]);

/**
 * Determine if an HTTP status code represents a transient error.
 * Transient errors (429, 5xx) should NOT be cached - they may recover.
 * @pure - Can be unit tested
 */
export function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

/**
 * Determine if an HTTP status code should trigger failure caching.
 * Only hard failures (401, 403, 404) should be cached.
 * @pure - Can be unit tested
 */
export function shouldCacheFailureStatus(status: number): boolean {
  return CACHEABLE_STATUS_CODES.has(status);
}

function getCachedFailure(tokenKey: string): { error: string } | null {
  const cached = failureCache.get(tokenKey);
  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.failedAt > FAILURE_CACHE_TTL_MS) {
    failureCache.delete(tokenKey);
    return null;
  }

  return { error: cached.error };
}

function setCachedFailure(tokenKey: string, error: string): void {
  failureCache.set(tokenKey, { failedAt: Date.now(), error });

  // Cleanup old entries (keep cache size reasonable)
  if (failureCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of failureCache.entries()) {
      if (now - value.failedAt > FAILURE_CACHE_TTL_MS) {
        failureCache.delete(key);
      }
    }
  }
}


/**
 * Safe conversion from wei (bigint) to decimal number.
 * Avoids Number(BigInt) overflow for very large values by using string manipulation.
 */
function formatUnitsToNumber(value: bigint, decimals: number = 18): number {
  const valueStr = value.toString();

  // Handle zero
  if (valueStr === '0') return 0;

  // Pad with leading zeros if needed
  const paddedValue = valueStr.padStart(decimals + 1, '0');
  const integerPart = paddedValue.slice(0, -decimals) || '0';
  const fractionalPart = paddedValue.slice(-decimals);

  // Construct decimal string and parse
  const decimalStr = `${integerPart}.${fractionalPart}`;
  return parseFloat(decimalStr);
}

/**
 * Normalize a price value to number | null.
 * Guards against NaN, undefined, and invalid values.
 * Used by both browser and server paths for consistent price handling.
 */
function normalizePrice(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isNaN(num) ? null : num;
}

/**
 * Throw an error if called from browser context.
 * These methods require direct API access which fails with CORS.
 */
function assertServerOnly(methodName: string): void {
  if (isBrowser) {
    throw new Error(
      `OpenSeaService.${methodName}() cannot be called from browser. ` +
      `This method requires direct OpenSea API access. Use a proxy route instead.`
    );
  }
}

export class OpenSeaService {
  private apiKey?: string;

  constructor() {
    // Only use server-side API key; client always goes through /api/opensea/orders proxy
    this.apiKey = process.env.OPENSEA_API_KEY;
  }

  async getCollectionStats(collectionSlug: string): Promise<any | null> {
    assertServerOnly('getCollectionStats');
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await axios.get(
        `${OPENSEA_API_BASE}/collections/${collectionSlug}/stats`,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching OpenSea collection stats:', error);
      return null;
    }
  }

  async getNFTFloorPrice(contractAddress: string, chain: string = 'avalanche'): Promise<number | null> {
    assertServerOnly('getNFTFloorPrice');
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${mappedChain}/contract/${contractAddress}`,
        { headers }
      );

      return response.data?.collection?.stats?.floor_price || null;
    } catch (error) {
      console.error('Error fetching NFT floor price from OpenSea:', error);
      return null;
    }
  }

  async getNFTsByWallet(
    walletAddress: string,
    chain: string = 'avalanche',
    limit: number = 50
  ): Promise<any[]> {
    assertServerOnly('getNFTsByWallet');
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${mappedChain}/account/${walletAddress}/nfts`,
        {
          headers,
          params: { limit },
        }
      );

      return response.data?.nfts || [];
    } catch (error) {
      console.error('Error fetching NFTs from OpenSea:', error);
      return [];
    }
  }

  async getListings(contractAddress: string, chain: string = 'avalanche'): Promise<any[]> {
    assertServerOnly('getListings');
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await axios.get(
        `${OPENSEA_API_BASE}/listings/collection/${contractAddress}`,
        { headers }
      );

      return response.data?.listings || [];
    } catch (error) {
      console.error('Error fetching listings from OpenSea:', error);
      return [];
    }
  }

  async getNFTListings(
    contractAddress: string,
    tokenId: string,
    chain: string = 'avalanche',
    options?: { signal?: AbortSignal; noStore?: boolean }
  ): Promise<{
    lowest: number | null;
    highest: number | null;
    ordersCount: number;
    asOfIso?: string;
    error?: string;
    /** Upstream HTTP status code from proxy (0 if no call made or internal error) */
    upstreamStatus?: number;
    /** True if error is transient (429/5xx) - client should NOT cache */
    transient?: boolean;
  }> {
    const tokenKey = `${chain}:${contractAddress}:${tokenId}`;

    // Check circuit breaker (only for hard failures)
    // Skip circuit breaker when noStore is true (force fresh fetch)
    if (!options?.noStore) {
      const cachedFailure = getCachedFailure(tokenKey);
      if (cachedFailure) {
        return { lowest: null, highest: null, ordersCount: 0, error: cachedFailure.error };
      }
    }

    try {
      // In browser, use our API route to avoid CORS
      if (isBrowser) {
        // Build URL with optional debug=1 for noStore mode
        let url = `/api/opensea/orders?chain=${encodeURIComponent(chain)}&contract=${encodeURIComponent(contractAddress)}&tokenId=${encodeURIComponent(tokenId)}`;
        if (options?.noStore) {
          url += '&debug=1'; // debug=1 triggers cache='no-store' in the proxy
        }

        const response = await fetch(url, { signal: options?.signal });

        // Handle non-ok responses from our proxy - don't cache based on proxy status
        // The proxy should always return 200 with error in JSON; non-200 means something else went wrong
        if (!response.ok) {
          const errorMsg = `Proxy error: ${response.status}`;
          // Don't cache proxy-level errors (these are transient/infrastructure issues)
          return { lowest: null, highest: null, ordersCount: 0, error: errorMsg };
        }

        const data = await response.json();

        // Extract status/transient fields from proxy response
        // The proxy now always includes upstreamStatus (0 if no upstream call was made)
        const upstreamStatus = typeof data.upstreamStatus === 'number' ? data.upstreamStatus : 0;
        // Use transient field from proxy if available, otherwise compute from status
        const transient = typeof data.transient === 'boolean' ? data.transient : isTransientStatus(upstreamStatus);

        // NaN normalization - proxy should send valid numbers, but guard anyway
        const lowest = normalizePrice(data.lowest);
        const highest = normalizePrice(data.highest);

        // Handle upstream errors with status-driven caching
        if (data.error) {
          // GUARDRAIL: Never cache if transient===true
          // Only cache when upstreamStatus indicates a hard failure (401, 403, 404)
          // Do NOT cache when:
          // - transient is true
          // - upstreamStatus is 0 (no upstream call / internal error)
          // - upstreamStatus is 429 (rate limited)
          // - upstreamStatus >= 500 (server error)
          if (!transient && shouldCacheFailureStatus(upstreamStatus)) {
            setCachedFailure(tokenKey, data.error);
          }
          // Transient errors are NOT cached - will retry next time

          return {
            lowest,
            highest,
            ordersCount: data.ordersCount ?? 0,
            asOfIso: data.asOfIso,
            error: data.error,
            upstreamStatus,
            transient,
          };
        }

        return {
          lowest,
          highest,
          ordersCount: data.ordersCount ?? 0,
          asOfIso: data.asOfIso,
          upstreamStatus,
          transient: false, // Success response
        };
      }

      // Server-side: call OpenSea directly with mapped chain
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/orders/${mappedChain}/seaport/listings?asset_contract_address=${contractAddress}&token_ids=${tokenId}&limit=50`,
        { headers, signal: options?.signal }
      );

      const orders = response.data?.orders || [];
      const asOfIso = new Date().toISOString();

      if (orders.length === 0) {
        return { lowest: null, highest: null, ordersCount: 0, asOfIso };
      }

      const prices = orders
        .filter((order: any) => order.current_price)
        .map((order: any) => {
          try {
            const priceWei = BigInt(order.current_price);
            return formatUnitsToNumber(priceWei, 18);
          } catch {
            // Skip orders with invalid price format
            return 0;
          }
        })
        .filter((price: number) => price > 0);

      if (prices.length === 0) {
        return { lowest: null, highest: null, ordersCount: orders.length, asOfIso };
      }

      // Normalize computed prices to guard against any edge cases producing NaN
      const lowest = normalizePrice(Math.min(...prices));
      const highest = normalizePrice(Math.max(...prices));

      return {
        lowest,
        highest,
        ordersCount: orders.length,
        asOfIso,
      };
    } catch (error) {
      // Check if aborted (browser AbortError or axios cancellation) - never cache aborts
      if (error instanceof Error && error.name === 'AbortError') {
        return { lowest: null, highest: null, ordersCount: 0, error: 'Request aborted' };
      }

      // Check for axios cancellation (ERR_CANCELED or message contains 'canceled')
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED' || error.message?.toLowerCase().includes('canceled')) {
          return { lowest: null, highest: null, ordersCount: 0, error: 'Request aborted' };
        }

        // Check for axios errors with status codes
        if (error.response?.status) {
          const status = error.response.status;
          const errorMsg = `OpenSea API error: ${status}`;
          const transient = isTransientStatus(status);

          // Only cache hard failures (401, 403, 404), never transient errors
          if (!transient && shouldCacheFailureStatus(status)) {
            setCachedFailure(tokenKey, errorMsg);
          }

          return { lowest: null, highest: null, ordersCount: 0, error: errorMsg, upstreamStatus: status, transient };
        }
      }

      // Generic network error - don't cache (might be transient)
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      console.warn('OpenSea listings fetch failed (non-blocking):', errorMsg);
      return { lowest: null, highest: null, ordersCount: 0, error: errorMsg };
    }
  }

  async getNFTMetadata(
    contractAddress: string,
    tokenId: string,
    chain: string = 'avalanche'
  ): Promise<any | null> {
    assertServerOnly('getNFTMetadata');
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${mappedChain}/contract/${contractAddress}/nfts/${tokenId}`,
        { headers }
      );

      return response.data?.nft || null;
    } catch (error) {
      console.error('Error fetching NFT metadata from OpenSea:', error);
      return null;
    }
  }

  /**
   * Get the last sale price for a specific NFT
   * Returns the price in the chain's native currency (e.g., AVAX for Avalanche)
   */
  async getLastSalePrice(
    contractAddress: string,
    tokenId: string,
    walletAddress: string,
    chain: string = 'avalanche'
  ): Promise<{ price: number; date: Date; currency: string } | null> {
    assertServerOnly('getLastSalePrice');
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      // Try to get events for this NFT
      const response = await axios.get(
        `${OPENSEA_API_BASE}/events/chain/${mappedChain}/contract/${contractAddress}/nfts/${tokenId}`,
        {
          headers,
          params: {
            event_type: 'sale',
            limit: 50, // Get recent sales
          },
        }
      );

      const events = response.data?.asset_events || [];
      console.log(`Found ${events.length} sale events for token ${tokenId}`);

      if (events.length === 0) {
        return null;
      }

      // Find the sale where the buyer is our wallet address
      const userPurchase = events.find((event: any) =>
        event.to_account?.address?.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!userPurchase) {
        console.log('No sale event found for this wallet address');
        return null;
      }

      console.log('Found purchase event:', userPurchase);

      // Extract price information
      const payment = userPurchase.payment;
      if (!payment) {
        return null;
      }

      // Convert from wei to native currency
      const price = parseFloat(payment.quantity) / Math.pow(10, payment.decimals || 18);
      const date = new Date(userPurchase.event_timestamp);
      const currency = payment.symbol || 'AVAX';

      console.log(`Last sale: ${price} ${currency} on ${date.toISOString()}`);

      return { price, date, currency };
    } catch (error) {
      console.error('Error fetching last sale price from OpenSea:', error);
      return null;
    }
  }
}
