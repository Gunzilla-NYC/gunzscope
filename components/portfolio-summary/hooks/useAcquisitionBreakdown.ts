import { useMemo } from 'react';
import { NFT } from '@/lib/types';
import { AcquisitionBreakdown } from '../types';

export function useAcquisitionBreakdown(nfts: NFT[]): AcquisitionBreakdown {
  return useMemo<AcquisitionBreakdown>(() => {
    let minted = 0, mintedGun = 0;
    let bought = 0, boughtGun = 0;
    let transferred = 0;
    let pending = 0;

    for (const nft of nfts) {
      const qty = nft.quantity || 1;
      const venue = nft.acquisitionVenue;
      const cost = nft.purchasePriceGun ?? 0;

      if (venue === 'decode' || venue === 'decoder' || venue === 'mint' || venue === 'system_mint') {
        minted += qty;
        mintedGun += cost * qty;
      } else if (venue === 'opensea' || venue === 'otg_marketplace' || venue === 'in_game_marketplace') {
        bought += qty;
        boughtGun += cost * qty;
      } else if (venue === 'transfer' || nft.isFreeTransfer) {
        transferred += qty;
      } else {
        pending += qty;
      }
    }

    return { minted, mintedGun, bought, boughtGun, transferred, pending };
  }, [nfts]);
}
