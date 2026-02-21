/**
 * Pure function to inject rarity-floor and comparable-sales data into NFTs.
 * Called ONCE per portfolio load (not per NFT). Both data sources are server-cached.
 *
 * Waterfall (applied later in calcPortfolio):
 *   per-item listing > comparable sales median > rarity-tier floor > cost basis
 */

import { NFT } from '@/lib/types';

export interface RarityFloorsData {
  floors: Record<string, number>; // e.g. { "Epic": 120, "Rare": 45, "Uncommon": 12, "Common": 3 }
}

export interface ComparableSalesData {
  items: Record<string, { medianGun: number; minGun?: number; saleCount?: number }>;
  // Key format: "{itemName}::{rarity}" e.g. "Vulture Legacy::Epic"
}

/**
 * Enrich NFTs with valuation table data (comparable sales median + rarity-tier floor).
 * Returns a new array — does NOT mutate the input.
 */
export function applyValuationTables(
  nfts: NFT[],
  rarityFloors: RarityFloorsData | null,
  comparableSales: ComparableSalesData | null,
  collectionFloorGun?: number | null,
): NFT[] {
  if (!rarityFloors && !comparableSales && !collectionFloorGun) return nfts;

  const floors = rarityFloors?.floors;
  const items = comparableSales?.items;

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

    // Only spread if we have new data
    if (comparableSalesMedian === undefined && rarityFloor === undefined && floorPrice === undefined) return nft;

    return {
      ...nft,
      ...(comparableSalesMedian !== undefined && { comparableSalesMedian }),
      ...(rarityFloor !== undefined && { rarityFloor }),
      ...(floorPrice !== undefined && !nft.floorPrice && { floorPrice }),
    };
  });
}
