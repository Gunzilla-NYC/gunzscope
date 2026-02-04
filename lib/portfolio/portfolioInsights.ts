import { NFT } from '@/lib/types';

export interface PortfolioInsight {
  type: 'best_performer' | 'worst_performer' | 'below_cost' | 'most_valuable';
  label: string;
  value: string;
  tokenId?: string;
  nftName?: string;
  isPositive: boolean;
}

/**
 * Generate portfolio insights from NFT data.
 * Analyzes NFTs with both purchase price and floor price to identify:
 * - Best performer (highest % gain)
 * - NFTs below cost basis (underwater positions)
 *
 * @param nfts - Array of NFTs to analyze
 * @param gunPrice - Current GUN price in USD (required for calculations)
 * @param maxInsights - Maximum number of insights to return (default 3)
 * @returns Array of portfolio insights, sorted by importance
 */
export function generateInsights(
  nfts: NFT[],
  gunPrice: number | undefined,
  maxInsights = 3
): PortfolioInsight[] {
  if (!nfts.length || !gunPrice || gunPrice <= 0) return [];

  const insights: PortfolioInsight[] = [];

  // Filter NFTs that have both purchase price and floor price for P&L analysis
  const nftsWithPnL = nfts.filter(nft =>
    nft.purchasePriceGun !== undefined &&
    nft.purchasePriceGun > 0 &&
    nft.floorPrice !== undefined &&
    nft.floorPrice > 0
  );

  if (nftsWithPnL.length > 0) {
    // Calculate gain percentage for each NFT
    const nftsWithGain = nftsWithPnL.map(nft => ({
      nft,
      gain: ((nft.floorPrice! - nft.purchasePriceGun!) / nft.purchasePriceGun!) * 100,
    }));

    // Sort by gain (highest first)
    nftsWithGain.sort((a, b) => b.gain - a.gain);

    // Best performer (only if positive gain exists)
    const best = nftsWithGain[0];
    if (best && best.gain > 0) {
      const nftName = best.nft.name || (best.nft as NFT & { metadata?: { name?: string } }).metadata?.name;
      insights.push({
        type: 'best_performer',
        label: 'Best performer',
        value: `+${Math.round(best.gain)}%`,
        tokenId: best.nft.tokenId,
        nftName,
        isPositive: true,
      });
    }

    // Count NFTs below cost basis (floor price < purchase price)
    const belowCost = nftsWithPnL.filter(nft => nft.floorPrice! < nft.purchasePriceGun!);
    if (belowCost.length > 0) {
      insights.push({
        type: 'below_cost',
        label: 'Below cost basis',
        value: `${belowCost.length}`,
        isPositive: false,
      });
    }
  }

  return insights.slice(0, maxInsights);
}
