import { useMemo } from 'react';
import { NFT, EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { calculatePortfolioChanges, getSparklineValues, getSparklineNftCounts, getSparklineSpanDays, PortfolioChanges } from '@/lib/utils/portfolioHistory';
import { generateInsights } from '@/lib/portfolio/portfolioInsights';
import { NftPnL, AcquisitionBreakdown } from './types';
import { formatChangeDisplay } from './utils';

export function usePortfolioSummaryData(
  portfolioResult: PortfolioCalcResult | null,
  gunPrice: number | undefined,
  nfts: NFT[],
  enrichmentProgress: EnrichmentProgress | null | undefined,
  walletAddress: string | undefined,
  gunPriceSparkline?: number[],
) {
  // Calculate NFT-based P&L from floor prices with coverage info
  const nftPnL = useMemo<NftPnL>(() => {
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

  // Acquisition breakdown by venue
  const acquisitionBreakdown = useMemo<AcquisitionBreakdown>(() => {
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

  // Calculate total portfolio P&L percentage
  const totalPnLPct = useMemo(() => {
    if (!portfolioResult || nftPnL.pct === null) return null;
    return nftPnL.pct;
  }, [portfolioResult, nftPnL.pct]);

  const totalValue = portfolioResult?.totalUsd ?? 0;

  // Performance changes from portfolio history
  // Falls back to GUN price-derived synthetic changes on first visit
  const portfolioChanges = useMemo<PortfolioChanges>(() => {
    if (!walletAddress) return { change24h: null, changePercent24h: null, change7d: null, changePercent7d: null, hasEnoughData: false };
    const real = calculatePortfolioChanges(walletAddress, portfolioResult?.totalUsd ?? 0);
    if (real.hasEnoughData) return real;

    // Synthetic fallback from GUN price sparkline (168 hourly points over 7 days)
    if (gunPriceSparkline && gunPriceSparkline.length >= 24 && gunPrice && gunPrice > 0 && totalValue > 0) {
      const holdingsMultiplier = totalValue / gunPrice;
      const len = gunPriceSparkline.length;
      // Index for ~24h ago (len points span 7 days, so 24h ≈ len/7 from the end)
      const idx24h = Math.max(0, Math.round(len - len / 7));
      const val24hAgo = gunPriceSparkline[idx24h] * holdingsMultiplier;
      const val7dAgo = gunPriceSparkline[0] * holdingsMultiplier;

      const synth: PortfolioChanges = {
        change24h: val24hAgo > 0 ? totalValue - val24hAgo : null,
        changePercent24h: val24hAgo > 0 ? ((totalValue - val24hAgo) / val24hAgo) * 100 : null,
        change7d: val7dAgo > 0 ? totalValue - val7dAgo : null,
        changePercent7d: val7dAgo > 0 ? ((totalValue - val7dAgo) / val7dAgo) * 100 : null,
        hasEnoughData: val24hAgo > 0,
      };
      return synth;
    }

    return real;
  }, [walletAddress, portfolioResult?.totalUsd, gunPriceSparkline, gunPrice, totalValue]);

  // Sparkline values from portfolio history (up to 90 evenly-sampled points across full history)
  // Falls back to GUN price-derived sparkline on first visit (no history yet)
  const historySparkline = useMemo(() => {
    if (!walletAddress) return [];
    return getSparklineValues(walletAddress, 90);
  }, [walletAddress]);

  const sparklineValues = useMemo(() => {
    // Use real history when available (2+ points)
    if (historySparkline.length >= 2) return historySparkline;
    // Fall back to GUN price sparkline: scale each price point by current holdings
    // portfolioValue ≈ gunPrice × totalGunDenominatedHoldings
    // so historicalValue ≈ historicalPrice × (currentValue / currentPrice)
    if (gunPriceSparkline && gunPriceSparkline.length >= 2 && gunPrice && gunPrice > 0 && totalValue > 0) {
      const holdingsMultiplier = totalValue / gunPrice;
      // Downsample to ~90 points for consistency
      const src = gunPriceSparkline;
      const count = Math.min(90, src.length);
      const result: number[] = [];
      for (let i = 0; i < count; i++) {
        const srcIdx = Math.round((i / (count - 1)) * (src.length - 1));
        result.push(src[srcIdx] * holdingsMultiplier);
      }
      return result;
    }
    return historySparkline;
  }, [historySparkline, gunPriceSparkline, gunPrice, totalValue]);

  // NFT count history aligned with sparkline (same sampling)
  const nftCountHistory = useMemo(() => {
    if (!walletAddress) return [];
    const history = getSparklineNftCounts(walletAddress, 90);
    // When using price-derived sparkline, fill NFT count with current count
    if (history.length < 2 && sparklineValues.length >= 2) {
      const nftC = portfolioResult?.nftCount ?? nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);
      return sparklineValues.map(() => nftC);
    }
    return history;
  }, [walletAddress, sparklineValues, portfolioResult?.nftCount, nfts]);

  // How many days the sparkline spans (for hover tooltip)
  const sparklineSpanDays = useMemo(() => {
    if (!walletAddress) return 0;
    const historyDays = getSparklineSpanDays(walletAddress);
    // Price sparkline covers 7 days when used as fallback
    if (historyDays === 0 && sparklineValues.length >= 2) return 7;
    return historyDays;
  }, [walletAddress, sparklineValues]);

  // Portfolio insights
  const insights = useMemo(() => {
    const coverageRatio = nftPnL.totalItems > 0 ? nftPnL.nftsWithCost / nftPnL.totalItems : 0;
    if (coverageRatio < 0.3) return [];
    return generateInsights(nfts, gunPrice);
  }, [nfts, gunPrice, nftPnL.nftsWithCost, nftPnL.totalItems]);

  // Format 7d changes (24h removed — no longer displayed in summary)
  const change7d = formatChangeDisplay(portfolioChanges.change7d);
  const changePercent7d = formatChangeDisplay(portfolioChanges.changePercent7d, true);

  // Derived values
  const gunHoldings = portfolioResult?.totalGunBalance ?? 0;
  const gunValue = portfolioResult?.tokensUsd ?? 0;
  const totalGunSpent = portfolioResult?.totalGunSpent ?? 0;
  const nftCount = portfolioResult?.nftCount ?? nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);
  const nftFloorValueUsd = portfolioResult?.nftsUsd ?? null;
  const gunPct = totalValue > 0 ? (gunValue / totalValue) * 100 : 0;
  const nftPct = totalValue > 0 ? ((nftFloorValueUsd ?? 0) / totalValue) * 100 : 0;

  // Enrichment helpers
  // isEnriching: true while batches are actively processing OR between pages (totalItems < nftCount)
  const isEnriching = enrichmentProgress != null && (
    enrichmentProgress.phase === 'enriching' || nftPnL.totalItems < nftCount
  );
  const isEnrichmentComplete = enrichmentProgress?.phase === 'complete' && nftPnL.totalItems >= nftCount;
  const hasFailures = isEnrichmentComplete && (enrichmentProgress?.failedCount ?? 0) > 0;
  const progressPct = enrichmentProgress && enrichmentProgress.total > 0
    ? Math.round((enrichmentProgress.completed / enrichmentProgress.total) * 100)
    : null;

  const isProfit = totalPnLPct !== null && totalPnLPct > 0.01;
  const isLoss = totalPnLPct !== null && totalPnLPct < -0.01;

  return {
    nftPnL, acquisitionBreakdown, totalPnLPct,
    change7d, changePercent7d,
    sparklineValues, sparklineSpanDays, nftCountHistory, insights,
    totalValue, gunHoldings, gunValue, totalGunSpent, nftCount,
    nftFloorValueUsd, gunPct, nftPct,
    isEnriching, isEnrichmentComplete, hasFailures, progressPct,
    isProfit, isLoss,
  };
}
