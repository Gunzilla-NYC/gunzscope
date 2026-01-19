// NFT enrichment data cache using localStorage
// Supports namespaced keys, schema versioning, and TTL-based expiry

// =============================================================================
// Schema Versions - Increment when cache structure changes
// =============================================================================
const SCHEMA_VERSIONS = {
  nftDetail: 'v3', // v3: Added acquisitionSource tracking, removed trusting NFT prop data
  transfers: 'v2',
  priceGunUsd: 'v1',
} as const;

// =============================================================================
// Cache Configuration
// =============================================================================
const CACHE_NAMESPACE = 'zillascope';
const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24 hours

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
 * Format: zillascope:nft:detail:v2:${walletAddress}:${tokenKey}
 */
export function buildNftDetailCacheKey(
  walletAddress: string,
  tokenKey: string
): string {
  return `${CACHE_NAMESPACE}:nft:detail:${SCHEMA_VERSIONS.nftDetail}:${walletAddress.toLowerCase()}:${tokenKey}`;
}

/**
 * Build cache key for transfer history
 * Format: zillascope:nft:transfers:v2:${walletAddress}:${tokenKey}
 */
export function buildTransfersCacheKey(
  walletAddress: string,
  tokenKey: string
): string {
  return `${CACHE_NAMESPACE}:nft:transfers:${SCHEMA_VERSIONS.transfers}:${walletAddress.toLowerCase()}:${tokenKey}`;
}

/**
 * Build cache key for GUN/USD price
 * Format: zillascope:price:gunusd:v1:${YYYY-MM-DD-HH} (hourly bucket)
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
 * Format: zillascope:price:gunusd:v1:historical:${YYYY-MM-DD}
 */
export function buildHistoricalPriceCacheKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${CACHE_NAMESPACE}:price:gunusd:${SCHEMA_VERSIONS.priceGunUsd}:historical:${yyyy}-${mm}-${dd}`;
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
}

export interface CachedTransferData {
  purchasePriceGun?: number;
  purchaseDate?: string; // ISO string
  transferredFrom?: string;
  isFreeTransfer?: boolean;
}

export interface CachedPriceData {
  gunUsdRate: number;
  timestamp: string; // ISO string
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
 * Set cached historical GUN price (7 days TTL - historical data doesn't change)
 */
export function setCachedHistoricalGunPrice(
  date: Date,
  rate: number,
  ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days
): void {
  const fullKey = buildHistoricalPriceCacheKey(date);
  const data: CachedPriceData = {
    gunUsdRate: rate,
    timestamp: date.toISOString(),
  };
  cacheSet(fullKey, SCHEMA_VERSIONS.priceGunUsd, data, ttlSeconds);
}

// =============================================================================
// Legacy Compatibility Layer (will be removed in future)
// =============================================================================

// Old cache key prefix for migration/cleanup
const LEGACY_CACHE_KEY_PREFIX = 'zillascope_nft_cache_';

interface LegacyCachedNFTData {
  quantity?: number;
  purchasePriceGun?: number;
  purchaseDate?: string;
  transferredFrom?: string;
  isFreeTransfer?: boolean;
  cachedAt: number;
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
    // First try new cache format
    const contractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '';
    const tokenKey = buildTokenKey('avalanche', contractAddress, tokenId);
    const newResult = getCachedNFTDetail(walletAddress, tokenKey);

    if (newResult.hit && newResult.value) {
      return {
        ...newResult.value,
        cachedAt: Date.now(), // Approximate - new format doesn't expose this
      };
    }

    // Fall back to legacy format
    const legacyKey = `${LEGACY_CACHE_KEY_PREFIX}${walletAddress.toLowerCase()}`;
    const cached = localStorage.getItem(legacyKey);
    if (!cached) return null;

    const data = JSON.parse(cached) as Record<string, LegacyCachedNFTData>;
    const entry = data[tokenId];
    if (!entry) return null;

    // Check expiry (24 hours)
    if (Date.now() - entry.cachedAt > 24 * 60 * 60 * 1000) {
      return null;
    }

    return entry;
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
  const contractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '';
  const tokenKey = buildTokenKey('avalanche', contractAddress, tokenId);

  setCachedNFTDetail(walletAddress, tokenKey, {
    quantity: data.quantity,
    purchasePriceGun: data.purchasePriceGun,
    purchasePriceUsd: undefined, // Legacy format didn't have this
    purchaseDate: data.purchaseDate,
    transferredFrom: data.transferredFrom,
    isFreeTransfer: data.isFreeTransfer,
  });
};

// =============================================================================
// Cache Cleanup Utilities
// =============================================================================

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
