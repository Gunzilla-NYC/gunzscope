/**
 * Unified Listing Service
 *
 * Intelligently fetches NFT listings from the appropriate marketplace(s)
 * based on wallet classification.
 *
 * - INGAME wallets: Check in-game marketplace first
 * - EXTERNAL wallets: Check OpenSea first
 * - UNKNOWN wallets: Check both
 */

import { OpenSeaService } from './opensea';
import {
  classifyWalletSafe,
  WalletClassification,
  UserAccountMapping,
  WalletConnectionContext,
  getListingCheckConfig,
  WalletType,
} from '../utils/walletClassifier';

// =============================================================================
// Types
// =============================================================================

export interface ListingData {
  /** Lowest listing price (in native token, e.g., GUN or ETH) */
  lowest: number | null;
  /** Highest listing price */
  highest: number | null;
  /** Source marketplace(s) that provided the data */
  sources: ('opensea' | 'ingame')[];
  /** Wallet classification used for the query */
  walletClassification: WalletClassification;
  /** Any errors encountered (non-blocking) */
  errors?: string[];
  /** Debug info */
  debug?: {
    openSeaChecked: boolean;
    ingameChecked: boolean;
    openSeaError?: string;
    ingameError?: string;
  };
}

export interface ListingServiceOptions {
  /** Connection context - is this a connected wallet or searched address? */
  connectionContext?: WalletConnectionContext;
  /** User account mapping for classification */
  userAccount?: UserAccountMapping;
  /** Pre-computed wallet classification (skip re-classification) */
  preClassification?: WalletClassification;
  /** Force check specific marketplace(s) regardless of classification */
  forceCheck?: {
    opensea?: boolean;
    ingame?: boolean;
  };
  /** Include debug info in response */
  includeDebug?: boolean;
}

// =============================================================================
// Service Implementation
// =============================================================================

/**
 * Get NFT listings using wallet-aware marketplace selection
 *
 * @param contractAddress - NFT contract address
 * @param tokenId - Token ID
 * @param walletAddress - Owner wallet address (used for classification)
 * @param chain - Blockchain (default: 'avalanche')
 * @param options - Additional options
 * @returns Listing data with source info
 */
export async function getListingsForNFT(
  contractAddress: string,
  tokenId: string,
  walletAddress: string,
  chain: string = 'avalanche',
  options: ListingServiceOptions = {}
): Promise<ListingData> {
  // Classify wallet (or use pre-computed classification)
  const classification =
    options.preClassification ||
    (await classifyWalletSafe(walletAddress, options.connectionContext, options.userAccount));

  // Get check configuration based on classification
  const checkConfig = getListingCheckConfig(classification);

  // Apply force overrides if specified
  const shouldCheckOpenSea =
    options.forceCheck?.opensea ?? checkConfig.checkOpenSea;
  const shouldCheckIngame =
    options.forceCheck?.ingame ?? checkConfig.checkIngameMarketplace;

  const sources: ('opensea' | 'ingame')[] = [];
  const errors: string[] = [];
  let lowest: number | null = null;
  let highest: number | null = null;
  let openSeaError: string | undefined;
  let ingameError: string | undefined;

  // Check OpenSea if configured
  if (shouldCheckOpenSea) {
    try {
      const openSeaService = new OpenSeaService();
      const openSeaResult = await openSeaService.getNFTListings(
        contractAddress,
        tokenId,
        chain
      );

      if (openSeaResult.lowest !== null || openSeaResult.highest !== null) {
        sources.push('opensea');
        lowest = mergePrice(lowest, openSeaResult.lowest, 'min');
        highest = mergePrice(highest, openSeaResult.highest, 'max');
      }

      if (openSeaResult.error) {
        openSeaError = openSeaResult.error;
        errors.push(`OpenSea: ${openSeaResult.error}`);
      }
    } catch (error) {
      openSeaError = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`OpenSea: ${openSeaError}`);
    }
  }

  // Check in-game marketplace if configured
  if (shouldCheckIngame) {
    try {
      const ingameResult = await getIngameListings(contractAddress, tokenId, chain);

      if (ingameResult.lowest !== null || ingameResult.highest !== null) {
        sources.push('ingame');
        lowest = mergePrice(lowest, ingameResult.lowest, 'min');
        highest = mergePrice(highest, ingameResult.highest, 'max');
      }

      if (ingameResult.error) {
        ingameError = ingameResult.error;
        errors.push(`In-game: ${ingameResult.error}`);
      }
    } catch (error) {
      ingameError = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`In-game: ${ingameError}`);
    }
  }

  const result: ListingData = {
    lowest,
    highest,
    sources,
    walletClassification: classification,
  };

  if (errors.length > 0) {
    result.errors = errors;
  }

  if (options.includeDebug) {
    result.debug = {
      openSeaChecked: shouldCheckOpenSea,
      ingameChecked: shouldCheckIngame,
      openSeaError,
      ingameError,
    };
  }

  return result;
}

/**
 * Get listings with a pre-known wallet type (skip classification)
 */
export async function getListingsForNFTWithType(
  contractAddress: string,
  tokenId: string,
  walletType: WalletType,
  chain: string = 'avalanche',
  options: Omit<ListingServiceOptions, 'preClassification'> = {}
): Promise<ListingData> {
  // Create a synthetic classification
  const syntheticClassification: WalletClassification = {
    walletType,
    walletEvidence: { signals: ['provided_by_caller'] },
    address: 'synthetic',
    classifiedAt: new Date().toISOString(),
    fromCache: false,
  };

  return getListingsForNFT(contractAddress, tokenId, 'synthetic', chain, {
    ...options,
    preClassification: syntheticClassification,
  });
}

// =============================================================================
// In-Game Marketplace Integration
// =============================================================================

interface IngameListingResult {
  lowest: number | null;
  highest: number | null;
  error?: string;
}

/**
 * Get listings from the in-game marketplace
 * TODO: Implement when in-game marketplace listing API is available
 */
async function getIngameListings(
  contractAddress: string,
  tokenId: string,
  chain: string
): Promise<IngameListingResult> {
  // Placeholder implementation
  // When the in-game marketplace exposes a listings API, implement here
  //
  // Example implementation:
  // const response = await fetch(`/api/marketplace/listings?contract=${contractAddress}&tokenId=${tokenId}`);
  // const data = await response.json();
  // return { lowest: data.lowest, highest: data.highest };

  return {
    lowest: null,
    highest: null,
    error: 'In-game marketplace listing API not implemented',
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Merge prices using min or max strategy
 */
function mergePrice(
  existing: number | null,
  newPrice: number | null,
  strategy: 'min' | 'max'
): number | null {
  if (newPrice === null) return existing;
  if (existing === null) return newPrice;

  return strategy === 'min'
    ? Math.min(existing, newPrice)
    : Math.max(existing, newPrice);
}

// =============================================================================
// Convenience Exports
// =============================================================================

export { classifyWalletSafe as classifyWallet, getListingCheckConfig } from '../utils/walletClassifier';
export type { WalletClassification, WalletType, UserAccountMapping, WalletConnectionContext } from '../utils/walletClassifier';
