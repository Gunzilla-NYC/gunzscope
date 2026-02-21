/**
 * Valuation Method Taxonomy
 *
 * Classifies how an NFT's P&L was calculated based on available data.
 * Higher tiers = more market-driven = more trustworthy.
 *
 * Tier 1: VIA SALES   — Comparable sales median for this item name
 * Tier 2: VIA FLOOR   — Rarity-tier floor price
 * Tier 3: VIA LISTING — Lowest active listing for this item
 * Tier 4: GUN Δ       — GUN/USD token appreciation since purchase
 * Tier 5: EST.        — Cost basis estimated (pre-launch / interpolated)
 * Tier 6: FREE        — Airdrop/gift, no cost basis
 * null:   —           — Cannot calculate
 */

export type ValuationTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface ValuationMethod {
  tier: ValuationTier;
  label: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
}

export function getValuationMethod(nft: {
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchasePriceUsdEstimated?: boolean;
  isFreeTransfer?: boolean;
  comparableSalesMedian?: number;
  rarityFloor?: number;
  currentLowestListing?: number;
}): ValuationMethod | null {
  // No cost data at all
  if (!nft.purchasePriceGun && !nft.isFreeTransfer) {
    return null;
  }

  // Free items
  if (nft.isFreeTransfer) {
    return { tier: 6, label: 'FREE', description: 'Airdrop or gift \u2014 no cost basis', confidence: 'low' };
  }

  // Tier 1: Comparable sales
  if (nft.comparableSalesMedian && nft.comparableSalesMedian > 0) {
    return { tier: 1, label: 'VIA SALES', description: 'Valued against recent comparable sales', confidence: 'high' };
  }

  // Tier 2: Rarity-tier floor
  if (nft.rarityFloor && nft.rarityFloor > 0) {
    return { tier: 2, label: 'VIA FLOOR', description: 'Valued against rarity-tier floor price', confidence: 'high' };
  }

  // Tier 3: Active listing
  if (nft.currentLowestListing && nft.currentLowestListing > 0) {
    return { tier: 3, label: 'VIA LISTING', description: 'Valued against lowest active listing', confidence: 'medium' };
  }

  // Tier 5: Estimated cost basis (before Tier 4 — estimated is less reliable)
  if (nft.purchasePriceUsdEstimated === true) {
    return { tier: 5, label: 'EST.', description: 'Cost basis estimated \u2014 pre-launch or interpolated price', confidence: 'low' };
  }

  // Tier 4: GUN token appreciation (confirmed historical price)
  if (nft.purchasePriceGun && nft.purchasePriceGun > 0
    && nft.purchasePriceUsd && nft.purchasePriceUsd > 0) {
    return { tier: 4, label: 'GUN \u0394', description: 'P&L reflects GUN token price change since purchase', confidence: 'medium' };
  }

  return null;
}
