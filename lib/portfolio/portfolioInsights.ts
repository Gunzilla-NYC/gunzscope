import { NFT } from '@/lib/types';

export interface PortfolioInsight {
  type: 'total_pnl' | 'best_performer' | 'worst_performer' | 'below_cost' | 'most_valuable' | 'gun_delta';
  label: string;
  value: string;
  tokenId?: string;
  nftName?: string;
  isPositive: boolean;
  /** Optional amber/neutral styling flag */
  isNeutral?: boolean;
}

/** Best available market price for an NFT (mirrors calcPortfolio waterfall). */
function getMarketGun(nft: NFT): number | undefined {
  return nft.currentLowestListing
    ?? nft.comparableSalesMedian
    ?? nft.rarityFloor
    ?? nft.floorPrice;
}

/** Compute GUN appreciation P&L in USD for an NFT (Track A). */
function getGunDeltaPnlUsd(nft: NFT, gunPrice: number): number | undefined {
  if (!nft.purchasePriceGun || nft.purchasePriceGun <= 0) return undefined;
  if (!nft.purchasePriceUsd || nft.purchasePriceUsd <= 0) return undefined;
  const historicalGunUsd = nft.purchasePriceUsd / nft.purchasePriceGun;
  const qty = nft.quantity ?? 1;
  return nft.purchasePriceGun * (gunPrice - historicalGunUsd) * qty;
}

/**
 * Generate portfolio insights from NFT data.
 * Includes both market-based and GUN appreciation P&L.
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
  const nftsWithMarketPnL = nfts.filter(nft => {
    const market = getMarketGun(nft);
    return nft.purchasePriceGun !== undefined
      && nft.purchasePriceGun > 0
      && market !== undefined
      && market > 0;
  });

  // NFTs with cost but NO market data — GUN Δ only
  const nftsGunDeltaOnly = nfts.filter(nft => {
    const market = getMarketGun(nft);
    return nft.purchasePriceGun !== undefined
      && nft.purchasePriceGun > 0
      && (!market || market <= 0)
      && nft.purchasePriceUsd !== undefined
      && nft.purchasePriceUsd > 0;
  });

  // NFTs with any market price (may not have cost basis)
  const nftsWithMarket = nfts.filter(nft => {
    const market = getMarketGun(nft);
    return market !== undefined && market > 0;
  });

  const sumQty = (arr: NFT[]) => arr.reduce((s, n) => s + (n.quantity ?? 1), 0);
  const totalTracked = sumQty(nftsWithMarketPnL) + sumQty(nftsGunDeltaOnly);

  // --- Total unrealized P&L (market + GUN Δ combined) ---
  if (totalTracked > 0) {
    let totalPnLUsd = 0;

    // Market-based P&L
    for (const nft of nftsWithMarketPnL) {
      const market = getMarketGun(nft)!;
      const qty = nft.quantity ?? 1;
      totalPnLUsd += (market - nft.purchasePriceGun!) * qty * gunPrice;
    }

    // GUN Δ P&L (currency appreciation)
    for (const nft of nftsGunDeltaOnly) {
      const delta = getGunDeltaPnlUsd(nft, gunPrice);
      if (delta !== undefined) totalPnLUsd += delta;
    }

    const sign = totalPnLUsd >= 0 ? '+' : '';
    insights.push({
      type: 'total_pnl',
      label: `Unrealized P&L`,
      value: `${sign}$${Math.abs(totalPnLUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      isPositive: totalPnLUsd >= 0,
    });
  }

  if (nftsWithMarketPnL.length > 0) {
    // Calculate gain percentage for each market-valued NFT
    const nftsWithGain = nftsWithMarketPnL.map(nft => ({
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

    // --- Below cost basis count (market-based only) ---
    const belowCost = nftsWithMarketPnL.filter(nft => getMarketGun(nft)! < nft.purchasePriceGun!);
    const belowCostQty = sumQty(belowCost);
    if (belowCostQty > 0) {
      insights.push({
        type: 'below_cost',
        label: 'Below cost basis',
        value: `${belowCostQty} of ${totalTracked}`,
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

  // --- GUN Δ items summary (if any exist) ---
  if (nftsGunDeltaOnly.length > 0) {
    let gunDeltaTotalUsd = 0;
    for (const nft of nftsGunDeltaOnly) {
      const delta = getGunDeltaPnlUsd(nft, gunPrice);
      if (delta !== undefined) gunDeltaTotalUsd += delta;
    }
    const sign = gunDeltaTotalUsd >= 0 ? '+' : '';
    insights.push({
      type: 'gun_delta',
      label: `GUN \u0394 items`,
      value: `${sumQty(nftsGunDeltaOnly)} · ${sign}$${Math.abs(gunDeltaTotalUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      isPositive: gunDeltaTotalUsd >= 0,
      isNeutral: true,
    });
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
