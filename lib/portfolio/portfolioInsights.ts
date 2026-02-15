import { NFT } from '@/lib/types';

export interface PortfolioInsight {
  type: 'total_pnl' | 'best_performer' | 'worst_performer' | 'below_cost' | 'most_valuable';
  label: string;
  value: string;
  tokenId?: string;
  nftName?: string;
  isPositive: boolean;
}

/** Best available market price for an NFT (mirrors calcPortfolio waterfall). */
function getMarketGun(nft: NFT): number | undefined {
  return nft.currentLowestListing
    ?? nft.comparableSalesMedian
    ?? nft.rarityFloor
    ?? nft.floorPrice;
}

/**
 * Generate portfolio insights from NFT data.
 * Priority order: total P&L > best performer > below cost > most valuable > biggest loss.
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

  // Filter NFTs that have both purchase price and a market price for P&L analysis
  const nftsWithPnL = nfts.filter(nft => {
    const market = getMarketGun(nft);
    return nft.purchasePriceGun !== undefined
      && nft.purchasePriceGun > 0
      && market !== undefined
      && market > 0;
  });

  // NFTs with any market price (may not have cost basis)
  const nftsWithMarket = nfts.filter(nft => {
    const market = getMarketGun(nft);
    return market !== undefined && market > 0;
  });

  // --- Total unrealized P&L ---
  if (nftsWithPnL.length > 0) {
    let totalPnLGun = 0;
    for (const nft of nftsWithPnL) {
      const market = getMarketGun(nft)!;
      const qty = nft.quantity ?? 1;
      totalPnLGun += (market - nft.purchasePriceGun!) * qty;
    }
    const totalPnLUsd = totalPnLGun * gunPrice;
    const sign = totalPnLUsd >= 0 ? '+' : '';
    insights.push({
      type: 'total_pnl',
      label: 'Unrealized P&L',
      value: `${sign}$${Math.abs(totalPnLUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      isPositive: totalPnLUsd >= 0,
    });
  }

  if (nftsWithPnL.length > 0) {
    // Calculate gain percentage for each NFT
    const nftsWithGain = nftsWithPnL.map(nft => ({
      nft,
      gain: ((getMarketGun(nft)! - nft.purchasePriceGun!) / nft.purchasePriceGun!) * 100,
    }));
    nftsWithGain.sort((a, b) => b.gain - a.gain);

    // --- Best performer (highest % gain) ---
    const best = nftsWithGain[0];
    if (best && best.gain > 0) {
      insights.push({
        type: 'best_performer',
        label: 'Best performer',
        value: `+${Math.round(best.gain)}%`,
        tokenId: best.nft.tokenId,
        nftName: best.nft.name,
        isPositive: true,
      });
    }

    // --- Below cost basis count ---
    const belowCost = nftsWithPnL.filter(nft => getMarketGun(nft)! < nft.purchasePriceGun!);
    if (belowCost.length > 0) {
      insights.push({
        type: 'below_cost',
        label: 'Below cost basis',
        value: `${belowCost.length}`,
        isPositive: false,
      });
    }

    // --- Biggest loss (worst % decline) ---
    const worst = nftsWithGain[nftsWithGain.length - 1];
    if (worst && worst.gain < 0) {
      insights.push({
        type: 'worst_performer',
        label: 'Biggest loss',
        value: `${Math.round(worst.gain)}%`,
        tokenId: worst.nft.tokenId,
        nftName: worst.nft.name,
        isPositive: false,
      });
    }
  }

  // --- Most valuable NFT ---
  if (nftsWithMarket.length > 0) {
    let mostValuable: NFT | null = null;
    let highestUsd = 0;
    for (const nft of nftsWithMarket) {
      const usd = getMarketGun(nft)! * gunPrice;
      if (usd > highestUsd) {
        highestUsd = usd;
        mostValuable = nft;
      }
    }
    if (mostValuable && highestUsd > 0) {
      insights.push({
        type: 'most_valuable',
        label: 'Most valuable',
        value: `$${highestUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        tokenId: mostValuable.tokenId,
        nftName: mostValuable.name,
        isPositive: true,
      });
    }
  }

  return insights.slice(0, maxInsights);
}
