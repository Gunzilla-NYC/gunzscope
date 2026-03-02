import { toOpenSeaChain } from '@/lib/utils/openseaChain';
import { parseItemName } from '@/lib/nft/parseItemName';

/** Drop-in replacement for axios.get — removes ~30KB from client bundle */
async function fetchGet<T = any>(
  url: string,
  config?: { params?: Record<string, any>; headers?: Record<string, string | undefined> }
): Promise<{ data: T }> {
  let fullUrl = url;
  if (config?.params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(config.params)) {
      if (v != null) sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) fullUrl += (url.includes('?') ? '&' : '?') + qs;
  }
  // Strip undefined header values for fetch compatibility
  const headers: Record<string, string> = {};
  if (config?.headers) {
    for (const [k, v] of Object.entries(config.headers)) {
      if (v !== undefined) headers[k] = v;
    }
  }
  const res = await fetch(fullUrl, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { data };
}

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

// =============================================================================
// Exported Interfaces for Sale Events
// =============================================================================

/**
 * A single sale event for an NFT
 */
export interface SaleEvent {
  eventTimestamp: Date;
  priceGUN: number;
  priceWGUN: number;
  sellerAddress: string;
  buyerAddress: string;
  txHash: string;
  marketplace: string;
}

/**
 * A sale event with NFT metadata (for collection-wide queries)
 */
export interface CollectionSaleEvent extends SaleEvent {
  tokenId: string;
  nftName: string;
  nftTraits: Record<string, string> | null;
  contract: string;
}

/**
 * Floor price and collection statistics
 */
export interface FloorPriceResult {
  floorPriceGUN: number | null;
  totalVolume: number | null;
  totalSales: number | null;
  numOwners: number | null;
  lastUpdated: Date;
}

/**
 * A comparable sale for valuation purposes
 */
export interface ComparableSale {
  tokenId: string;
  nftName: string;
  rarity: string;
  salePriceGUN: number;
  saleDate: Date;
  buyerAddress: string;
  sellerAddress: string;
}

// =============================================================================
// Waterfall Valuation Types
// =============================================================================

export interface WaterfallEntry {
  timeWeightedMedianGun: number;
  saleCount: number;
  newestSaleDaysAgo: number;
}

export interface WaterfallData {
  byTokenId: Record<string, WaterfallEntry>;
  byName: Record<string, WaterfallEntry>;
  bySkin: Record<string, WaterfallEntry>;
  byWeapon: Record<string, WaterfallEntry>;
}

/**
 * Compute a time-weighted median from a set of sales.
 * Recent sales have more influence:
 *   0-7 days ago: weight 1.0
 *   7-30 days:    weight 0.75
 *   30-90 days:   weight 0.50
 *   90+ days:     weight 0.25
 */
function getTimeWeight(daysAgo: number): number {
  if (daysAgo <= 7) return 1.0;
  if (daysAgo <= 30) return 0.75;
  if (daysAgo <= 90) return 0.50;
  return 0.25;
}

function timeWeightedMedian(sales: { price: number; daysAgo: number }[]): number {
  if (sales.length === 0) return 0;
  if (sales.length === 1) return sales[0].price;

  // Sort by price ascending
  const sorted = [...sales].sort((a, b) => a.price - b.price);
  const weights = sorted.map(s => getTimeWeight(s.daysAgo));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const halfWeight = totalWeight / 2;

  // Walk until cumulative weight >= halfWeight
  let cumulative = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += weights[i];
    if (cumulative >= halfWeight) {
      return sorted[i].price;
    }
  }

  // Fallback: last price
  return sorted[sorted.length - 1].price;
}

/**
 * Build a WaterfallEntry from a list of sales with their days-ago values.
 */
function buildWaterfallEntry(sales: { price: number; daysAgo: number }[]): WaterfallEntry {
  return {
    timeWeightedMedianGun: timeWeightedMedian(sales),
    saleCount: sales.length,
    newestSaleDaysAgo: Math.min(...sales.map(s => s.daysAgo)),
  };
}

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// =============================================================================
// GunzScan Token Metadata Resolution
// =============================================================================

const GUNZSCAN_API = 'https://gunzscan.io/api/v2';
const RESOLVE_CONCURRENCY = 10;
const RESOLVE_TIMEOUT_MS = 8000;
const RESOLVE_BATCH_DELAY_MS = 50;

// Module-level name cache — token names are immutable after mint
interface NameCacheEntry {
  name: string;
  imageUrl: string | null;
  quality: string | null;
  cachedAt: number;
}

const nameCache = new Map<string, NameCacheEntry>();
const NAME_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const NAME_CACHE_MAX_ENTRIES = 500;

/**
 * Batch-resolve token IDs to names + images via GunzScan (Blockscout) API.
 * Checks module-level name cache first, only fetches uncached tokens.
 * Runs up to RESOLVE_CONCURRENCY requests in parallel with a small delay
 * between batches to avoid rate limiting.
 */
