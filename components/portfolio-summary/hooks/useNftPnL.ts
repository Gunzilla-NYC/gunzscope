import { useMemo } from 'react';
import { NFT } from '@/lib/types';
import { NftPnL } from '../types';

export function useNftPnL(nfts: NFT[], gunPrice: number | undefined): NftPnL {
  return useMemo<NftPnL>(() => {
    let totalFloorValue = 0;
    let totalSpent = 0;
    let nftsWithBothValues = 0;
    let nftsWithCost = 0;
    let nftsFreeTransfer = 0;
    const totalItems = nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);

    for (const nft of nfts) {
      const quantity = nft.quantity || 1;
      const floor = nft.currentLowestListing ?? nft.floorPrice;
      const cost = nft.purchasePriceGun;

      if (nft.isFreeTransfer) {
        nftsFreeTransfer += quantity;
      } else if (cost !== undefined && cost > 0) {
        nftsWithCost += quantity;
      }

      if (floor !== undefined && floor > 0 && cost !== undefined && cost > 0) {
        totalFloorValue += floor * quantity;
        totalSpent += cost * quantity;
        nftsWithBothValues += quantity;
      }
    }

    const unrealizedGun = nftsWithBothValues > 0 && totalSpent > 0
      ? totalFloorValue - totalSpent : null;
    const unrealizedUsd = unrealizedGun !== null && gunPrice
      ? unrealizedGun * gunPrice : null;
    const pct = unrealizedGun !== null && totalSpent > 0
      ? (unrealizedGun / totalSpent) * 100 : null;

    return {
      unrealizedGun, unrealizedUsd, pct,
      coverage: nftsWithBothValues,
      totalItems,
      nftsWithCost,
      nftsFreeTransfer,
    };
  }, [nfts, gunPrice]);
}
