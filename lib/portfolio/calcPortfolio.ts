/**
 * Pure portfolio calculation function - single source of truth for portfolio totals.
 * No React, no fetch, no side effects, no mutation.
 */

import { WalletData, NFT } from '@/lib/types';

// =============================================================================
// Types
// =============================================================================

export interface BreakdownItem {
  key: string;
  label: string;
  usd: number;
  pct: number;
}

export interface ConfidenceScore {
  level: 'high' | 'medium' | 'low' | 'none';
  percentage: number;
}

export interface PortfolioInvariants {
  sumSectionsUsd: number;
  pctSum: number;
  ok: boolean;
  warnings: string[];
  toleranceUsd: number;
}

export interface PortfolioCalcResult {
  totalUsd: number;
  tokensUsd: number;
  nftsUsd: number;
  nftUsdReliable: boolean;
  breakdown: BreakdownItem[];
  invariants: PortfolioInvariants;
  // Additional computed values for convenience
  totalGunBalance: number;
  avalancheGunBalance: number;
  solanaGunBalance: number;
  nftCount: number;
  nftsWithPrice: number;
  nftsWithoutPrice: number;
  // Total GUN spent on NFTs (sum of purchasePriceGun)
  totalGunSpent: number;
  // Data confidence score based on NFT price coverage
  confidence: ConfidenceScore;
  // Market value: estimated value using listing > floor > cost basis waterfall
  nftsMarketValueUsd: number;
  nftsMarketValueGun: number;
  nftsWithMarketValue: number;
  // Total portfolio using market value instead of cost basis
  totalMarketValueUsd: number;
}

export interface CalcPortfolioInput {
  walletData: WalletData;
  gunPrice: number | undefined;
  totalOwnedNftCount?: number;  // Optional override for total NFT count from pagination
}

// =============================================================================
// Constants
// =============================================================================

const TOLERANCE_USD = 0.01;
const PCT_TOLERANCE = 0.5;

// =============================================================================
// Pure calculation function
// =============================================================================

/**
 * Calculate portfolio values from wallet data.
 * This is a PURE function - no side effects, no mutations, deterministic output.
 */
