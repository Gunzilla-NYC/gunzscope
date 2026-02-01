/**
 * NFT Collection Breakdown Calculator
 *
 * Pure function to group NFTs by collection and calculate value distribution.
 * Used by waffle chart to show per-collection breakdown within NFT segment.
 */

import type { NFT } from '@/lib/types';

export interface CollectionItem {
  name: string;
  count: number;
  valueGun: number;
  valueUsd: number;
  percentOfNfts: number; // Percentage of total NFT value
}

export interface CollectionBreakdown {
  collections: CollectionItem[];
  totalNftValueGun: number;
  totalNftValueUsd: number;
  totalNftCount: number;
  unpricedCount: number;
}

/**
 * Calculate breakdown of NFT holdings by collection
 *
 * @param nfts - Array of NFTs to analyze
 * @param gunPriceUsd - Current GUN token price in USD
 * @returns Collection breakdown with values and percentages
 */
export function calculateCollectionBreakdown(
  nfts: NFT[],
  gunPriceUsd: number
): CollectionBreakdown {
  if (nfts.length === 0) {
    return {
      collections: [],
      totalNftValueGun: 0,
      totalNftValueUsd: 0,
      totalNftCount: 0,
      unpricedCount: 0,
    };
  }

  // Group by collection
  const collectionMap = new Map<string, { count: number; valueGun: number }>();
  let unpricedCount = 0;

  for (const nft of nfts) {
    const collectionName = nft.collection || 'Unknown Collection';
    const existing = collectionMap.get(collectionName) || { count: 0, valueGun: 0 };
    const quantity = nft.quantity ?? 1;

    existing.count += quantity;

    if (nft.purchasePriceGun !== undefined) {
      existing.valueGun += nft.purchasePriceGun * quantity;
    } else {
      unpricedCount += quantity;
    }

    collectionMap.set(collectionName, existing);
  }

  // Calculate totals
  let totalValueGun = 0;
  for (const data of collectionMap.values()) {
    totalValueGun += data.valueGun;
  }
  const totalValueUsd = totalValueGun * gunPriceUsd;

  // Build collection items with percentages
  const collections: CollectionItem[] = [];
  for (const [name, data] of collectionMap) {
    const valueUsd = data.valueGun * gunPriceUsd;
    collections.push({
      name,
      count: data.count,
      valueGun: data.valueGun,
      valueUsd,
      percentOfNfts: totalValueUsd > 0 ? (valueUsd / totalValueUsd) * 100 : 0,
    });
  }

  // Sort by value descending
  collections.sort((a, b) => b.valueUsd - a.valueUsd);

  // Calculate total NFT count
  let totalNftCount = 0;
  for (const nft of nfts) {
    totalNftCount += nft.quantity ?? 1;
  }

  return {
    collections,
    totalNftValueGun: totalValueGun,
    totalNftValueUsd: totalValueUsd,
    totalNftCount,
    unpricedCount,
  };
}
