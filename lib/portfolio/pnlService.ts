/**
 * NFT P&L Calculation Service
 *
 * Combines acquisition data, historical prices, and market valuations
 * to calculate profit & loss for NFTs.
 */

import { AvalancheService } from '@/lib/blockchain/avalanche';
import {
  getGunPriceAtTime,
  getCurrentGunPrice,
  getGunPricesForTimestamps,
} from '@/lib/api/priceHistory';
import { OpenSeaService } from '@/lib/api/opensea';

// =============================================================================
// Debug Mode
// =============================================================================

const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[pnlService]', ...args);
  }
}

// =============================================================================
// Exported Types
// =============================================================================

/** Full P&L result for a single NFT */
export interface NFTPnLResult {
  tokenId: string;

  // Acquisition
  acquisitionVenue: string;
  acquisitionDate: Date | null;
  acquisitionTxHash: string | null;

  // Cost Basis
  costBasisGUN: number;
  gunPriceAtAcquisition: number;
  costBasisUSD: number;
  costBasisConfidence: string;

  // Current Value (same GUN at today's price)
  currentGunPrice: number;
  currentValueUSD: number;

  // Unrealized P&L (GUN price appreciation only)
  unrealizedGainUSD: number;
  unrealizedGainPercent: number;

  // Market Valuation
  floorPriceGUN: number | null;
  estimatedValueGUN: number | null;
  estimatedValueUSD: number | null;
  valuationSource: 'comparable_sales' | 'rarity_floor' | 'floor_price' | 'listing' | 'none';
  valuationConfidence: 'high' | 'medium' | 'low' | 'none';
  comparableSalesCount: number;

  // Market P&L (if sold at estimated value)
  potentialGainUSD: number | null;
  potentialGainPercent: number | null;

  // Data Quality
  hasCostBasis: boolean;
  hasValuation: boolean;
  warnings: string[];
}

/** Portfolio-level P&L summary */
export interface PortfolioPnLSummary {
  walletAddress: string;
  calculatedAt: Date;
  currentGunPrice: number;

  // Totals
  totalNFTs: number;
  nftsWithCostBasis: number;
  nftsWithValuation: number;

  // Aggregate Cost Basis
  totalCostBasisGUN: number;
  totalCostBasisUSD: number;

  // Aggregate Current Value (GUN appreciation)
  totalCurrentValueUSD: number;
  totalUnrealizedGainUSD: number;
  totalUnrealizedGainPercent: number;

  // Aggregate Market Value
  totalEstimatedValueUSD: number | null;
  totalPotentialGainUSD: number | null;
  totalPotentialGainPercent: number | null;

  // Breakdown by acquisition type
  byVenue: Record<
    string,
    {
      count: number;
      totalCostGUN: number;
      totalCostUSD: number;
    }
  >;

  // Per-NFT details
  nfts: NFTPnLResult[];
}

// =============================================================================
// Internal Types
// =============================================================================