export function calcPortfolio(input: CalcPortfolioInput): PortfolioCalcResult {
  const { walletData, gunPrice, totalOwnedNftCount } = input;
  const warnings: string[] = [];

  // ==========================================================================
  // 1. Calculate token balances
  // ==========================================================================
  const avalancheGunBalance = walletData.avalanche.gunToken?.balance ?? 0;
  const solanaGunBalance = walletData.solana.gunToken?.balance ?? 0;
  const totalGunBalance = avalancheGunBalance + solanaGunBalance;

  // Validate GUN price
  const effectiveGunPrice = typeof gunPrice === 'number' && Number.isFinite(gunPrice) && gunPrice > 0
    ? gunPrice
    : 0;

  if (!effectiveGunPrice) {
    warnings.push('GUN price unavailable or invalid');
  }

  // Calculate tokens USD value
  const tokensUsd = totalGunBalance * effectiveGunPrice;

  // ==========================================================================
  // 2. Calculate NFT values
  // ==========================================================================
  const allNFTs: NFT[] = [...walletData.avalanche.nfts, ...walletData.solana.nfts];

  let nftsUsd = 0;
  let nftsWithPrice = 0;
  let nftsWithoutPrice = 0;
  let nftsFreeTransfer = 0;
  let totalNftQuantity = 0;
  let totalGunSpent = 0;

  // Market value: use best available price per NFT (listing > floor > cost basis)
  let nftsMarketValueGun = 0;
  let nftsWithMarketValue = 0;

  for (const nft of allNFTs) {
    const quantity = nft.quantity ?? 1;
    totalNftQuantity += quantity;

    if (nft.purchasePriceGun !== undefined && nft.purchasePriceGun > 0) {
      totalGunSpent += nft.purchasePriceGun * quantity;
      if (effectiveGunPrice > 0) {
        nftsUsd += nft.purchasePriceGun * effectiveGunPrice * quantity;
        nftsWithPrice += quantity;
      } else {
        nftsWithoutPrice += quantity;
      }
    } else if (nft.isFreeTransfer || nft.acquisitionVenue) {
      // Known acquisition (free transfer, zero-cost mint, etc.) — count as resolved data
      nftsFreeTransfer += quantity;
    } else {
      nftsWithoutPrice += quantity;
    }

    // Market value waterfall: per-item listing > comparable sales > rarity floor > cost basis
    const marketGun = nft.currentLowestListing
      ?? nft.comparableSalesMedian
      ?? nft.rarityFloor
      ?? nft.purchasePriceGun;
    if (marketGun !== undefined && marketGun > 0) {
      nftsMarketValueGun += marketGun * quantity;
      nftsWithMarketValue += quantity;
    }
  }

  // Use pagination total if provided, otherwise use counted quantity
  const nftCount = totalOwnedNftCount ?? totalNftQuantity;

  // Determine NFT pricing coverage and reliability
  // nftUsdReliable indicates if we have price data for a majority of NFTs
  // but we always include the partial value now (UI can show warning based on flag)
  const nftPriceCoverage = totalNftQuantity > 0 ? nftsWithPrice / totalNftQuantity : 0;
  const nftUsdReliable = nftPriceCoverage > 0.5 && nftsWithPrice > 0;

  if (totalNftQuantity > 0) {
    if (nftsWithPrice === 0) {
      warnings.push('No NFT price data available');
    } else if (!nftUsdReliable) {
      warnings.push(`Only ${(nftPriceCoverage * 100).toFixed(0)}% of NFTs have price data (partial value shown)`);
    }
  }

  // Always include NFT value (even partial) - UI uses nftUsdReliable flag for warnings
  const effectiveNftsUsd = nftsUsd;

  // Market value of NFTs (listing > floor > cost basis)
  const nftsMarketValueUsd = nftsMarketValueGun * effectiveGunPrice;

  // ==========================================================================
  // 3. Calculate total and breakdown
  // ==========================================================================
  const totalUsd = tokensUsd + effectiveNftsUsd;
  const totalMarketValueUsd = tokensUsd + nftsMarketValueUsd;

  // Build breakdown array
  const breakdown: BreakdownItem[] = [];

  // Avalanche GUN tokens
  const avalancheTokensUsd = avalancheGunBalance * effectiveGunPrice;
  if (avalancheTokensUsd > 0 || avalancheGunBalance > 0) {
    breakdown.push({
      key: 'avalanche_gun',
      label: 'GUN (GUNZ Chain)',
      usd: avalancheTokensUsd,
      pct: totalUsd > 0 ? (avalancheTokensUsd / totalUsd) * 100 : 0,
    });
  }

  // Solana GUN tokens
  const solanaTokensUsd = solanaGunBalance * effectiveGunPrice;
  if (solanaTokensUsd > 0 || solanaGunBalance > 0) {
    breakdown.push({
      key: 'solana_gun',
      label: 'GUN (Solana)',
      usd: solanaTokensUsd,
      pct: totalUsd > 0 ? (solanaTokensUsd / totalUsd) * 100 : 0,
    });
  }

  // NFTs (only if reliable)
  if (effectiveNftsUsd > 0) {
    breakdown.push({
      key: 'nfts',
      label: 'NFT Holdings',
      usd: effectiveNftsUsd,
      pct: totalUsd > 0 ? (effectiveNftsUsd / totalUsd) * 100 : 0,
    });
  }

  // ==========================================================================
  // 4. Validate invariants
  // ==========================================================================
  const sumSectionsUsd = breakdown.reduce((sum, item) => sum + item.usd, 0);
  const pctSum = breakdown.reduce((sum, item) => sum + item.pct, 0);

  const totalDiff = Math.abs(totalUsd - sumSectionsUsd);
  const pctDiff = Math.abs(pctSum - 100);

  const invariantsOk =
    totalDiff <= TOLERANCE_USD &&
    (totalUsd === 0 || pctDiff <= PCT_TOLERANCE);

  if (totalDiff > TOLERANCE_USD) {
    warnings.push(`Total mismatch: ${totalUsd.toFixed(2)} vs sum ${sumSectionsUsd.toFixed(2)} (diff: ${totalDiff.toFixed(4)})`);
  }

  if (totalUsd > 0 && pctDiff > PCT_TOLERANCE) {
    warnings.push(`Percentage sum: ${pctSum.toFixed(2)}% (expected 100%, diff: ${pctDiff.toFixed(2)})`);
  }

  // ==========================================================================
  // 5. Calculate confidence score
  // ==========================================================================
  // Free transfers have known cost (zero) — include them as resolved data.
  // Use nftCount (from pagination total) as denominator so confidence is stable
  // across page loads and only increases as enrichment progresses.
  const nftsWithKnownCost = nftsWithPrice + nftsFreeTransfer;
  const confidencePercentage = nftCount > 0
    ? Math.round((nftsWithKnownCost / nftCount) * 100)
    : 0;

  const confidence: ConfidenceScore = {
    level: confidencePercentage >= 80 ? 'high'
         : confidencePercentage >= 50 ? 'medium'
         : confidencePercentage > 0 ? 'low'
         : 'none',
    percentage: confidencePercentage,
  };

  // ==========================================================================
  // 6. Return result
  // ==========================================================================
  return {
    totalUsd,
    tokensUsd,
    nftsUsd: effectiveNftsUsd,
    nftUsdReliable,
    breakdown,
    invariants: {
      sumSectionsUsd,
      pctSum,
      ok: invariantsOk,
      warnings,
      toleranceUsd: TOLERANCE_USD,
    },
    // Convenience fields
    totalGunBalance,
    avalancheGunBalance,
    solanaGunBalance,
    nftCount,
    nftsWithPrice,
    nftsWithoutPrice,
    totalGunSpent,
    confidence,
    // Market value (listing > floor > cost basis waterfall)
    nftsMarketValueUsd,
    nftsMarketValueGun,
    nftsWithMarketValue,
    totalMarketValueUsd,
  };
}

/**
 * Format USD value for display
 */
export function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format percentage for display
 */
export function formatPct(value: number): string {
  return value.toFixed(1) + '%';
}
