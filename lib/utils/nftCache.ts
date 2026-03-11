// NFT enrichment data cache using localStorage
// Supports namespaced keys, schema versioning, and TTL-based expiry

import type { AcquisitionVenue, NFT } from '../types';

// =============================================================================
// Schema Versions - Increment when cache structure changes
// =============================================================================
const SCHEMA_VERSIONS = {
  nftDetail: 'v25', // v25: Fix Seaport v1.6 OrderFulfilled ABI decoding — batch purchase prices were tx.value instead of per-item
  transfers: 'v2',
  priceGunUsd: 'v1',
  metadata: 'v1', // v1: NFT metadata cache (name, image, traits, mintNumber)
} as const;

// Stale threshold for incomplete cache entries (10 minutes)
export const INCOMPLETE_CACHE_STALE_MS = 10 * 60 * 1000;

// Listing prices go stale faster than acquisition data (4 hours)
export const LISTING_STALE_MS = 4 * 60 * 60 * 1000;

// =============================================================================
// Cache Configuration
// =============================================================================
const CACHE_NAMESPACE = 'gunzscope';
const DEFAULT_TTL_SECONDS = 72 * 60 * 60; // 72 hours — must match ENRICHMENT_STALE_MS in PortfolioClient.tsx

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// =============================================================================
// Generic Cache Entry Structure
// =============================================================================
interface CacheEntry<T> {
  schemaVersion: string;
  data: T;
  cachedAt: number;
  expiresAt: number;
}

// =============================================================================
// Cache Result Type
// =============================================================================
export interface CacheResult<T> {
  hit: boolean;
  value?: T;
  cacheKey: string;
  reason?: 'expired' | 'version_mismatch' | 'not_found' | 'parse_error';
}

// =============================================================================
// Generic Cache Helpers
// =============================================================================

/**
 * Get a value from cache with type safety
 * Returns { hit: true, value } on cache hit, { hit: false, reason } on miss
 */
export function cacheGet<T>(
  fullKey: string,
  expectedVersion: string
): CacheResult<T> {
  if (!isBrowser) {
    return { hit: false, cacheKey: fullKey, reason: 'not_found' };
  }

  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) {
      return { hit: false, cacheKey: fullKey, reason: 'not_found' };
    }

    const entry = JSON.parse(raw) as CacheEntry<T>;

    // Check schema version
    if (entry.schemaVersion !== expectedVersion) {
      // Remove stale entry
      localStorage.removeItem(fullKey);
      return { hit: false, cacheKey: fullKey, reason: 'version_mismatch' };
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      // Remove expired entry
      localStorage.removeItem(fullKey);
      return { hit: false, cacheKey: fullKey, reason: 'expired' };
    }

    return { hit: true, value: entry.data, cacheKey: fullKey };
  } catch {
    // Remove corrupted entry
    try {
      localStorage.removeItem(fullKey);
    } catch {
      // Ignore cleanup errors
    }
    return { hit: false, cacheKey: fullKey, reason: 'parse_error' };
  }
}

/**
 * Set a value in cache with TTL
 */
export function cacheSet<T>(
  fullKey: string,
  schemaVersion: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): void {
  if (!isBrowser) return;

  try {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      schemaVersion,
      data: value,
      cachedAt: now,
      expiresAt: now + ttlSeconds * 1000,
    };
    localStorage.setItem(fullKey, JSON.stringify(entry));
  } catch (error) {
    console.error('Error saving to cache:', fullKey, error);
  }
}

/**
 * Remove a specific cache entry
 */
export function cacheRemove(fullKey: string): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(fullKey);
  } catch {
    // Ignore errors
  }
}

// =============================================================================
// Key Builders
// =============================================================================

/**
 * Build a token key string from chain, contract, and tokenId
 */
export function buildTokenKey(
  chain: string,
  contractAddress: string,
  tokenId: string
): string {
  return `${chain}:${contractAddress.toLowerCase()}:${tokenId}`;
}

/**
 * Build cache key for NFT detail data
 * Format: gunzscope:nft:detail:v2:${walletAddress}:${tokenKey}
 */