interface ValuationResult {
  estimatedValueGUN: number | null;
  source: 'comparable_sales' | 'rarity_floor' | 'floor_price' | 'listing' | 'none';
  confidence: 'high' | 'medium' | 'low' | 'none';
  comparableSalesCount: number;
  floorPriceGUN: number | null;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_CONTRACT = process.env.NFT_COLLECTION_AVALANCHE || '';
const COLLECTION_SLUG = 'off-the-grid';

// Valuation confidence thresholds
const HIGH_CONFIDENCE_MIN_SALES = 5;
const HIGH_CONFIDENCE_MAX_DAYS = 14;
const MEDIUM_CONFIDENCE_MIN_SALES = 2;
const MEDIUM_CONFIDENCE_MAX_DAYS = 30;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Round a percentage to 2 decimal places
 */
function roundPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate valuation confidence based on comparable sales
 */
function calculateValuationConfidence(
  salesCount: number,
  oldestSaleDate: Date | null,
  hasFloorPrice: boolean
): 'high' | 'medium' | 'low' | 'none' {
  if (salesCount === 0 && !hasFloorPrice) {
    return 'none';
  }

  if (salesCount >= HIGH_CONFIDENCE_MIN_SALES && oldestSaleDate) {
    const daysSinceOldest = Math.floor(
      (Date.now() - oldestSaleDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceOldest <= HIGH_CONFIDENCE_MAX_DAYS) {
      return 'high';
    }
  }

  if (salesCount >= MEDIUM_CONFIDENCE_MIN_SALES && oldestSaleDate) {
    const daysSinceOldest = Math.floor(
      (Date.now() - oldestSaleDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceOldest <= MEDIUM_CONFIDENCE_MAX_DAYS) {
      return 'medium';
    }
  }

  if (salesCount >= 1 || hasFloorPrice) {
    return 'low';
  }

  return 'none';
}

/**
 * Get market valuation for an NFT
 */
async function getMarketValuation(
  openSeaService: OpenSeaService,
  contractAddress: string,
  tokenId: string,
  nftName: string,
  rarity: string | undefined
): Promise<ValuationResult> {
  try {
    // 1. Check for active listing first
    const listings = await openSeaService.getNFTListings(
      contractAddress,
      tokenId,
      'avalanche'
    );

    if (listings.lowest !== null && listings.lowest > 0) {
      debugLog(`Token ${tokenId} has active listing at ${listings.lowest} GUN`);
      return {
        estimatedValueGUN: listings.lowest,
        source: 'listing',
        confidence: 'high',
        comparableSalesCount: 0,
        floorPriceGUN: null,
      };
    }

    // 2. Get floor price - prefer rarity-specific floor if rarity is available
    let floorPriceGUN: number | null = null;
    let usedRarityFloor = false;

    if (rarity) {
      // Try rarity-specific floor price first
      const rarityFloor = await openSeaService.getRarityFloorPrice(rarity, COLLECTION_SLUG);
      if (rarityFloor.floorPriceGUN !== null) {
        floorPriceGUN = rarityFloor.floorPriceGUN;
        usedRarityFloor = true;
        debugLog(`Token ${tokenId} has rarity floor (${rarity}): ${floorPriceGUN} GUN`);
      }
    }

    // Fall back to collection-wide floor if no rarity floor found
    if (floorPriceGUN === null) {
      const collectionFloor = await openSeaService.getCollectionFloorPrice(COLLECTION_SLUG);
      floorPriceGUN = collectionFloor.floorPriceGUN;
    }

    // 3. If we have name and rarity, look for comparable sales
    if (nftName && rarity) {
      const comparables = await openSeaService.getComparableSales(
        nftName,
        rarity,
        COLLECTION_SLUG,
        30, // Look back 30 days
        20 // Get up to 20 comparable sales
      );

      if (comparables.length > 0) {
        // Calculate average sale price
        const totalPrice = comparables.reduce((sum, sale) => sum + sale.salePriceGUN, 0);
        const avgPrice = totalPrice / comparables.length;

        // Get oldest sale date for confidence calculation
        const oldestSale = comparables[comparables.length - 1];
        const oldestDate = oldestSale?.saleDate || null;

        const confidence = calculateValuationConfidence(
          comparables.length,
          oldestDate,
          floorPriceGUN !== null
        );

        debugLog(
          `Token ${tokenId} has ${comparables.length} comparable sales, avg=${avgPrice.toFixed(2)} GUN`
        );

        return {
          estimatedValueGUN: avgPrice,
          source: 'comparable_sales',
          confidence,
          comparableSalesCount: comparables.length,
          floorPriceGUN,
        };
      }
    }

    // 4. Fall back to floor price (rarity-specific or collection-wide)
    if (floorPriceGUN !== null) {
      const source = usedRarityFloor ? 'rarity_floor' : 'floor_price';
      debugLog(`Token ${tokenId} using ${source}: ${floorPriceGUN} GUN`);
      return {
        estimatedValueGUN: floorPriceGUN,
        source,
        confidence: usedRarityFloor ? 'medium' : 'low',
        comparableSalesCount: 0,
        floorPriceGUN,
      };
    }

    // 5. No valuation data available
    debugLog(`Token ${tokenId} has no valuation data`);
    return {
      estimatedValueGUN: null,
      source: 'none',
      confidence: 'none',
      comparableSalesCount: 0,
      floorPriceGUN: null,
    };
  } catch (error) {
    console.warn('[pnlService] Error getting market valuation:', error);
    return {
      estimatedValueGUN: null,
      source: 'none',
      confidence: 'none',
      comparableSalesCount: 0,
      floorPriceGUN: null,
    };
  }
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Calculate P&L for a single NFT
 *
 * @param contractAddress - NFT contract address
 * @param tokenId - Token ID
 * @param walletAddress - Wallet address that owns the NFT
 * @param nftName - Optional NFT name for comparable sales lookup
 * @param rarity - Optional rarity for comparable sales lookup
 * @param currentGunPrice - Optional: pass in to avoid re-fetching
 */
export async function calculateNFTPnL(
  contractAddress: string,
  tokenId: string,
  walletAddress: string,
  nftName?: string,
  rarity?: string,
  currentGunPrice?: number
): Promise<NFTPnLResult> {
  const warnings: string[] = [];

  // Initialize result with defaults
  const result: NFTPnLResult = {
    tokenId,
    acquisitionVenue: 'unknown',
    acquisitionDate: null,
    acquisitionTxHash: null,
    costBasisGUN: 0,
    gunPriceAtAcquisition: 0,
    costBasisUSD: 0,
    costBasisConfidence: 'none',
    currentGunPrice: 0,
    currentValueUSD: 0,
    unrealizedGainUSD: 0,
    unrealizedGainPercent: 0,
    floorPriceGUN: null,
    estimatedValueGUN: null,
    estimatedValueUSD: null,
    valuationSource: 'none',
    valuationConfidence: 'none',
    comparableSalesCount: 0,
    potentialGainUSD: null,
    potentialGainPercent: null,
    hasCostBasis: false,
    hasValuation: false,
    warnings: [],
  };

  try {
    // 1. Get acquisition data
    const avalancheService = new AvalancheService();
    const acquisition = await avalancheService.getNFTHoldingAcquisition(
      contractAddress,
      tokenId,
      walletAddress
    );

    if (!acquisition) {
      warnings.push('Failed to fetch acquisition data');
      result.warnings = warnings;
      return result;
    }

    if (!acquisition.owned) {
      warnings.push('Wallet does not own this NFT');
      result.warnings = warnings;
      return result;
    }

    // Set acquisition info
    result.acquisitionVenue = acquisition.venue;
    result.acquisitionTxHash = acquisition.txHash;
    result.acquisitionDate = acquisition.acquiredAtIso
      ? new Date(acquisition.acquiredAtIso)
      : null;

    debugLog(`Token ${tokenId}: venue=${acquisition.venue}, costGun=${acquisition.costGun}`);

    // 2. Get historical GUN price at acquisition time
    let gunPriceAtAcquisition = 0;
    let priceConfidence = 'none';

    if (acquisition.acquiredAtIso) {
      const priceResult = await getGunPriceAtTime(new Date(acquisition.acquiredAtIso));

      if (priceResult.priceUSD > 0) {
        gunPriceAtAcquisition = priceResult.priceUSD;
        priceConfidence = priceResult.confidence;
      } else if (priceResult.confidence === 'estimated') {
        warnings.push('Historical GUN price unavailable - cost basis may be inaccurate');
        priceConfidence = 'estimated';
      }
    } else {
      warnings.push('Acquisition date unknown - cannot calculate historical price');
    }

    result.gunPriceAtAcquisition = gunPriceAtAcquisition;
    result.costBasisConfidence = priceConfidence;

    // 3. Get current GUN price
    const currentPrice = currentGunPrice ?? (await getCurrentGunPrice()) ?? 0;
    result.currentGunPrice = currentPrice;

    if (currentPrice === 0) {
      warnings.push('Current GUN price unavailable');
    }

    // 4. Calculate cost basis
    const costBasisGUN = acquisition.costGun;
    result.costBasisGUN = costBasisGUN;

    // Check if this is a transfer/airdrop with no cost
    if (costBasisGUN === 0) {
      // IMPORTANT: Check decode venue FIRST, before isMint
      // Decode transactions have isMint=true (from zero address) but should show decode-specific warning
      if (acquisition.venue === 'decode' || acquisition.venue === 'decoder') {
        warnings.push('Decode fee not captured - check transaction for decode cost');
        debugLog(`Token ${tokenId}: decode venue but costGun=0, possible data extraction issue`);
      } else if (acquisition.venue === 'transfer' || acquisition.isMint) {
        warnings.push(
          `NFT was ${acquisition.isMint ? 'minted' : 'transferred'} - no purchase cost`
        );
      } else {
        warnings.push('No cost data found for this acquisition');
      }
      result.hasCostBasis = false;
    } else {
      result.hasCostBasis = true;
    }

    // Calculate USD values
    result.costBasisUSD = costBasisGUN * gunPriceAtAcquisition;
    result.currentValueUSD = costBasisGUN * currentPrice;

    // 5. Calculate unrealized P&L (GUN price appreciation)
    result.unrealizedGainUSD = result.currentValueUSD - result.costBasisUSD;

    if (result.costBasisUSD > 0) {
      result.unrealizedGainPercent = roundPercent(
        (result.unrealizedGainUSD / result.costBasisUSD) * 100
      );
    } else {
      result.unrealizedGainPercent = 0;
    }

    // 6. Get market valuation
    const openSeaService = new OpenSeaService();
    const valuation = await getMarketValuation(
      openSeaService,
      contractAddress,
      tokenId,
      nftName || '',
      rarity
    );

    result.floorPriceGUN = valuation.floorPriceGUN;
    result.estimatedValueGUN = valuation.estimatedValueGUN;
    result.valuationSource = valuation.source;
    result.valuationConfidence = valuation.confidence;
    result.comparableSalesCount = valuation.comparableSalesCount;
    result.hasValuation = valuation.estimatedValueGUN !== null;

    // 7. Calculate market P&L (if sold at estimated value)
    if (valuation.estimatedValueGUN !== null && currentPrice > 0) {
      result.estimatedValueUSD = valuation.estimatedValueGUN * currentPrice;

      if (result.hasCostBasis && result.costBasisUSD > 0) {
        result.potentialGainUSD = result.estimatedValueUSD - result.costBasisUSD;
        result.potentialGainPercent = roundPercent(
          (result.potentialGainUSD / result.costBasisUSD) * 100
        );
      } else {
        // No cost basis - can only show estimated value, not gain
        result.potentialGainUSD = null;
        result.potentialGainPercent = null;
      }
    }

    result.warnings = warnings;
    return result;
  } catch (error) {
    console.error('[pnlService] Error calculating NFT P&L:', error);
    warnings.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    result.warnings = warnings;
    return result;
  }
}

/**
 * Calculate P&L for an entire portfolio
 *
 * @param nfts - Array of NFTs with tokenId, name, and optional rarity
 * @param contractAddress - NFT contract address
 * @param walletAddress - Wallet address
 */
export async function calculatePortfolioPnL(
  nfts: Array<{ tokenId: string; name: string; rarity?: string }>,
  contractAddress: string,
  walletAddress: string
): Promise<PortfolioPnLSummary> {
  const calculatedAt = new Date();

  // 1. Get current GUN price ONCE upfront
  const currentGunPrice = (await getCurrentGunPrice()) ?? 0;

  debugLog(`Calculating P&L for ${nfts.length} NFTs, current GUN price: $${currentGunPrice}`);

  // 2. Pre-fetch acquisition dates and batch historical prices
  const avalancheService = new AvalancheService();
  const acquisitionDates: Date[] = [];
  const acquisitionsByToken = new Map<
    string,
    { acquiredAtIso: string | null; costGun: number; venue: string }
  >();

  // Fetch all acquisitions first to gather dates for batch price lookup
  for (const nft of nfts) {
    try {
      const acquisition = await avalancheService.getNFTHoldingAcquisition(
        contractAddress,
        nft.tokenId,
        walletAddress
      );

      if (acquisition && acquisition.owned && acquisition.acquiredAtIso) {
        acquisitionDates.push(new Date(acquisition.acquiredAtIso));
        acquisitionsByToken.set(nft.tokenId, {
          acquiredAtIso: acquisition.acquiredAtIso,
          costGun: acquisition.costGun,
          venue: acquisition.venue,
        });
      } else if (acquisition) {
        acquisitionsByToken.set(nft.tokenId, {
          acquiredAtIso: acquisition.acquiredAtIso,
          costGun: acquisition.costGun,
          venue: acquisition.venue,
        });
      }
    } catch (error) {
      console.warn(`[pnlService] Failed to get acquisition for token ${nft.tokenId}:`, error);
    }
  }

  // Batch fetch historical prices
  const historicalPrices = await getGunPricesForTimestamps(acquisitionDates);

  debugLog(`Fetched ${historicalPrices.size} historical prices`);

  // 3. Calculate P&L for each NFT
  const results = await Promise.allSettled(
    nfts.map(async (nft) => {
      // Get pre-cached acquisition
      const cached = acquisitionsByToken.get(nft.tokenId);
      let gunPriceAtAcquisition = 0;

      if (cached?.acquiredAtIso) {
        const priceKey = new Date(cached.acquiredAtIso).toISOString();
        const priceResult = historicalPrices.get(priceKey);
        if (priceResult && priceResult.priceUSD > 0) {
          gunPriceAtAcquisition = priceResult.priceUSD;
        }
      }

      // Calculate full P&L (this will re-fetch acquisition but use cached price)
      return calculateNFTPnL(
        contractAddress,
        nft.tokenId,
        walletAddress,
        nft.name,
        nft.rarity,
        currentGunPrice
      );
    })
  );

  // 4. Process results and aggregate
  const nftResults: NFTPnLResult[] = [];
  const byVenue: Record<string, { count: number; totalCostGUN: number; totalCostUSD: number }> =
    {};

  let totalCostBasisGUN = 0;
  let totalCostBasisUSD = 0;
  let totalCurrentValueUSD = 0;
  let totalEstimatedValueUSD = 0;
  let nftsWithCostBasis = 0;
  let nftsWithValuation = 0;
  let hasAnyValuation = false;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const pnl = result.value;
      nftResults.push(pnl);

      // Aggregate by venue
      if (!byVenue[pnl.acquisitionVenue]) {
        byVenue[pnl.acquisitionVenue] = {
          count: 0,
          totalCostGUN: 0,
          totalCostUSD: 0,
        };
      }
      byVenue[pnl.acquisitionVenue].count++;
      byVenue[pnl.acquisitionVenue].totalCostGUN += pnl.costBasisGUN;
      byVenue[pnl.acquisitionVenue].totalCostUSD += pnl.costBasisUSD;

      // Aggregate totals
      totalCostBasisGUN += pnl.costBasisGUN;
      totalCostBasisUSD += pnl.costBasisUSD;
      totalCurrentValueUSD += pnl.currentValueUSD;

      if (pnl.hasCostBasis) {
        nftsWithCostBasis++;
      }

      if (pnl.hasValuation && pnl.estimatedValueUSD !== null) {
        nftsWithValuation++;
        totalEstimatedValueUSD += pnl.estimatedValueUSD;
        hasAnyValuation = true;
      }
    } else {
      console.warn('[pnlService] Failed to calculate P&L for NFT:', result.reason);
    }
  }

  // 5. Calculate aggregate P&L
  const totalUnrealizedGainUSD = totalCurrentValueUSD - totalCostBasisUSD;
  const totalUnrealizedGainPercent =
    totalCostBasisUSD > 0
      ? roundPercent((totalUnrealizedGainUSD / totalCostBasisUSD) * 100)
      : 0;

  let totalPotentialGainUSD: number | null = null;
  let totalPotentialGainPercent: number | null = null;

  if (hasAnyValuation && totalCostBasisUSD > 0) {
    totalPotentialGainUSD = totalEstimatedValueUSD - totalCostBasisUSD;
    totalPotentialGainPercent = roundPercent(
      (totalPotentialGainUSD / totalCostBasisUSD) * 100
    );
  }

  return {
    walletAddress,
    calculatedAt,
    currentGunPrice,
    totalNFTs: nftResults.length,
    nftsWithCostBasis,
    nftsWithValuation,
    totalCostBasisGUN,
    totalCostBasisUSD,
    totalCurrentValueUSD,
    totalUnrealizedGainUSD,
    totalUnrealizedGainPercent,
    totalEstimatedValueUSD: hasAnyValuation ? totalEstimatedValueUSD : null,
    totalPotentialGainUSD,
    totalPotentialGainPercent,
    byVenue,
    nfts: nftResults,
  };
}
