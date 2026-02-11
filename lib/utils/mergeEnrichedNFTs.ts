import { NFT } from '@/lib/types';
import { WalletData } from '@/lib/types';

/**
 * Creates a state updater that merges enriched NFT data into existing wallet data.
 * Preserves floor prices from whichever source has them (enriched or existing).
 *
 * Used by both handleWalletSubmit and handleLoadMoreNFTs to deduplicate merge logic.
 */
export function createEnrichmentUpdater(
  enrichedNFTs: NFT[],
  expectedAddress?: string,
): (prev: WalletData | null) => WalletData | null {
  return (prev) => {
    if (!prev) return prev;
    if (expectedAddress && prev.address !== expectedAddress) return prev;

    const enrichedMap = new Map(
      enrichedNFTs.map(nft => [nft.tokenIds?.[0] || nft.tokenId, nft])
    );

    const mergedNFTs = prev.avalanche.nfts.map(existingNft => {
      const key = existingNft.tokenIds?.[0] || existingNft.tokenId;
      const enriched = enrichedMap.get(key);
      if (!enriched) return existingNft;
      return {
        ...existingNft,
        ...enriched,
        floorPrice: enriched.floorPrice ?? existingNft.floorPrice,
      };
    });

    return {
      ...prev,
      avalanche: { ...prev.avalanche, nfts: mergedNFTs },
    };
  };
}
