/**
 * Pure valuation service: NFT + waterfall data → market exit estimate.
 * No React, no fetch, no side effects. Follows calcPortfolio pattern.
 *
 * Waterfall tiers (narrowest → broadest):
 *   1. EXACT ITEM — same tokenId sold before (min: 1 sale)
 *   2. SAME ITEM — same baseName, all mints (min: 2 sales)
 *   3. SAME SKIN — same skinDesign, any weapon (min: 2 sales, skins only)
 *   4. SAME WEAPON — same weapon + type (min: 2 sales, skins only)
 *   5. SIMILAR SCARCITY — deferred to v2
 *   6. COLLECTION FLOOR — nuclear fallback
 */

import type { WaterfallData, WaterfallEntry } from '@/lib/api/opensea';

// =============================================================================
// Types
// =============================================================================

export interface ValuationInput {
  tokenId: string;
  baseName: string;
  skinDesign: string | null;
  weapon: string | null;
  floorPrice?: number; // collection floor fallback (GUN)
}

export type MarketExitTier = 1 | 2 | 3 | 4 | 5 | 6;

export interface ValuationResult {
  estimatedGun: number;
  tier: MarketExitTier;
  tierLabel: string;
  sampleSize: number;
}

// =============================================================================
// Tier labels — matches spec card labels
// =============================================================================

const TIER_LABELS: Record<MarketExitTier, string> = {
  1: 'EXACT',
  2: 'VIA SALES',
  3: 'VIA SKIN',
  4: 'VIA WEAPON',
  5: 'SIMILAR',
  6: 'FLOOR',
};

// =============================================================================
// Core function
// =============================================================================

function tryTier(
  entry: WaterfallEntry | undefined,
  tier: MarketExitTier,
  minSales: number,
): ValuationResult | null {
  if (!entry || entry.saleCount < minSales || entry.timeWeightedMedianGun <= 0) {
    return null;
  }
  return {
    estimatedGun: entry.timeWeightedMedianGun,
    tier,
    tierLabel: TIER_LABELS[tier],
    sampleSize: entry.saleCount,
  };
}

/**
 * Walk the waterfall to find the best market exit estimate for an NFT.
 * Returns null only if no waterfall data AND no floor price.
 */
export function getMarketExitValuation(
  input: ValuationInput,
  waterfall: WaterfallData | undefined,
): ValuationResult | null {
  if (waterfall) {
    // Tier 1: EXACT ITEM — same tokenId (min: 1 sale)
    const tier1 = tryTier(waterfall.byTokenId[input.tokenId], 1, 1);
    if (tier1) return tier1;

    // Tier 2: SAME ITEM — same baseName (min: 2 sales)
    const tier2 = tryTier(waterfall.byName[input.baseName], 2, 2);
    if (tier2) return tier2;

    // Tier 3: SAME SKIN — same skinDesign (min: 2 sales, skins only)
    if (input.skinDesign) {
      const tier3 = tryTier(waterfall.bySkin[input.skinDesign], 3, 2);
      if (tier3) return tier3;
    }

    // Tier 4: SAME WEAPON — same weapon (min: 2 sales, skins only)
    if (input.weapon) {
      const tier4 = tryTier(waterfall.byWeapon[input.weapon], 4, 2);
      if (tier4) return tier4;
    }

    // Tier 5: SIMILAR SCARCITY — deferred to v2
  }

  // Tier 6: COLLECTION FLOOR — nuclear fallback
  if (input.floorPrice && input.floorPrice > 0) {
    return {
      estimatedGun: input.floorPrice,
      tier: 6,
      tierLabel: TIER_LABELS[6],
      sampleSize: 0,
    };
  }

  return null;
}
