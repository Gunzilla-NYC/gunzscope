/**
 * Wallet Classification System
 *
 * Deterministic detection of "in-game wallet" vs "external wallet" for NFT marketplace listing detection.
 *
 * Classification Priority:
 * 1. Known addresses (allowlist/denylist)
 * 2. User session mapping (custodial vs linked wallets)
 * 3. On-chain signals (contract detection)
 * 4. Fallback to UNKNOWN
 *
 * @see docs/WALLET_CLASSIFICATION.md for full documentation
 */

import { cacheGet, cacheSet } from './nftCache';

// =============================================================================
// Types & Schema
// =============================================================================

/**
 * Wallet type classification
 * - INGAME: Custodial/game-managed wallet (can list on in-game marketplace)
 * - EXTERNAL: User-controlled EOA (can list on OpenSea)
 * - UNKNOWN: Cannot determine (run both checks)
 */
export type WalletType = 'INGAME' | 'EXTERNAL' | 'UNKNOWN';

/**
 * Evidence used to determine wallet type
 */
export interface WalletEvidence {
  /** Signals that contributed to the classification */
  signals: string[];
  /** Raw data from classification sources (for debugging) */
  raw?: Record<string, unknown>;
}

/**
 * Complete wallet classification result
 */
export interface WalletClassification {
  walletType: WalletType;
  walletEvidence: WalletEvidence;
  /** Address that was classified (normalized to lowercase) */
  address: string;
  /** ISO timestamp of classification */
  classifiedAt: string;
  /** Whether this result came from cache */
  fromCache: boolean;
}

/**
 * User account mapping (from session/auth)
 */
export interface UserAccountMapping {
  /** Custodial wallet address managed by the game */
  custodialWalletAddress?: string;
  /** In-game wallet address (alias for custodial) */
  inGameWalletAddress?: string;
  /** Array of linked external wallet addresses */
  linkedExternalWallets?: string[];
}

/**
 * Connection context for wallet classification
 */
export interface WalletConnectionContext {
  /** Address that is currently connected via Dynamic (proved key ownership) */
  connectedAddress?: string;
  /** Whether the address being classified was connected via wallet provider (not just searched) */
  isConnectedWallet: boolean;
}

/**
 * Configuration for wallet classifier
 */
export interface WalletClassifierConfig {
  /** Known in-game/custodial addresses (e.g., escrow, hot wallets) */
  knownIngameAddresses: string[];
  /** Known external addresses (e.g., confirmed user wallets) */
  knownExternalAddresses: string[];
  /** Cache TTL in seconds (default: 30 minutes) */
  cacheTtlSeconds: number;
  /** Whether to check OpenSea for in-game wallets (default: false) */
  enableOpenSeaForIngame: boolean;
  /** Whether to check in-game marketplace for external wallets (default: true) */
  enableIngameForExternal: boolean;
}

// =============================================================================
// Cache Configuration
// =============================================================================

const CACHE_NAMESPACE = 'gunzscope';
const SCHEMA_VERSION = 'v1';
const DEFAULT_CACHE_TTL_SECONDS = 30 * 60; // 30 minutes

/**
 * Build cache key for wallet classification
 */
function buildWalletClassificationCacheKey(address: string): string {
  return `${CACHE_NAMESPACE}:wallet:classification:${SCHEMA_VERSION}:${address.toLowerCase()}`;
}

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Known addresses that are definitively in-game/custodial
 * Update this list as new escrow/custody contracts are deployed
 */
const DEFAULT_KNOWN_INGAME_ADDRESSES: string[] = [
  // Game marketplace escrow contracts
  // '0x...escrow1...',
  // Hot wallets used by game for distributions
  // '0x...hotwallet1...',
];

/**
 * Known addresses that are definitively external
 * Rarely needed - most external wallets are classified by other means
 */
const DEFAULT_KNOWN_EXTERNAL_ADDRESSES: string[] = [
  // Known CEX deposit addresses (if relevant)
  // Bridge contracts
];

const defaultConfig: WalletClassifierConfig = {
  knownIngameAddresses: DEFAULT_KNOWN_INGAME_ADDRESSES,
  knownExternalAddresses: DEFAULT_KNOWN_EXTERNAL_ADDRESSES,
  cacheTtlSeconds: DEFAULT_CACHE_TTL_SECONDS,
  enableOpenSeaForIngame: false,
  enableIngameForExternal: true,
};

// =============================================================================
// Classifier Implementation
// =============================================================================

