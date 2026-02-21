import { useMemo } from 'react';
import { NFT } from '@/lib/types';
import { NftPnL } from '../types';

export function useNftPnL(nfts: NFT[], gunPrice: number | undefined): NftPnL {
  return useMemo<NftPnL>(() => {
    let totalCostUsd = 0;
    let totalValueUsd = 0;
    let nftsWithBothValues = 0;
    let nftsWithCost = 0;
    let nftsFreeTransfer = 0;
    const totalItems = nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);

    for (const nft of nfts) {
      const quantity = nft.quantity || 1;
      const cost = nft.purchasePriceGun;

      if (nft.isFreeTransfer) {
        nftsFreeTransfer += quantity;
      } else if (cost !== undefined && cost > 0) {
        nftsWithCost += quantity;
      }

      // xGUN formula: pure GUN/USD price appreciation
      // Y = historical GUN/USD at purchase, Z = current GUN/USD
      // Skip when purchasePriceUsd is estimated (pre-CoinGecko fallback)
      if (cost !== undefined && cost > 0
        && nft.purchasePriceUsd && nft.purchasePriceUsd > 0
        && nft.purchasePriceUsdEstimated === false
        && gunPrice && gunPrice > 0) {
        const Y = nft.purchasePriceUsd / cost;
        totalCostUsd += cost * quantity * Y;
        totalValueUsd += cost * quantity * gunPrice;
        nftsWithBothValues += quantity;
      }
    }

    const unrealizedUsd = nftsWithBothValues > 0
      ? totalValueUsd - totalCostUsd : null;
    const unrealizedGun = unrealizedUsd !== null && gunPrice
      ? unrealizedUsd / gunPrice : null;
    const pct = unrealizedUsd !== null && totalCostUsd > 0
      ? (unrealizedUsd / totalCostUsd) * 100 : null;

    return {
      unrealizedGun, unrealizedUsd, pct,
      coverage: nftsWithBothValues,
      totalItems,
      nftsWithCost,
      nftsFreeTransfer,
    };
  }, [nfts, gunPrice]);
}