export function buildNftDetailCacheKey(
  walletAddress: string,
  tokenKey: string
): string {
  return `${CACHE_NAMESPACE}:nft:detail:${SCHEMA_VERSIONS.nftDetail}:${walletAddress.toLowerCase()}:${tokenKey}`;
}

/**
 * Build cache key for transfer history
 * Format: gunzscope:nft:transfers:v2:${walletAddress}:${tokenKey}
 */
export function buildTransfersCacheKey(
  walletAddress: string,
  tokenKey: string
): string {
  return `${CACHE_NAMESPACE}:nft:transfers:${SCHEMA_VERSIONS.transfers}:${walletAddress.toLowerCase()}:${tokenKey}`;
}

/**
 * Build cache key for GUN/USD price
 * Format: gunzscope:price:gunusd:v1:${YYYY-MM-DD-HH} (hourly bucket)
 */
export function buildPriceCacheKey(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  return `${CACHE_NAMESPACE}:price:gunusd:${SCHEMA_VERSIONS.priceGunUsd}:${yyyy}-${mm}-${dd}-${hh}`;
}

/**
 * Build cache key for historical price on a specific date
 * Format: gunzscope:price:gunusd:v1:historical:${YYYY-MM-DD}
 */
export function buildHistoricalPriceCacheKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${CACHE_NAMESPACE}:price:gunusd:${SCHEMA_VERSIONS.priceGunUsd}:historical:${yyyy}-${mm}-${dd}`;
}

/**
 * Build cache key for NFT metadata
 * Format: gunzscope:nft:meta:v1:${chain}:${contract}:${tokenId}
 */
export function buildMetadataCacheKey(
  chain: string,
  contractAddress: string,
  tokenId: string
): string {
  return `${CACHE_NAMESPACE}:nft:meta:${SCHEMA_VERSIONS.metadata}:${chain}:${contractAddress.toLowerCase()}:${tokenId}`;
}

// =============================================================================
// NFT Detail Cache Types
// =============================================================================

export interface CachedNFTDetailData {
  quantity?: number;
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchaseDate?: string; // ISO string
  transferredFrom?: string;
  isFreeTransfer?: boolean;
  acquisitionVenue?: AcquisitionVenue;
  acquisitionTxHash?: string;
  // v8: Track whether acquisition data was successfully fetched
  hasAcquisition?: boolean; // true = acquisition data is complete, false/undefined = incomplete
  // v9: Track whether marketplace price was fetched (separate from blockchain acquisition)
  hasMarketplacePrice?: boolean; // true = marketplace price lookup was attempted
  priceSource?: 'blockchain' | 'marketplace'; // Where purchasePriceGun came from
  cachedAtIso?: string; // ISO timestamp when this entry was cached
  // v10: Per-item listing prices from OpenSea (Phase 1 of valuation gap fix)
  currentLowestListing?: number;  // Lowest active listing in GUN
  currentHighestListing?: number; // Highest active listing in GUN
  listingFetchedAt?: string;      // ISO timestamp of listing fetch
  // Offer fill detection
  isOfferFill?: boolean;          // True when acquired via a pre-signed OpenSea offer (wGUN)
  // v11: Self-transfer vs gift classification
  transferType?: 'self' | 'gift'; // 'self' = between user's own wallets, 'gift' = from external wallet
  // v21: Track whether purchasePriceUsd used an estimated historical GUN price
  purchasePriceUsdEstimated?: boolean;
}

export interface CachedTransferData {
  purchasePriceGun?: number;
  purchaseDate?: string; // ISO string
  transferredFrom?: string;
  isFreeTransfer?: boolean;
}

export type HistoricalPriceSource = 'coingecko' | 'defillama' | 'estimated';
export type PriceConfidence = 'exact' | 'daily' | 'estimated';

export interface CachedPriceData {
  gunUsdRate: number;
  timestamp: string; // ISO string
  source?: HistoricalPriceSource;
  confidence?: PriceConfidence;
}

/**
 * Cached NFT metadata - prevents re-fetching metadata on every page load
 * This is separate from acquisition data (which is wallet-specific)
 */
export interface CachedMetadataData {
  name: string;
  description?: string;
  image: string;
  imageHires?: string; // High-res image URL from OpenSea CDN
  traits?: Record<string, string>;
  mintNumber?: string;
}

// =============================================================================
// Typed Cache Functions for NFT Details
// =============================================================================

/**
 * Get cached NFT detail data for a specific token
 */
export function getCachedNFTDetail(
  walletAddress: string,
  tokenKey: string
): CacheResult<CachedNFTDetailData> {
  const fullKey = buildNftDetailCacheKey(walletAddress, tokenKey);
  return cacheGet<CachedNFTDetailData>(fullKey, SCHEMA_VERSIONS.nftDetail);
}

/**
 * Set cached NFT detail data
 */
export function setCachedNFTDetail(
  walletAddress: string,
  tokenKey: string,
  data: CachedNFTDetailData,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): void {
  const fullKey = buildNftDetailCacheKey(walletAddress, tokenKey);
  cacheSet(fullKey, SCHEMA_VERSIONS.nftDetail, data, ttlSeconds);
}

/**
 * Get cached transfer data
 */
export function getCachedTransfers(
  walletAddress: string,
  tokenKey: string
): CacheResult<CachedTransferData> {
  const fullKey = buildTransfersCacheKey(walletAddress, tokenKey);
  return cacheGet<CachedTransferData>(fullKey, SCHEMA_VERSIONS.transfers);
}

/**
 * Set cached transfer data
 */
export function setCachedTransfers(
  walletAddress: string,
  tokenKey: string,
  data: CachedTransferData,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): void {
  const fullKey = buildTransfersCacheKey(walletAddress, tokenKey);
  cacheSet(fullKey, SCHEMA_VERSIONS.transfers, data, ttlSeconds);
}

/**
 * Get cached GUN/USD price
 */
export function getCachedGunPrice(): CacheResult<CachedPriceData> {
  const fullKey = buildPriceCacheKey();
  return cacheGet<CachedPriceData>(fullKey, SCHEMA_VERSIONS.priceGunUsd);
}

/**
 * Set cached GUN/USD price (1 hour TTL by default)
 */
export function setCachedGunPrice(
  rate: number,
  timestamp: Date,
  ttlSeconds: number = 60 * 60 // 1 hour
): void {
  const fullKey = buildPriceCacheKey();
  const data: CachedPriceData = {
    gunUsdRate: rate,
    timestamp: timestamp.toISOString(),
  };
  cacheSet(fullKey, SCHEMA_VERSIONS.priceGunUsd, data, ttlSeconds);
}

/**
 * Get cached historical GUN price for a specific date
 */
export function getCachedHistoricalGunPrice(date: Date): CacheResult<CachedPriceData> {
  const fullKey = buildHistoricalPriceCacheKey(date);
  return cacheGet<CachedPriceData>(fullKey, SCHEMA_VERSIONS.priceGunUsd);
}

/**
 * Set cached historical GUN price.
 * - 7 days TTL for confirmed sources (coingecko, defillama)
 * - 4 hours TTL for estimated prices (so they can be upgraded on next attempt)
 */
export function setCachedHistoricalGunPrice(
  date: Date,
  rate: number,
  source?: HistoricalPriceSource,
  confidence?: PriceConfidence,
  ttlSeconds?: number,
): void {
  const fullKey = buildHistoricalPriceCacheKey(date);
  const effectiveTtl = ttlSeconds ?? (confidence === 'estimated' ? 4 * 60 * 60 : 7 * 24 * 60 * 60);
  const data: CachedPriceData = {
    gunUsdRate: rate,
    timestamp: date.toISOString(),
    source,
    confidence,
  };
  cacheSet(fullKey, SCHEMA_VERSIONS.priceGunUsd, data, effectiveTtl);
}

/**
 * Find the nearest cached historical GUN price BEFORE the target date.
 * Scans localStorage for all historical price entries and returns the closest match.
 * Used as last-resort fallback when all API sources fail.
 */
export function findNearestCachedGunPrice(targetDate: Date): CachedPriceData | null {
  if (typeof window === 'undefined') return null;

  const prefix = `${CACHE_NAMESPACE}:price:gunusd:${SCHEMA_VERSIONS.priceGunUsd}:historical:`;
  const targetTime = targetDate.getTime();
  let bestMatch: CachedPriceData | null = null;
  let bestDiff = Infinity;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;

    const dateSuffix = key.slice(prefix.length); // YYYY-MM-DD
    const parsed = new Date(dateSuffix + 'T00:00:00Z');
    if (isNaN(parsed.getTime())) continue;

    const diff = targetTime - parsed.getTime();
    if (diff < 0) continue; // Skip dates after target
    if (diff >= bestDiff) continue;

    // Read the cache entry to ensure it's valid
    const result = cacheGet<CachedPriceData>(key, SCHEMA_VERSIONS.priceGunUsd);
    if (!result.hit || !result.value) continue;

    bestDiff = diff;
    bestMatch = result.value;
  }

  return bestMatch;
}

// =============================================================================
// Typed Cache Functions for NFT Metadata
// =============================================================================

/**
 * Get cached NFT metadata for a specific token
 * Metadata is token-specific (not wallet-specific) since it doesn't change per holder
 */
export function getCachedMetadata(
  chain: string,
  contractAddress: string,
  tokenId: string
): CacheResult<CachedMetadataData> {
  const fullKey = buildMetadataCacheKey(chain, contractAddress, tokenId);
  return cacheGet<CachedMetadataData>(fullKey, SCHEMA_VERSIONS.metadata);
}

/**
 * Set cached NFT metadata (7 day TTL - metadata rarely changes for game NFTs)
 */
export function setCachedMetadata(
  chain: string,
  contractAddress: string,
  tokenId: string,
  data: CachedMetadataData,
  ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days
): void {
  const fullKey = buildMetadataCacheKey(chain, contractAddress, tokenId);
  cacheSet(fullKey, SCHEMA_VERSIONS.metadata, data, ttlSeconds);
}

// =============================================================================
// Cache Completeness Helpers
// =============================================================================

/**
 * Check if a cached NFT entry needs re-enrichment.
 * Returns true if:
 * - Cache doesn't exist
 * - hasAcquisition is false/undefined (incomplete)
 * - Cache entry is older than INCOMPLETE_CACHE_STALE_MS (for incomplete entries only)
 */
export function needsReEnrichment(
  walletAddress: string,
  tokenKey: string
): { needsRetry: boolean; reason?: string } {
  const result = getCachedNFTDetail(walletAddress, tokenKey);

  if (!result.hit || !result.value) {
    return { needsRetry: true, reason: 'no_cache' };
  }

  const cached = result.value;

  // If acquisition is complete, check if pricing is also complete
  if (cached.hasAcquisition === true) {
    // Transfers and marketplace purchases with missing prices should retry —
    // the sender's purchase price may be traceable via OpenSea or RPC chain tracing
    const priceMissing =
      cached.purchasePriceGun === undefined ||
      cached.purchasePriceGun === null ||
      cached.purchasePriceGun === 0;
    const isRetryableVenue = !cached.acquisitionVenue ||
      ['opensea', 'in_game_marketplace', 'transfer'].includes(cached.acquisitionVenue);
    if (priceMissing && isRetryableVenue) {
      return { needsRetry: true, reason: 'acquisition_price_missing' };
    }
    return { needsRetry: false };
  }

  // Acquisition is incomplete - check if cache is stale
  if (cached.cachedAtIso) {
    const cachedAt = new Date(cached.cachedAtIso).getTime();
    const age = Date.now() - cachedAt;
    if (age > INCOMPLETE_CACHE_STALE_MS) {
      return { needsRetry: true, reason: `incomplete_stale_${Math.round(age / 1000)}s` };
    }
  }

  // Incomplete but not stale yet - still retry to give RPC another chance
  // (but caller may choose to use cached quantity in the meantime)
  return { needsRetry: true, reason: 'incomplete_acquisition' };
}

// =============================================================================
// Legacy Compatibility Layer (will be removed in future)
// =============================================================================

// Old cache key prefix for migration/cleanup
const LEGACY_CACHE_KEY_PREFIX = 'gunzscope_nft_cache_';

interface LegacyCachedNFTData {
  quantity?: number;
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchaseDate?: string;
  transferredFrom?: string;
  isFreeTransfer?: boolean;
  transferType?: 'self' | 'gift';
  acquisitionVenue?: AcquisitionVenue;
  acquisitionTxHash?: string;
  cachedAt: number;
  // v8 fields - added for completeness tracking
  hasAcquisition?: boolean;
  cachedAtIso?: string;
  // v9 fields - marketplace price tracking
  hasMarketplacePrice?: boolean;
  priceSource?: 'blockchain' | 'marketplace';
  // v10 fields - per-item listing prices
  currentLowestListing?: number;
  currentHighestListing?: number;
  listingFetchedAt?: string;
  // v21 fields - estimated price tracking
  purchasePriceUsdEstimated?: boolean;
}

/**
 * @deprecated Use getCachedNFTDetail instead
 * Legacy function for backward compatibility during migration
 */
export const getCachedNFT = (
  walletAddress: string,
  tokenId: string
): LegacyCachedNFTData | null => {
  if (!isBrowser) return null;

  try {
    // Use new versioned cache format only — legacy fallback removed in v22
    // to ensure schema version bumps actually invalidate stale data.
    const contractAddress = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
    const tokenKey = buildTokenKey('avalanche', contractAddress, tokenId);
    const newResult = getCachedNFTDetail(walletAddress, tokenKey);

    if (newResult.hit && newResult.value) {
      return {
        ...newResult.value,
        cachedAt: Date.now(), // Approximate - new format doesn't expose this directly
        hasAcquisition: newResult.value.hasAcquisition,
        cachedAtIso: newResult.value.cachedAtIso,
        currentLowestListing: newResult.value.currentLowestListing,
        currentHighestListing: newResult.value.currentHighestListing,
        listingFetchedAt: newResult.value.listingFetchedAt,
      };
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * @deprecated Use setCachedNFTDetail instead
 * Legacy function for backward compatibility during migration
 */
export const setCachedNFT = (
  walletAddress: string,
  tokenId: string,
  data: Omit<LegacyCachedNFTData, 'cachedAt'>
): void => {
  if (!isBrowser) return;

  // Write to new cache format
  // NFT_COLLECTION_AVALANCHE is server-side only; hardcoded fallback for production
  const contractAddress = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
  const tokenKey = buildTokenKey('avalanche', contractAddress, tokenId);

  setCachedNFTDetail(walletAddress, tokenKey, {
    quantity: data.quantity,
    purchasePriceGun: data.purchasePriceGun,
    purchasePriceUsd: data.purchasePriceUsd,
    purchaseDate: data.purchaseDate,
    transferredFrom: data.transferredFrom,
    isFreeTransfer: data.isFreeTransfer,
    transferType: data.transferType,
    acquisitionVenue: data.acquisitionVenue,
    acquisitionTxHash: data.acquisitionTxHash,
    hasAcquisition: data.hasAcquisition,
    hasMarketplacePrice: data.hasMarketplacePrice,
    priceSource: data.priceSource,
    cachedAtIso: data.cachedAtIso,
    currentLowestListing: data.currentLowestListing,
    currentHighestListing: data.currentHighestListing,
    listingFetchedAt: data.listingFetchedAt,
  });
};

/**
 * Seed localStorage cache from server-cached enriched NFTs.
 *
 * When a logged-in user loads their portfolio, the server cache provides
 * fully-enriched WalletData. However, the enrichment orchestrator only
 * checks localStorage to decide what to skip. Without seeding, a cleared
 * localStorage triggers full RPC re-scans (~45s) even though the server
 * already has the data.
 *
 * This writes each enriched NFT into localStorage so `needsReEnrichment()`
 * returns false for NFTs that already have complete acquisition data.
 */
export function seedLocalCacheFromNFTs(
  walletAddress: string,
  nfts: NFT[],
): number {
  if (!isBrowser) return 0;

  const contractAddress = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
  let seeded = 0;

  for (const nft of nfts) {
    // Only seed NFTs that have acquisition data (the expensive part to re-fetch)
    if (!nft.acquisitionVenue && !nft.purchasePriceGun && nft.purchasePriceGun !== 0) continue;

    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
    const tokenKey = buildTokenKey('avalanche', contractAddress, primaryTokenId);

    // Skip if localStorage already has a valid entry
    const existing = getCachedNFTDetail(walletAddress, tokenKey);
    if (existing.hit && existing.value?.hasAcquisition) continue;

    // Only seed purchasePriceUsd when we're confident it's a real (non-estimated) value.
    // Old server cache entries lack purchasePriceUsdEstimated — their USD values may be
    // based on the $0.0776 fallback. Omitting purchasePriceUsd forces the enrichment
    // backfill to recompute it from the correct per-date historical GUN price.
    const hasRealUsd = nft.purchasePriceUsd != null
      && nft.purchasePriceUsdEstimated === false;

    setCachedNFTDetail(walletAddress, tokenKey, {
      quantity: nft.quantity,
      purchasePriceGun: nft.purchasePriceGun,
      purchasePriceUsd: hasRealUsd ? nft.purchasePriceUsd : undefined,
      purchasePriceUsdEstimated: hasRealUsd ? false : undefined,
      purchaseDate: nft.purchaseDate
        ? (nft.purchaseDate instanceof Date ? nft.purchaseDate.toISOString() : String(nft.purchaseDate))
        : undefined,
      transferredFrom: nft.transferredFrom,
      isFreeTransfer: nft.isFreeTransfer,
      transferType: nft.transferType,
      acquisitionVenue: nft.acquisitionVenue,
      acquisitionTxHash: nft.acquisitionTxHash,
      hasAcquisition: true,
      cachedAtIso: new Date().toISOString(),
      currentLowestListing: nft.currentLowestListing,
      currentHighestListing: nft.currentHighestListing,
      listingFetchedAt: new Date().toISOString(),
    });
    seeded++;
  }

  return seeded;
}

// =============================================================================
// Cache Cleanup Utilities
// =============================================================================

/**
 * Invalidate listing prices for a wallet without destroying acquisition data.
 * Clears `listingFetchedAt` on each cached NFT so the enrichment pipeline
 * re-fetches listings while keeping purchase prices, dates, and venues intact.
 * Use this for manual refresh instead of clearWalletCache.
 */
export function invalidateListingPrices(walletAddress: string): void {
  if (!isBrowser) return;

  const prefix = `${CACHE_NAMESPACE}:nft:detail:${SCHEMA_VERSIONS.nftDetail}:${walletAddress.toLowerCase()}:`;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const entry = JSON.parse(raw) as CacheEntry<CachedNFTDetailData>;
        if (!entry.data) continue;

        // Clear listing timestamps so enrichment treats them as stale
        entry.data.listingFetchedAt = undefined;
        entry.data.currentLowestListing = undefined;
        entry.data.currentHighestListing = undefined;

        localStorage.setItem(key, JSON.stringify(entry));
      } catch {
        // Skip corrupted entries
      }
    }
  } catch (error) {
    console.error('Error invalidating listing prices:', error);
  }
}

/**
 * Clear all caches for a specific wallet
 */
export function clearWalletCache(walletAddress: string): void {
  if (!isBrowser) return;

  const prefix = `${CACHE_NAMESPACE}:nft:`;
  const walletLower = walletAddress.toLowerCase();

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix) && key.includes(walletLower)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Also clear legacy cache
    localStorage.removeItem(`${LEGACY_CACHE_KEY_PREFIX}${walletLower}`);
  } catch (error) {
    console.error('Error clearing wallet cache:', error);
  }
}

/**
 * Clear all ZillaScope caches
 */
export function clearAllCaches(): void {
  if (!isBrowser) return;

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(CACHE_NAMESPACE) || key?.startsWith(LEGACY_CACHE_KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.error('Error clearing all caches:', error);
  }
}

// Legacy aliases for backward compatibility
export const clearNFTCache = clearWalletCache;
export const clearAllNFTCaches = clearAllCaches;