/**
 * Classify a wallet address as INGAME, EXTERNAL, or UNKNOWN
 *
 * Uses multi-signal detection with the following priority:
 * 1. Check if this is a connected wallet (proved key ownership via Dynamic) → EXTERNAL
 * 2. Check allowlist/denylist (known addresses)
 * 3. Check user account mapping (session data)
 * 4. Check on-chain signals (future: contract detection)
 * 5. Return UNKNOWN if cannot determine (searched address with no signals)
 *
 * Results are cached for cacheTtlSeconds to avoid repeated API calls.
 *
 * @param address - Wallet address to classify
 * @param connectionContext - Optional connection context (is this wallet connected via Dynamic?)
 * @param userAccount - Optional user account mapping from session
 * @param config - Optional configuration overrides
 * @returns Classification result with evidence
 */
export async function classifyWallet(
  address: string,
  connectionContext?: WalletConnectionContext,
  userAccount?: UserAccountMapping,
  config: Partial<WalletClassifierConfig> = {}
): Promise<WalletClassification> {
  const mergedConfig = { ...defaultConfig, ...config };
  const normalizedAddress = address.toLowerCase();
  const cacheKey = buildWalletClassificationCacheKey(normalizedAddress);

  // Build evidence as we check signals
  const signals: string[] = [];
  const raw: Record<string, unknown> = {};

  // Track connection context in debug info
  if (connectionContext) {
    raw.connectionContext = {
      isConnectedWallet: connectionContext.isConnectedWallet,
      connectedAddress: connectionContext.connectedAddress?.toLowerCase(),
    };
  }

  // Signal 0 (Highest Priority): Connected wallet via Dynamic
  // If user connected this wallet via a wallet provider (MetaMask, etc.),
  // they proved key ownership, which means it's an EXTERNAL wallet
  // (in-game wallets are custodial and users can't connect them directly)
  if (connectionContext?.isConnectedWallet) {
    const connectedAddr = connectionContext.connectedAddress?.toLowerCase();
    if (connectedAddr === normalizedAddress) {
      signals.push('connected_via_wallet_provider');
      const result = buildClassificationResult(
        normalizedAddress,
        'EXTERNAL',
        signals,
        raw,
        false
      );
      // Cache connected wallet classification
      cacheClassification(cacheKey, result, mergedConfig.cacheTtlSeconds);
      return result;
    }
  }

  // For non-connected wallets (searched addresses), check cache
  const cached = cacheGet<Omit<WalletClassification, 'fromCache'>>(
    cacheKey,
    SCHEMA_VERSION
  );

  if (cached.hit && cached.value) {
    return {
      ...cached.value,
      fromCache: true,
    };
  }

  // Signal 1: Known addresses (allowlist/denylist)
  const knownIngame = mergedConfig.knownIngameAddresses.map(a => a.toLowerCase());
  const knownExternal = mergedConfig.knownExternalAddresses.map(a => a.toLowerCase());

  if (knownIngame.includes(normalizedAddress)) {
    signals.push('known_ingame_address');
    const result = buildClassificationResult(
      normalizedAddress,
      'INGAME',
      signals,
      raw,
      false
    );
    cacheClassification(cacheKey, result, mergedConfig.cacheTtlSeconds);
    return result;
  }

  if (knownExternal.includes(normalizedAddress)) {
    signals.push('known_external_address');
    const result = buildClassificationResult(
      normalizedAddress,
      'EXTERNAL',
      signals,
      raw,
      false
    );
    cacheClassification(cacheKey, result, mergedConfig.cacheTtlSeconds);
    return result;
  }

  // Signal 2: User account mapping
  if (userAccount) {
    raw.userAccount = {
      hasCustodial: !!userAccount.custodialWalletAddress || !!userAccount.inGameWalletAddress,
      linkedCount: userAccount.linkedExternalWallets?.length || 0,
    };

    // Check if this is the user's custodial/in-game wallet
    const custodialAddress = (
      userAccount.custodialWalletAddress ||
      userAccount.inGameWalletAddress
    )?.toLowerCase();

    if (custodialAddress === normalizedAddress) {
      signals.push('account_custodial_wallet');
      const result = buildClassificationResult(
        normalizedAddress,
        'INGAME',
        signals,
        raw,
        false
      );
      cacheClassification(cacheKey, result, mergedConfig.cacheTtlSeconds);
      return result;
    }

    // Check if this is one of the user's linked external wallets
    const linkedWallets = (userAccount.linkedExternalWallets || []).map(
      a => a.toLowerCase()
    );

    if (linkedWallets.includes(normalizedAddress)) {
      signals.push('account_linked_external');
      const result = buildClassificationResult(
        normalizedAddress,
        'EXTERNAL',
        signals,
        raw,
        false
      );
      cacheClassification(cacheKey, result, mergedConfig.cacheTtlSeconds);
      return result;
    }
  }

  // Signal 3: On-chain detection (future expansion point)
  // Could add:
  // - Contract code detection (is this a smart contract wallet?)
  // - Transaction pattern analysis
  // - Known game interaction detection
  signals.push('searched_address_no_signal');

  // Fallback: UNKNOWN (searched address with no classification signals)
  // For UNKNOWN wallets, we'll check both marketplaces
  const result = buildClassificationResult(
    normalizedAddress,
    'UNKNOWN',
    signals,
    raw,
    false
  );
  cacheClassification(cacheKey, result, mergedConfig.cacheTtlSeconds);
  return result;
}