async function resolveTokenMetadata(
  contractAddress: string,
  tokenIds: string[]
): Promise<Map<string, { name: string; imageUrl: string | null; quality: string | null }>> {
  const result = new Map<string, { name: string; imageUrl: string | null; quality: string | null }>();
  if (tokenIds.length === 0) return result;

  const contract = contractAddress.toLowerCase();
  const now = Date.now();
  const uncachedTokenIds: string[] = [];

  // Check name cache for previously resolved tokens
  for (const tokenId of tokenIds) {
    const cacheKey = `${contract}:${tokenId}`;
    const cached = nameCache.get(cacheKey);
    if (cached && (now - cached.cachedAt) < NAME_CACHE_TTL_MS) {
      result.set(tokenId, { name: cached.name, imageUrl: cached.imageUrl, quality: cached.quality });
    } else {
      uncachedTokenIds.push(tokenId);
    }
  }

  if (uncachedTokenIds.length === 0) {
    console.log(`[GunzScan] All ${tokenIds.length} tokens resolved from name cache`);
    return result;
  }

  const cacheHits = tokenIds.length - uncachedTokenIds.length;
  if (cacheHits > 0) {
    console.log(`[GunzScan] Name cache: ${cacheHits} hit, ${uncachedTokenIds.length} miss`);
  }

  const startTime = Date.now();

  // Process uncached tokens in batches of RESOLVE_CONCURRENCY
  for (let i = 0; i < uncachedTokenIds.length; i += RESOLVE_CONCURRENCY) {
    const batch = uncachedTokenIds.slice(i, i + RESOLVE_CONCURRENCY);

    const settled = await Promise.allSettled(
      batch.map(async (tokenId) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), RESOLVE_TIMEOUT_MS);

        try {
          const res = await fetch(
            `${GUNZSCAN_API}/tokens/${contract}/instances/${tokenId}`,
            { signal: controller.signal }
          );
          if (!res.ok) return null;

          const data = await res.json();
          const metadata = data?.metadata;
          if (!metadata?.name) return null;

          // Extract quality from "Rarity" attribute (confusingly named — it's actually cosmetic quality)
          const attributes = metadata.attributes as Array<{ trait_type: string; value: string }> | undefined;
          const quality = attributes?.find((a) => a.trait_type === 'Rarity')?.value || null;

          return {
            tokenId,
            name: metadata.name as string,
            imageUrl: (metadata.image as string) || null,
            quality,
          };
        } catch {
          return null;
        } finally {
          clearTimeout(timeout);
        }
      })
    );

    for (const entry of settled) {
      if (entry.status === 'fulfilled' && entry.value) {
        const { tokenId, name, imageUrl, quality } = entry.value;
        result.set(tokenId, { name, imageUrl, quality });

        // Store in name cache
        const cacheKey = `${contract}:${tokenId}`;
        nameCache.set(cacheKey, { name, imageUrl, quality, cachedAt: Date.now() });
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + RESOLVE_CONCURRENCY < uncachedTokenIds.length) {
      await new Promise((r) => setTimeout(r, RESOLVE_BATCH_DELAY_MS));
    }
  }

  // Cleanup old entries if cache is over limit
  if (nameCache.size > NAME_CACHE_MAX_ENTRIES) {
    const cutoff = Date.now() - NAME_CACHE_TTL_MS;
    for (const [key, entry] of nameCache.entries()) {
      if (entry.cachedAt < cutoff) nameCache.delete(key);
    }
    // If still over, remove oldest
    if (nameCache.size > NAME_CACHE_MAX_ENTRIES) {
      const sorted = [...nameCache.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
      for (const [key] of sorted.slice(0, sorted.length - NAME_CACHE_MAX_ENTRIES)) {
        nameCache.delete(key);
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[GunzScan] Resolved ${result.size}/${tokenIds.length} token names (${uncachedTokenIds.length} fetched) in ${elapsed}s`);
  return result;
}

// Circuit breaker: cache failures to avoid spamming
// Key: tokenKey, Value: { failedAt: timestamp, error: string }
const failureCache = new Map<string, { failedAt: number; error: string }>();
const FAILURE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

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

// =============================================================================
// Debug Mode
// =============================================================================

const DEBUG = process.env.NODE_ENV === 'development';

// =============================================================================
// Trait Cache for NFT Metadata Enrichment
// =============================================================================
// OpenSea v2 events/listings endpoints don't include traits.
// Traits are only available via the Get NFT endpoint.
// We cache trait lookups to avoid redundant API calls.

interface TraitCacheEntry {
  traits: Record<string, string> | null;
  cachedAt: number;
}

const traitCache = new Map<string, TraitCacheEntry>();
const TRAIT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Get cached traits if available and not expired
 */
function getCachedTraits(cacheKey: string): Record<string, string> | null | undefined {
  const entry = traitCache.get(cacheKey);
  if (!entry) return undefined; // undefined = not in cache

  if (Date.now() - entry.cachedAt > TRAIT_CACHE_TTL_MS) {
    traitCache.delete(cacheKey);
    return undefined;
  }

  return entry.traits; // null = cached as "no traits", object = cached traits
}

/**
 * Store traits in cache
 */
function setCachedTraits(cacheKey: string, traits: Record<string, string> | null): void {
  traitCache.set(cacheKey, { traits, cachedAt: Date.now() });

  // Cleanup old entries
  if (traitCache.size > 200) {
    const now = Date.now();
    for (const [key, value] of traitCache.entries()) {
      if (now - value.cachedAt > TRAIT_CACHE_TTL_MS) {
        traitCache.delete(key);
      }
    }
  }
}

// =============================================================================
// Shared Collection Sales Cache
// =============================================================================
// Multiple consumers (market listings, rarity floors, comparable sales) call
// getCollectionSaleEvents independently. This module-level cache prevents
// redundant OpenSea API calls within the same serverless invocation.

interface SalesCacheEntry {
  sales: CollectionSaleEvent[];
  fetchedAt: number;
  afterDateMs: number | null; // null = no date filter
}

const salesCache = new Map<string, SalesCacheEntry>();
const SALES_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getSalesCacheKey(slug: string, afterDateMs: number | null): string {
  return `${slug}::${afterDateMs ?? 'all'}`;
}

/**
 * Find a usable cached sales result. A larger cached set can serve a smaller request
 * (e.g., cached 200 unfiltered → serves 50 unfiltered). Date-filtered requests
 * check if the unfiltered cache has enough entries after the requested date.
 */
function findUsableSalesCache(
  slug: string,
  afterDateMs: number | null,
  minCount: number
): CollectionSaleEvent[] | null {
  const now = Date.now();

  // Try exact key match
  const exactKey = getSalesCacheKey(slug, afterDateMs);
  const exact = salesCache.get(exactKey);
  if (exact && (now - exact.fetchedAt) < SALES_CACHE_TTL_MS && exact.sales.length >= minCount) {
    return exact.sales.slice(0, minCount);
  }

  // For unfiltered requests: any unfiltered cache with enough entries works
  if (afterDateMs === null) {
    const allKey = getSalesCacheKey(slug, null);
    const cached = salesCache.get(allKey);
    if (cached && (now - cached.fetchedAt) < SALES_CACHE_TTL_MS && cached.sales.length >= minCount) {
      return cached.sales.slice(0, minCount);
    }
  }

  // For date-filtered requests: check if unfiltered cache covers enough recent data
  if (afterDateMs !== null) {
    const allKey = getSalesCacheKey(slug, null);
    const allCached = salesCache.get(allKey);
    if (allCached && (now - allCached.fetchedAt) < SALES_CACHE_TTL_MS) {
      const filtered = allCached.sales.filter(s => s.eventTimestamp.getTime() >= afterDateMs);
      if (filtered.length >= minCount) {
        return filtered.slice(0, minCount);
      }
    }
  }

  return null;
}

function storeSalesCache(slug: string, afterDateMs: number | null, sales: CollectionSaleEvent[]): void {
  const key = getSalesCacheKey(slug, afterDateMs);
  salesCache.set(key, { sales, fetchedAt: Date.now(), afterDateMs });

  // Cleanup expired entries
  if (salesCache.size > 10) {
    const now = Date.now();
    for (const [k, entry] of salesCache.entries()) {
      if (now - entry.fetchedAt > SALES_CACHE_TTL_MS) {
        salesCache.delete(k);
      }
    }
  }
}

export class OpenSeaService {
  private apiKey?: string;

  constructor() {
    // OPENSEA_API_KEY is server-side only (never expose API keys to client)
    this.apiKey = process.env.OPENSEA_API_KEY;
  }

  async getCollectionStats(collectionSlug: string): Promise<any | null> {
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await fetchGet(
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
    try {
      // In browser, use our API route to avoid CORS and access server-side API key
      if (isBrowser) {
        const response = await fetch(
          `/api/opensea/floor?chain=${encodeURIComponent(chain)}&contract=${encodeURIComponent(contractAddress)}`
        );

        if (!response.ok) {
          console.warn(`[OpenSea Floor] API error: ${response.status}`);
          return null;
        }

        const data = await response.json();

        if (data.error) {
          console.warn(`[OpenSea Floor] ${data.error}`);
          return null;
        }

        return data.floorPrice ?? null;
      }

      // Server-side: call OpenSea directly
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await fetchGet(
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
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await fetchGet(
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
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await fetchGet(
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
    chain: string = 'avalanche'
  ): Promise<{ lowest: number | null; highest: number | null; error?: string }> {
    const tokenKey = `${chain}:${contractAddress}:${tokenId}`;

    // Check circuit breaker
    const cachedFailure = getCachedFailure(tokenKey);
    if (cachedFailure) {
      return { lowest: null, highest: null, error: cachedFailure.error };
    }

    try {
      // In browser, use our API route to avoid CORS
      if (isBrowser) {
        const response = await fetch(
          `/api/opensea/orders?chain=${encodeURIComponent(chain)}&contract=${encodeURIComponent(contractAddress)}&tokenId=${encodeURIComponent(tokenId)}`
        );

        if (!response.ok) {
          const errorMsg = `API error: ${response.status}`;
          setCachedFailure(tokenKey, errorMsg);
          return { lowest: null, highest: null, error: errorMsg };
        }

        const data = await response.json();

        if (data.error) {
          // Don't cache this as failure - it's from OpenSea, might recover
          return { lowest: data.lowest, highest: data.highest, error: data.error };
        }

        return { lowest: data.lowest, highest: data.highest };
      }

      // Server-side: call OpenSea directly with mapped chain
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await fetchGet(
        `${OPENSEA_API_BASE}/orders/${mappedChain}/seaport/listings?asset_contract_address=${contractAddress}&token_ids=${tokenId}&limit=50`,
        { headers }
      );

      const orders = response.data?.orders || [];

      if (orders.length === 0) {
        return { lowest: null, highest: null };
      }

      const prices = orders
        .filter((order: any) => order.current_price)
        .map((order: any) => {
          const priceWei = BigInt(order.current_price);
          return Number(priceWei) / 1e18;
        })
        .filter((price: number) => price > 0);

      if (prices.length === 0) {
        return { lowest: null, highest: null };
      }

      return {
        lowest: Math.min(...prices),
        highest: Math.max(...prices),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      console.warn('OpenSea listings fetch failed (non-blocking):', errorMsg);
      setCachedFailure(tokenKey, errorMsg);
      return { lowest: null, highest: null, error: errorMsg };
    }
  }

  async getNFTMetadata(
    contractAddress: string,
    tokenId: string,
    chain: string = 'avalanche'
  ): Promise<any | null> {
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await fetchGet(
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
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      // Try to get events for this NFT
      const response = await fetchGet(
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
      // OpenSea event_timestamp is Unix seconds — convert safely
      const rawTs = userPurchase.event_timestamp;
      const tsMs = typeof rawTs === 'number'
        ? (rawTs < 10_000_000_000 ? rawTs * 1000 : rawTs)
        : new Date(rawTs).getTime();
      const date = new Date(isNaN(tsMs) ? Date.now() : tsMs);
      const currency = payment.symbol || 'AVAX';

      console.log(`Last sale: ${price} ${currency} on ${date.toISOString()}`);

      return { price, date, currency };
    } catch (error) {
      console.error('Error fetching last sale price from OpenSea:', error);
      return null;
    }
  }

  // ===========================================================================
  // Sale Events Methods
  // ===========================================================================

  /**
   * Get sale history for a specific NFT.
   * Uses browser-safe API route when running in browser to avoid CORS issues.
   */
  async getSaleEvents(
    contractAddress: string,
    tokenId: string,
    chain: string = 'avalanche'
  ): Promise<SaleEvent[]> {
    try {
      // In browser, use our API route to avoid CORS
      if (isBrowser) {
        const response = await fetch(
          `/api/opensea/sales?chain=${encodeURIComponent(chain)}&contract=${encodeURIComponent(contractAddress)}&tokenId=${encodeURIComponent(tokenId)}`
        );

        if (!response.ok) {
          console.warn(`[OpenSea Sales] API error: ${response.status}`);
          return [];
        }

        const data = await response.json();

        if (data.error) {
          console.warn(`[OpenSea Sales] ${data.error}`);
          return [];
        }

        // Convert API response to SaleEvent format
        // Server route now returns ISO strings, but handle numbers defensively
        return (data.sales || []).map((sale: any) => {
          const raw = sale.eventTimestamp;
          const ms = typeof raw === 'number'
            ? (raw < 10_000_000_000 ? raw * 1000 : raw)
            : new Date(raw).getTime();
          return {
            eventTimestamp: new Date(isNaN(ms) ? Date.now() : ms),
            priceGUN: sale.priceGUN || 0,
            priceWGUN: sale.priceWGUN || 0,
            sellerAddress: sale.sellerAddress || '',
            buyerAddress: sale.buyerAddress || '',
            txHash: sale.txHash || '',
            marketplace: sale.marketplace || 'opensea',
          };
        });
      }

      // Server-side: call OpenSea directly
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};
      const mappedChain = toOpenSeaChain(chain);

      const response = await fetchGet(
        `${OPENSEA_API_BASE}/events/chain/${mappedChain}/contract/${contractAddress}/nfts/${tokenId}`,
        {
          headers,
          params: {
            event_type: 'sale',
            limit: 50,
          },
        }
      );

      const events = response.data?.asset_events || [];

      return events.map((event: any) => this.parseSaleEvent(event));
    } catch (error) {
      console.warn('Error fetching sale events from OpenSea:', error);
      return [];
    }
  }

  /**
   * Get recent sales across the whole collection with pagination support
   */
  async getCollectionSaleEvents(
    collectionSlug: string = 'off-the-grid',
    afterDate?: Date,
    limit: number = 50
  ): Promise<CollectionSaleEvent[]> {
    const afterDateMs = afterDate ? afterDate.getTime() : null;

    // Check shared sales cache first
    const cached = findUsableSalesCache(collectionSlug, afterDateMs, limit);
    if (cached) {
      if (DEBUG) {
        console.log(`[getCollectionSaleEvents] Cache HIT: ${cached.length} sales (requested ${limit})`);
      }
      return cached;
    }

    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      const params: Record<string, string | number> = {
        event_type: 'sale',
        limit: Math.min(limit, 50), // OpenSea max is 50 per request
      };

      if (afterDate) {
        // OpenSea expects Unix timestamp in seconds
        params.after = Math.floor(afterDate.getTime() / 1000);
      }

      const allEvents: CollectionSaleEvent[] = [];
      let cursor: string | null = null;
      let fetched = 0;

      // Paginate until we have enough results or no more pages
      do {
        const requestParams: Record<string, string | number> = cursor
          ? { ...params, next: cursor }
          : params;

        const response = await fetchGet<{
          asset_events?: any[];
          next?: string | null;
        }>(`${OPENSEA_API_BASE}/events/collection/${collectionSlug}`, {
          headers,
          params: requestParams,
        });

        const events = response.data?.asset_events || [];
        cursor = response.data?.next || null;

        // Log first raw event for debugging
        if (DEBUG && events.length > 0 && allEvents.length === 0) {
          console.log('[getCollectionSaleEvents] Raw event sample:', JSON.stringify(events[0], null, 2));
        }

        for (const event of events) {
          if (fetched >= limit) break;
          allEvents.push(this.parseCollectionSaleEvent(event));
          fetched++;
        }
      } while (cursor && fetched < limit);

      // Store in shared sales cache
      storeSalesCache(collectionSlug, afterDateMs, allEvents);

      return allEvents;
    } catch (error) {
      console.warn('Error fetching collection sale events from OpenSea:', error);
      return [];
    }
  }

  /**
   * Get floor price and collection statistics
   */
  async getCollectionFloorPrice(
    collectionSlug: string = 'off-the-grid'
  ): Promise<FloorPriceResult> {
    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      const response = await fetchGet(
        `${OPENSEA_API_BASE}/collections/${collectionSlug}/stats`,
        { headers }
      );

      const stats = response.data?.total || response.data;

      return {
        floorPriceGUN: stats?.floor_price ?? null,
        totalVolume: stats?.volume ?? null,
        totalSales: stats?.sales ?? null,
        numOwners: stats?.num_owners ?? null,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.warn('Error fetching collection floor price from OpenSea:', error);
      return {
        floorPriceGUN: null,
        totalVolume: null,
        totalSales: null,
        numOwners: null,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Get rarity-specific floor price by fetching recent sales and enriching with traits.
   *
   * Strategy: Since OpenSea v2 listings/events don't include traits, we:
   * 1. Fetch recent sales for the collection
   * 2. Enrich each sale with traits via the Get NFT endpoint
   * 3. Filter by rarity match
   * 4. Return minimum price
   *
   * @param rarity - The rarity level to filter by (e.g., "Common", "Uncommon", "Rare", "Epic", "Legendary")
   * @param collectionSlug - OpenSea collection slug (default: 'off-the-grid')
   * @returns The minimum sale price for items of this rarity, or null if none found
   */
  async getRarityFloorPrice(
    rarity: string,
    collectionSlug: string = 'off-the-grid'
  ): Promise<{ floorPriceGUN: number | null; listingsCount: number }> {
    try {
      // Fetch recent sales for the collection
      const recentSales = await this.getCollectionSaleEvents(collectionSlug, undefined, 50);

      if (recentSales.length === 0) {
        if (DEBUG) {
          console.log(`[getRarityFloorPrice] No recent sales found for ${collectionSlug}`);
        }
        return { floorPriceGUN: null, listingsCount: 0 };
      }

      const rarityLower = rarity.toLowerCase();
      const matchingPrices: number[] = [];

      // Track unique tokenIds to avoid redundant trait fetches (rate limit protection)
      const enrichedTokenIds = new Set<string>();
      const MAX_TRAIT_FETCHES = 20;

      for (const sale of recentSales) {
        // Skip sales with no price
        const effectivePrice = sale.priceGUN > 0 ? sale.priceGUN : sale.priceWGUN;
        if (effectivePrice <= 0) continue;

        // Skip if we've already processed too many unique tokens
        if (enrichedTokenIds.size >= MAX_TRAIT_FETCHES && !enrichedTokenIds.has(sale.tokenId)) {
          continue;
        }
        enrichedTokenIds.add(sale.tokenId);

        // Get rarity from traits
        let saleRarity: string | null = null;

        // First check if traits were already available (unlikely with OpenSea v2)
        if (sale.nftTraits) {
          saleRarity =
            sale.nftTraits['RARITY'] ||
            sale.nftTraits['Rarity'] ||
            sale.nftTraits['rarity'] ||
            null;
        }

        // Enrich with traits via Get NFT endpoint if needed
        if (!saleRarity && sale.tokenId && sale.contract) {
          const traits = await this.fetchNFTTraits(sale.contract, sale.tokenId);
          if (traits) {
            saleRarity =
              traits['RARITY'] ||
              traits['Rarity'] ||
              traits['rarity'] ||
              null;
          }
        }

        if (saleRarity?.toLowerCase() === rarityLower) {
          matchingPrices.push(effectivePrice);
        }
      }

      if (DEBUG) {
        console.log(`[getRarityFloorPrice] Found ${matchingPrices.length} sales matching rarity "${rarity}"`);
      }

      if (matchingPrices.length === 0) {
        return { floorPriceGUN: null, listingsCount: 0 };
      }

      return {
        floorPriceGUN: Math.min(...matchingPrices),
        listingsCount: matchingPrices.length,
      };
    } catch (error) {
      console.warn(`Error fetching rarity floor price for ${rarity}:`, error);
      return { floorPriceGUN: null, listingsCount: 0 };
    }
  }

  /**
   * Build a floor price table for ALL rarity tiers at once.
   * More efficient than calling getRarityFloorPrice() per tier — fetches sales
   * once and groups by rarity.
   *
   * Returns: { floors: Record<string, number>, salesCount: Record<string, number>, updatedAt: string }
   */
  async getRarityFloorTable(
    collectionSlug: string = 'off-the-grid'
  ): Promise<{
    floors: Record<string, number>;
    salesCount: Record<string, number>;
    updatedAt: string;
  }> {
    const floors: Record<string, number> = {};
    const salesCount: Record<string, number> = {};
    const updatedAt = new Date().toISOString();

    try {
      const recentSales = await this.getCollectionSaleEvents(collectionSlug, undefined, 50);
      if (recentSales.length === 0) {
        return { floors, salesCount, updatedAt };
      }

      // Group prices by rarity tier (enrich with traits as needed)
      const pricesByRarity: Record<string, number[]> = {};
      const enrichedTokenIds = new Set<string>();
      const MAX_TRAIT_FETCHES = 25;

      for (const sale of recentSales) {
        const effectivePrice = sale.priceGUN > 0 ? sale.priceGUN : sale.priceWGUN;
        if (effectivePrice <= 0) continue;

        if (enrichedTokenIds.size >= MAX_TRAIT_FETCHES && !enrichedTokenIds.has(sale.tokenId)) {
          continue;
        }
        enrichedTokenIds.add(sale.tokenId);

        let saleRarity: string | null = null;

        if (sale.nftTraits) {
          saleRarity = sale.nftTraits['RARITY'] || sale.nftTraits['Rarity'] || sale.nftTraits['rarity'] || null;
        }

        if (!saleRarity && sale.tokenId && sale.contract) {
          const traits = await this.fetchNFTTraits(sale.contract, sale.tokenId);
          if (traits) {
            saleRarity = traits['RARITY'] || traits['Rarity'] || traits['rarity'] || null;
          }
        }

        if (saleRarity) {
          // Normalize to title case (Epic, Rare, Uncommon, Common)
          const normalized = saleRarity.charAt(0).toUpperCase() + saleRarity.slice(1).toLowerCase();
          if (!pricesByRarity[normalized]) pricesByRarity[normalized] = [];
          pricesByRarity[normalized].push(effectivePrice);
        }
      }

      // Compute floor (min price) for each tier
      for (const [rarity, prices] of Object.entries(pricesByRarity)) {
        floors[rarity] = Math.min(...prices);
        salesCount[rarity] = prices.length;
      }

      if (DEBUG) {
        console.log('[getRarityFloorTable] Floors:', floors, 'Sales:', salesCount);
      }
    } catch (error) {
      console.warn('Error building rarity floor table:', error);
    }

    return { floors, salesCount, updatedAt };
  }

  /**
   * Build a lookup table of per-item-name median sale prices from recent sales.
   * Groups by "itemName::rarity" key. Server-cached for 2 hours.
   *
   * Returns: { items: Record<string, { medianGun, minGun, saleCount, rarity, name }> }
   */
  async getComparableSalesTable(
    collectionSlug: string = 'off-the-grid',
    salesToFetch: number = 100
  ): Promise<{
    items: Record<string, { medianGun: number; minGun: number; saleCount: number; rarity: string; name: string }>;
    waterfall: WaterfallData;
    totalSalesAnalyzed: number;
    updatedAt: string;
  }> {
    const items: Record<string, { medianGun: number; minGun: number; saleCount: number; rarity: string; name: string }> = {};
    const waterfall: WaterfallData = { byTokenId: {}, byName: {}, bySkin: {}, byWeapon: {} };
    const updatedAt = new Date().toISOString();

    try {
      const recentSales = await this.getCollectionSaleEvents(collectionSlug, undefined, salesToFetch);
      if (recentSales.length === 0) {
        return { items, waterfall, totalSalesAnalyzed: 0, updatedAt };
      }

      const now = Date.now();

      // Group by item name + rarity (existing logic)
      const pricesByItem: Record<string, { prices: number[]; rarity: string; name: string }> = {};

      // Waterfall groupings (new)
      const waterfallByTokenId: Record<string, { price: number; daysAgo: number }[]> = {};
      const waterfallByName: Record<string, { price: number; daysAgo: number }[]> = {};
      const waterfallBySkin: Record<string, { price: number; daysAgo: number }[]> = {};
      const waterfallByWeapon: Record<string, { price: number; daysAgo: number }[]> = {};

      const enrichedTokenIds = new Set<string>();
      const MAX_TRAIT_FETCHES = 30;

      for (const sale of recentSales) {
        const effectivePrice = sale.priceGUN > 0 ? sale.priceGUN : sale.priceWGUN;
        if (effectivePrice <= 0) continue;

        const name = (sale.nftName || '').trim();
        if (!name) continue;

        const daysAgo = Math.max(0, (now - sale.eventTimestamp.getTime()) / (1000 * 60 * 60 * 24));

        // Get rarity via trait enrichment
        if (enrichedTokenIds.size >= MAX_TRAIT_FETCHES && !enrichedTokenIds.has(sale.tokenId)) {
          continue;
        }
        enrichedTokenIds.add(sale.tokenId);

        let rarity: string | null = null;
        if (sale.nftTraits) {
          rarity = sale.nftTraits['RARITY'] || sale.nftTraits['Rarity'] || sale.nftTraits['rarity'] || null;
        }
        if (!rarity && sale.tokenId && sale.contract) {
          const traits = await this.fetchNFTTraits(sale.contract, sale.tokenId);
          if (traits) {
            rarity = traits['RARITY'] || traits['Rarity'] || traits['rarity'] || null;
          }
        }
        if (!rarity) continue;

        const normalized = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
        const key = `${name}::${normalized}`;
        if (!pricesByItem[key]) {
          pricesByItem[key] = { prices: [], rarity: normalized, name };
        }
        pricesByItem[key].prices.push(effectivePrice);

        // --- Waterfall groupings ---
        const saleEntry = { price: effectivePrice, daysAgo };

        // Tier 1: by tokenId
        const tokenKey = sale.tokenId;
        if (tokenKey) {
          if (!waterfallByTokenId[tokenKey]) waterfallByTokenId[tokenKey] = [];
          waterfallByTokenId[tokenKey].push(saleEntry);
        }

        // Tier 2: by baseName
        if (!waterfallByName[name]) waterfallByName[name] = [];
        waterfallByName[name].push(saleEntry);

        // Tier 3 & 4: by skin design and weapon (for skins only)
        const parsed = parseItemName(name);
        if (parsed.isSkin && parsed.skinDesign) {
          if (!waterfallBySkin[parsed.skinDesign]) waterfallBySkin[parsed.skinDesign] = [];
          waterfallBySkin[parsed.skinDesign].push(saleEntry);
        }
        if (parsed.weapon) {
          if (!waterfallByWeapon[parsed.weapon]) waterfallByWeapon[parsed.weapon] = [];
          waterfallByWeapon[parsed.weapon].push(saleEntry);
        }
      }

      // Compute median and min for each item (existing)
      for (const [key, data] of Object.entries(pricesByItem)) {
        const sorted = [...data.prices].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
        items[key] = {
          medianGun: median,
          minGun: sorted[0],
          saleCount: sorted.length,
          rarity: data.rarity,
          name: data.name,
        };
      }

      // Build waterfall entries
      for (const [key, sales] of Object.entries(waterfallByTokenId)) {
        waterfall.byTokenId[key] = buildWaterfallEntry(sales);
      }
      for (const [key, sales] of Object.entries(waterfallByName)) {
        waterfall.byName[key] = buildWaterfallEntry(sales);
      }
      for (const [key, sales] of Object.entries(waterfallBySkin)) {
        waterfall.bySkin[key] = buildWaterfallEntry(sales);
      }
      for (const [key, sales] of Object.entries(waterfallByWeapon)) {
        waterfall.byWeapon[key] = buildWaterfallEntry(sales);
      }

      if (DEBUG) {
        console.log(`[getComparableSalesTable] Built table with ${Object.keys(items).length} items, waterfall: ${Object.keys(waterfall.byTokenId).length} tokens, ${Object.keys(waterfall.byName).length} names, ${Object.keys(waterfall.bySkin).length} skins, ${Object.keys(waterfall.byWeapon).length} weapons from ${recentSales.length} sales`);
      }
    } catch (error) {
      console.warn('Error building comparable sales table:', error);
    }

    return { items, waterfall, totalSalesAnalyzed: salesToFetch, updatedAt };
  }

  /**
   * Find recent sales of similar items for valuation
   *
   * Strategy:
   * 1. Fetch recent sales and enrich with traits via Get NFT endpoint
   * 2. Try to find exact matches (same name + same rarity)
   * 3. If none found, fallback to rarity-only matches (any item with same rarity)
   * 4. Return sorted by most recent first
   */
  async getComparableSales(
    nftName: string,
    rarity: string,
    collectionSlug: string = 'off-the-grid',
    daysBack: number = 30,
    limit: number = 20
  ): Promise<ComparableSale[]> {
    try {
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);

      // Fetch more events than limit to account for filtering
      const events = await this.getCollectionSaleEvents(
        collectionSlug,
        afterDate,
        limit * 10 // Fetch 10x to ensure enough after filtering
      );

      if (DEBUG) {
        console.log(`[getComparableSales] Fetched ${events.length} events for ${nftName} (${rarity})`);
      }

      // Normalize for comparison
      const nameLower = nftName.toLowerCase().trim();
      const rarityLower = rarity.toLowerCase().trim();

      const exactMatches: ComparableSale[] = [];
      const rarityOnlyMatches: ComparableSale[] = [];

      // Track unique tokenIds to avoid redundant trait fetches (rate limit protection)
      const enrichedTokenIds = new Set<string>();
      const MAX_TRAIT_FETCHES = 20;

      for (const event of events) {
        // Skip events with no price
        if (!event.priceGUN || event.priceGUN <= 0) {
          // Also check priceWGUN as fallback
          if (!event.priceWGUN || event.priceWGUN <= 0) {
            continue;
          }
        }

        const effectivePrice = event.priceGUN > 0 ? event.priceGUN : event.priceWGUN;

        // Skip if we've already processed too many unique tokens (rate limit protection)
        if (enrichedTokenIds.size >= MAX_TRAIT_FETCHES && !enrichedTokenIds.has(event.tokenId)) {
          continue;
        }
        enrichedTokenIds.add(event.tokenId);

        // Extract rarity from traits (check multiple possible keys)
        let eventRarity: string | null = null;

        // First check if traits were already available (unlikely with OpenSea v2)
        if (event.nftTraits) {
          eventRarity =
            event.nftTraits['RARITY'] ||
            event.nftTraits['Rarity'] ||
            event.nftTraits['rarity'] ||
            event.nftTraits['Tier'] ||
            event.nftTraits['tier'] ||
            null;
        }

        // Enrich with traits via Get NFT endpoint if needed
        if (!eventRarity && event.tokenId && event.contract) {
          const traits = await this.fetchNFTTraits(event.contract, event.tokenId);
          if (traits) {
            eventRarity =
              traits['RARITY'] ||
              traits['Rarity'] ||
              traits['rarity'] ||
              traits['Tier'] ||
              traits['tier'] ||
              null;
          }
        }

        if (DEBUG && !eventRarity) {
          console.log(`[getComparableSales] No rarity found for token ${event.tokenId}`);
        }

        const eventRarityLower = eventRarity?.toLowerCase().trim() || '';
        const eventNameLower = (event.nftName || '').toLowerCase().trim();

        // Check for rarity match
        const rarityMatches = eventRarityLower === rarityLower;

        // Check for name match (allow partial/contains match for robustness)
        const exactNameMatch = eventNameLower === nameLower;
        const partialNameMatch =
          eventNameLower.includes(nameLower) || nameLower.includes(eventNameLower);

        const comparableSale: ComparableSale = {
          tokenId: event.tokenId,
          nftName: event.nftName,
          rarity: eventRarity || rarity,
          salePriceGUN: effectivePrice,
          saleDate: event.eventTimestamp,
          buyerAddress: event.buyerAddress,
          sellerAddress: event.sellerAddress,
        };

        if (rarityMatches && (exactNameMatch || partialNameMatch)) {
          exactMatches.push(comparableSale);
        } else if (rarityMatches) {
          rarityOnlyMatches.push(comparableSale);
        }
      }

      if (DEBUG) {
        console.log(`[getComparableSales] Found ${exactMatches.length} exact matches, ${rarityOnlyMatches.length} rarity-only matches`);
      }

      // Use exact matches if available, otherwise fallback to rarity-only
      let results = exactMatches.length > 0 ? exactMatches : rarityOnlyMatches;

      // Sort by most recent first
      results.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());

      // Limit results
      results = results.slice(0, limit);

      if (DEBUG) {
        console.log(`[getComparableSales] Returning ${results.length} comparable sales`);
      }

      return results;
    } catch (error) {
      console.warn('Error fetching comparable sales from OpenSea:', error);
      return [];
    }
  }

  // ===========================================================================
  // Scarcity / Collection Trait Methods
  // ===========================================================================

  /**
   * Fetch trait value counts for the OTG collection.
   * Single API call — returns exact counts across ~22.9M indexed items.
   */
  async getCollectionTraits(
    collectionSlug: string = 'off-the-grid'
  ): Promise<{ weaponTypes: Record<string, number>; qualities: Record<string, number>; classes: Record<string, number> }> {
    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      const response = await fetchGet(
        `${OPENSEA_API_BASE}/traits/${collectionSlug}`,
        { headers }
      );

      const counts = response.data?.counts || {};

      // "Type" trait = weapon subtypes (AssaultRifle, SniperRifle, etc.)
      const weaponTypes: Record<string, number> = {};
      if (counts['Type']) {
        for (const [key, val] of Object.entries(counts['Type'])) {
          if (key !== 'None') weaponTypes[key] = val as number;
        }
      }

      const qualities: Record<string, number> = counts['Rarity'] || {};

      // Normalize duplicate class keys (e.g. "WeaponSkin" → "Weapon Skin")
      const rawClasses = counts['Class'] || {};
      const classes: Record<string, number> = {};
      for (const [key, val] of Object.entries(rawClasses)) {
        const normalized = key.replace(/([a-z])([A-Z])/g, '$1 $2');
        classes[normalized] = (classes[normalized] || 0) + (val as number);
      }

      return { weaponTypes, qualities, classes };
    } catch (error) {
      console.warn('[OpenSea] Error fetching collection traits:', error);
      return { weaponTypes: {}, qualities: {}, classes: {} };
    }
  }

  /**
   * Fetch active listings for the collection, grouped by item name.
   * Also enriches with recent sales data.
   */
  async getActiveListingsByItem(
    collectionSlug: string = 'off-the-grid',
    maxPages: number = 30
  ): Promise<Array<{ itemName: string; imageUrl: string | null; listingCount: number; floorPriceGun: number; quality: string | null }>> {
    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      // Phase 1: Collect raw per-token listings from OpenSea
      const rawListings: Array<{ tokenId: string; priceGun: number; name: string | null; imageUrl: string | null }> = [];
      let cursor: string | null = null;
      let page = 0;

      do {
        const params: Record<string, string | number> = { limit: 100 };
        if (cursor) params.next = cursor;

        const response = await fetchGet(
          `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/all`,
          { headers, params }
        );

        const listings = response.data?.listings || [];
        cursor = response.data?.next || null;
        page++;

        for (const listing of listings) {
          const orderPrice = listing.price?.current?.value;
          const orderDecimals = listing.price?.current?.decimals ?? 18;
          let priceGun = 0;
          if (orderPrice) {
            priceGun = parseFloat(orderPrice) / Math.pow(10, orderDecimals);
          }

          const asset = listing.maker_asset_bundle?.assets?.[0];
          const tokenId = listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;
          const name = asset?.name || null;
          const imageUrl = asset?.image_url || null;

          if (priceGun > 0 && tokenId) {
            rawListings.push({ tokenId, priceGun, name, imageUrl });
          }
        }

        if (listings.length === 0) break;
      } while (cursor && page < maxPages);

      // Phase 2: Resolve unresolved token IDs via GunzScan
      const unresolvedTokenIds = [...new Set(
        rawListings.filter((l) => !l.name).map((l) => l.tokenId)
      )];

      const nftContract = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
      const resolvedMap = await resolveTokenMetadata(nftContract, unresolvedTokenIds);

      // Phase 3: Group by resolved name
      const itemMap = new Map<string, { count: number; minPrice: number; imageUrl: string | null; quality: string | null }>();

      for (const listing of rawListings) {
        const resolved = resolvedMap.get(listing.tokenId);
        const name = listing.name || resolved?.name || `Token #${listing.tokenId}`;
        const imageUrl = listing.imageUrl || resolved?.imageUrl || null;
        const quality = resolved?.quality || null;

        const existing = itemMap.get(name);
        if (existing) {
          existing.count++;
          existing.minPrice = Math.min(existing.minPrice, listing.priceGun);
          if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
          if (!existing.quality && quality) existing.quality = quality;
        } else {
          itemMap.set(name, { count: 1, minPrice: listing.priceGun, imageUrl, quality });
        }
      }

      return Array.from(itemMap.entries())
        .map(([itemName, data]) => ({
          itemName,
          imageUrl: data.imageUrl,
          listingCount: data.count,
          floorPriceGun: data.minPrice,
          quality: data.quality,
        }))
        .sort((a, b) => a.listingCount - b.listingCount);
    } catch (error) {
      console.warn('[OpenSea] Error fetching active listings:', error);
      return [];
    }
  }

  /**
   * Fetch active listings with full per-listing detail (price, seller, tokenId).
   * Same pagination + GunzScan resolution as getActiveListingsByItem, but preserves
   * individual listings per item group instead of aggregating to count + floor.
   */
  async getActiveListingsDetailed(
    collectionSlug: string = 'off-the-grid',
    maxPages: number = 30
  ): Promise<Array<{
    itemName: string;
    imageUrl: string | null;
    floorPriceGun: number;
    listingCount: number;
    listings: Array<{
      tokenId: string;
      priceGun: number;
      itemName: string;
      imageUrl: string | null;
      sellerAddress: string;
      orderHash: string;
    }>;
  }>> {
    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      // Phase 1: Collect raw per-token listings from OpenSea
      const rawListings: Array<{
        tokenId: string;
        priceGun: number;
        name: string | null;
        imageUrl: string | null;
        sellerAddress: string;
        orderHash: string;
      }> = [];
      let cursor: string | null = null;
      let page = 0;

      do {
        const params: Record<string, string | number> = { limit: 100 };
        if (cursor) params.next = cursor;

        const response = await fetchGet(
          `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}/all`,
          { headers, params }
        );

        const listings = response.data?.listings || [];
        cursor = response.data?.next || null;
        page++;

        for (const listing of listings) {
          const orderPrice = listing.price?.current?.value;
          const orderDecimals = listing.price?.current?.decimals ?? 18;
          let priceGun = 0;
          if (orderPrice) {
            priceGun = parseFloat(orderPrice) / Math.pow(10, orderDecimals);
          }

          const asset = listing.maker_asset_bundle?.assets?.[0];
          const tokenId = listing.protocol_data?.parameters?.offer?.[0]?.identifierOrCriteria;
          const name = asset?.name || null;
          const imageUrl = asset?.image_url || null;
          const sellerAddress = listing.protocol_data?.parameters?.offerer || '';
          const orderHash = listing.order_hash || '';

          if (priceGun > 0 && tokenId) {
            rawListings.push({ tokenId, priceGun, name, imageUrl, sellerAddress, orderHash });
          }
        }

        if (listings.length === 0) break;
      } while (cursor && page < maxPages);

      // Phase 2: Resolve unresolved token IDs via GunzScan
      const unresolvedTokenIds = [...new Set(
        rawListings.filter((l) => !l.name).map((l) => l.tokenId)
      )];

      const nftContract = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
      const resolvedMap = await resolveTokenMetadata(nftContract, unresolvedTokenIds);

      // Phase 3: Group by resolved name, keeping individual listings
      const itemMap = new Map<string, {
        imageUrl: string | null;
        listings: Array<{
          tokenId: string;
          priceGun: number;
          itemName: string;
          imageUrl: string | null;
          sellerAddress: string;
          orderHash: string;
        }>;
      }>();

      for (const listing of rawListings) {
        const resolved = resolvedMap.get(listing.tokenId);
        const name = listing.name || resolved?.name || `Token #${listing.tokenId}`;
        const imageUrl = listing.imageUrl || resolved?.imageUrl || null;

        const existing = itemMap.get(name);
        const detailedListing = {
          tokenId: listing.tokenId,
          priceGun: listing.priceGun,
          itemName: name,
          imageUrl,
          sellerAddress: listing.sellerAddress,
          orderHash: listing.orderHash,
        };

        if (existing) {
          existing.listings.push(detailedListing);
          if (!existing.imageUrl && imageUrl) existing.imageUrl = imageUrl;
        } else {
          itemMap.set(name, { imageUrl, listings: [detailedListing] });
        }
      }

      return Array.from(itemMap.entries())
        .map(([itemName, data]) => {
          // Sort listings within each group cheapest first
          data.listings.sort((a, b) => a.priceGun - b.priceGun);
          return {
            itemName,
            imageUrl: data.imageUrl,
            floorPriceGun: data.listings[0]?.priceGun ?? 0,
            listingCount: data.listings.length,
            listings: data.listings,
          };
        })
        .sort((a, b) => a.listingCount - b.listingCount);
    } catch (error) {
      console.warn('[OpenSea] Error fetching detailed listings:', error);
      return [];
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Parse a raw OpenSea event into a SaleEvent
   *
   * Note: On GunzChain, OpenSea may use different payment symbols.
   * We accept GUN, WGUN, or native token (zero address) as GUN payments.
   */
  private parseSaleEvent(event: any): SaleEvent {
    const payment = event.payment || {};
    const decimals = payment.decimals || 18;
    const quantity = payment.quantity || '0';

    // Convert from wei to token amount
    const priceRaw = parseFloat(quantity) / Math.pow(10, decimals);
    const symbol = (payment.symbol || '').toUpperCase();
    const tokenAddress = (payment.token_address || '').toLowerCase();

    if (DEBUG) {
      console.log('[parseSaleEvent] Payment:', {
        symbol,
        quantity,
        decimals,
        token_address: tokenAddress,
        priceRaw,
      });
    }

    // GunzChain: accept GUN, WGUN, or native token payment as GUN price
    // Native token has zero address: 0x0000000000000000000000000000000000000000
    // OpenSea may use different symbols for the same token
    const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000';
    const isGunPayment = symbol === 'GUN' || symbol === '' || isNativeToken;
    const isWgunPayment = symbol === 'WGUN';

    // OpenSea API returns event_timestamp as Unix seconds (number).
    // Convert safely: numbers < 10B are seconds, >= 10B are milliseconds.
    const rawTs = event.event_timestamp;
    const tsMs = typeof rawTs === 'number'
      ? (rawTs < 10_000_000_000 ? rawTs * 1000 : rawTs)
      : new Date(rawTs).getTime();
    const eventTimestamp = new Date(isNaN(tsMs) ? Date.now() : tsMs);

    return {
      eventTimestamp,
      priceGUN: isGunPayment ? priceRaw : 0,
      priceWGUN: isWgunPayment ? priceRaw : 0,
      sellerAddress: event.seller || event.from_account?.address || '',
      buyerAddress: event.buyer || event.to_account?.address || '',
      txHash: event.transaction || event.transaction_hash || '',
      marketplace: 'opensea',
    };
  }

  /**
   * Parse a raw OpenSea event into a CollectionSaleEvent
   *
   * Note: OpenSea v2 events do NOT include traits in the nft object.
   * Traits must be fetched separately via the Get NFT endpoint.
   */
  private parseCollectionSaleEvent(event: any): CollectionSaleEvent {
    const baseEvent = this.parseSaleEvent(event);
    const nft = event.nft || {};

    if (DEBUG) {
      console.log('[parseCollectionSaleEvent] NFT data:', {
        identifier: nft.identifier,
        name: nft.name,
        contract: nft.contract,
        hasTraits: !!nft.traits,
        traitCount: nft.traits?.length ?? 0,
      });
    }

    // Parse traits into a Record<string, string>
    // Note: This will almost always be null because OpenSea v2 events don't include traits
    let nftTraits: Record<string, string> | null = null;
    if (nft.traits && Array.isArray(nft.traits)) {
      nftTraits = {};
      for (const trait of nft.traits) {
        if (trait.trait_type && trait.value !== undefined) {
          nftTraits[trait.trait_type] = String(trait.value);
        }
      }
    }

    return {
      ...baseEvent,
      tokenId: nft.identifier || nft.token_id || '',
      nftName: nft.name || '',
      nftTraits,
      contract: nft.contract || '',
    };
  }

  /**
   * Fetch traits for a specific NFT via Get NFT endpoint.
   * This is the ONLY OpenSea v2 endpoint that returns trait data.
   * Results are cached to avoid redundant API calls.
   *
   * @param contract - NFT contract address
   * @param identifier - Token ID
   * @param chain - Chain name (default: 'avalanche')
   * @returns Trait map or null if unavailable
   */
  async fetchNFTTraits(
    contract: string,
    identifier: string,
    chain: string = 'avalanche'
  ): Promise<Record<string, string> | null> {
    const mappedChain = toOpenSeaChain(chain);
    const cacheKey = `${mappedChain}:${contract.toLowerCase()}:${identifier}`;

    // Check cache first
    const cached = getCachedTraits(cacheKey);
    if (cached !== undefined) {
      if (DEBUG) {
        console.log(`[fetchNFTTraits] Cache hit for ${identifier}: ${cached ? 'has traits' : 'no traits'}`);
      }
      return cached;
    }

    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      const response = await fetchGet(
        `${OPENSEA_API_BASE}/chain/${mappedChain}/contract/${contract}/nfts/${identifier}`,
        { headers }
      );

      const traits = response.data?.nft?.traits;
      if (traits && Array.isArray(traits)) {
        const traitMap: Record<string, string> = {};
        for (const t of traits) {
          if (t.trait_type && t.value !== undefined) {
            traitMap[t.trait_type] = String(t.value);
          }
        }

        if (DEBUG) {
          console.log(`[fetchNFTTraits] Fetched ${Object.keys(traitMap).length} traits for ${identifier}`);
        }

        setCachedTraits(cacheKey, traitMap);
        return traitMap;
      }

      setCachedTraits(cacheKey, null);
      return null;
    } catch (error) {
      console.warn(`[fetchNFTTraits] Failed for ${identifier}:`, error);
      setCachedTraits(cacheKey, null);
      return null;
    }
  }
}
