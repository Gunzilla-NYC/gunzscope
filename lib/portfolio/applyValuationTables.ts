/**
 * Pure function to inject rarity-floor, comparable-sales, and Track B waterfall
 * valuation data into NFTs. Called ONCE per portfolio load (not per NFT).
 * Both data sources are server-cached.
 *
 * Waterfall (applied later in calcPortfolio):
 *   per-item listing > comparable sales median > rarity-tier floor > cost basis
 *
 * Track B waterfall (market exit estimate):
 *   exact item > same item > same skin > same weapon > collection floor
 */

import { NFT, MarketReferencePriceData } from '@/lib/types';
import { parseItemName } from '@/lib/nft/parseItemName';
import { getMarketExitValuation } from '@/lib/portfolio/valuationService';
import type { WaterfallData } from '@/lib/api/opensea';

export interface RarityFloorsData {
  floors: Record<string, number>; // e.g. { "Epic": 120, "Rare": 45, "Uncommon": 12, "Common": 3 }
}

export interface ComparableSalesData {
  items: Record<string, { medianGun: number; minGun?: number; saleCount?: number }>;
  // Key format: "{itemName}::{rarity}" e.g. "Vulture Legacy::Epic"
  waterfall?: WaterfallData; // Track B waterfall groupings
}

/**
 * Enrich NFTs with valuation table data (comparable sales median + rarity-tier floor + Track B).
 * Optionally injects market reference floor prices from the /market page's bulk listing data.
 * Returns a new array — does NOT mutate the input.
 */
export function applyValuationTables(
  nfts: NFT[],
  rarityFloors: RarityFloorsData | null,
  comparableSales: ComparableSalesData | null,
  collectionFloorGun?: number | null,
  marketReference?: MarketReferencePriceData | null,
): NFT[] {
  if (!rarityFloors && !comparableSales && !collectionFloorGun && !marketReference) return nfts;

  const floors = rarityFloors?.floors;
  const items = comparableSales?.items;
  const waterfall = comparableSales?.waterfall;
  const refPrices = marketReference?.byItemName;

  return nfts.map(nft => {
    let comparableSalesMedian: number | undefined;
    let rarityFloor: number | undefined;

    const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'];
    const name = nft.name?.trim();

    // Comparable sales median — per-item-name + rarity key
    if (items && name && rarity) {
      const key = `${name}::${rarity}`;
      const comp = items[key];
      if (comp && comp.medianGun > 0) {
        comparableSalesMedian = comp.medianGun;
      }
    }

    // Rarity-tier floor — per-quality bucket
    if (floors && rarity) {
      const tierFloor = floors[rarity];
      if (tierFloor && tierFloor > 0) {
        rarityFloor = tierFloor;
      }
    }

    // Collection floor — universal fallback for all items
    const floorPrice = (collectionFloorGun && collectionFloorGun > 0) ? collectionFloorGun : undefined;

    // Market reference floor — from market page bulk listing data
    // Only fills currentLowestListing when per-NFT enrichment hasn't provided one yet
    let currentLowestListing: number | undefined;
    if (nft.currentLowestListing === undefined && refPrices && name) {
      const ref = refPrices[name];
      if (ref && ref.floorGun > 0) {
        currentLowestListing = ref.floorGun;
      }
    }

    // Track B — Market Exit waterfall valuation
    let marketExitGun: number | undefined;
    let marketExitTier: 1 | 2 | 3 | 4 | 5 | 6 | undefined;
    let marketExitTierLabel: string | undefined;

    if (name) {
      const parsed = parseItemName(name);
      const result = getMarketExitValuation({
        tokenId: nft.tokenId,
        baseName: parsed.baseName,
        skinDesign: parsed.skinDesign,
        weapon: parsed.weapon,
        floorPrice: (collectionFloorGun && collectionFloorGun > 0) ? collectionFloorGun : nft.floorPrice,
      }, waterfall);

      if (result) {
        marketExitGun = result.estimatedGun;
        marketExitTier = result.tier;
        marketExitTierLabel = result.tierLabel;
      }
    }

    // Only spread if we have new data
    const hasExistingUpdates = comparableSalesMedian !== undefined || rarityFloor !== undefined || floorPrice !== undefined;
    const hasTrackB = marketExitGun !== undefined;
    const hasListingUpdate = currentLowestListing !== undefined;
    if (!hasExistingUpdates && !hasTrackB && !hasListingUpdate) return nft;

    return {
      ...nft,
      ...(comparableSalesMedian !== undefined && { comparableSalesMedian }),
      ...(rarityFloor !== undefined && { rarityFloor }),
      ...(floorPrice !== undefined && !nft.floorPrice && { floorPrice }),
      ...(currentLowestListing !== undefined && { currentLowestListing }),
      ...(marketExitGun !== undefined && { marketExitGun }),
      ...(marketExitTier !== undefined && { marketExitTier }),
      ...(marketExitTierLabel !== undefined && { marketExitTierLabel }),
    };
  });
}