/**
 * Classify a wallet with graceful error handling
 * Never throws - returns UNKNOWN on any error
 */
export async function classifyWalletSafe(
  address: string,
  connectionContext?: WalletConnectionContext,
  userAccount?: UserAccountMapping,
  config: Partial<WalletClassifierConfig> = {}
): Promise<WalletClassification> {
  try {
    return await classifyWallet(address, connectionContext, userAccount, config);
  } catch (error) {
    console.error('Wallet classification failed:', error);
    return buildClassificationResult(
      address.toLowerCase(),
      'UNKNOWN',
      ['classification_error'],
      { error: error instanceof Error ? error.message : 'Unknown error' },
      false
    );
  }
}

/**
 * Clear cached classification for an address
 */
export function clearWalletClassificationCache(address: string): void {
  const cacheKey = buildWalletClassificationCacheKey(address);
  // Use the localStorage removal directly since nftCache doesn't export remove
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Clear all wallet classification caches
 */
export function clearAllWalletClassificationCaches(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage);
    const prefix = `${CACHE_NAMESPACE}:wallet:classification:`;
    for (const key of keys) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // Ignore errors
  }
}

// =============================================================================
// Listing Detection Integration
// =============================================================================

/**
 * Listing check configuration based on wallet type
 */
export interface ListingCheckConfig {
  /** Whether to check OpenSea for listings */
  checkOpenSea: boolean;
  /** Whether to check in-game marketplace for listings */
  checkIngameMarketplace: boolean;
  /** Priority order for checks */
  priority: ('opensea' | 'ingame')[];
  /** Reason for this configuration */
  reason: string;
}

/**
 * Get listing check configuration based on wallet classification
 *
 * @param classification - Wallet classification result
 * @param classifierConfig - Optional classifier config for feature flags
 * @returns Configuration for which marketplaces to check
 */
export function getListingCheckConfig(
  classification: WalletClassification,
  classifierConfig: Partial<WalletClassifierConfig> = {}
): ListingCheckConfig {
  const config = { ...defaultConfig, ...classifierConfig };

  switch (classification.walletType) {
    case 'INGAME':
      return {
        checkIngameMarketplace: true,
        checkOpenSea: config.enableOpenSeaForIngame,
        priority: config.enableOpenSeaForIngame
          ? ['ingame', 'opensea']
          : ['ingame'],
        reason: 'In-game wallet: primary in-game marketplace',
      };

    case 'EXTERNAL':
      return {
        checkOpenSea: true,
        checkIngameMarketplace: config.enableIngameForExternal,
        priority: config.enableIngameForExternal
          ? ['opensea', 'ingame']
          : ['opensea'],
        reason: 'External wallet: primary OpenSea',
      };

    case 'UNKNOWN':
    default:
      // For UNKNOWN, check both with in-game priority for Gunzilla-native NFTs
      return {
        checkOpenSea: true,
        checkIngameMarketplace: true,
        priority: ['ingame', 'opensea'],
        reason: 'Unknown wallet type: checking both marketplaces',
      };
  }
}

/**
 * Check if OpenSea listing check should be performed
 */
export function shouldCheckOpenSea(classification: WalletClassification): boolean {
  return getListingCheckConfig(classification).checkOpenSea;
}

/**
 * Check if in-game marketplace listing check should be performed
 */
export function shouldCheckIngameMarketplace(
  classification: WalletClassification
): boolean {
  return getListingCheckConfig(classification).checkIngameMarketplace;
}

// =============================================================================
// Helper Functions
// =============================================================================

function buildClassificationResult(
  address: string,
  walletType: WalletType,
  signals: string[],
  raw: Record<string, unknown>,
  fromCache: boolean
): WalletClassification {
  return {
    walletType,
    walletEvidence: {
      signals,
      raw: Object.keys(raw).length > 0 ? raw : undefined,
    },
    address,
    classifiedAt: new Date().toISOString(),
    fromCache,
  };
}

function cacheClassification(
  cacheKey: string,
  result: WalletClassification,
  ttlSeconds: number
): void {
  const { fromCache, ...cacheData } = result;
  cacheSet(cacheKey, SCHEMA_VERSION, cacheData, ttlSeconds);
}

// =============================================================================
// Export Default Config for Testing
// =============================================================================

export { defaultConfig as DEFAULT_WALLET_CLASSIFIER_CONFIG };
