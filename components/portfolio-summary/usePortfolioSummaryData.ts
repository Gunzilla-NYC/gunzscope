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
      const floor = nft.floorPrice;
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

  // Performance changes from portfolio history
  const portfolioChanges = useMemo<PortfolioChanges>(() => {
    if (!walletAddress) return { change24h: null, changePercent24h: null, change7d: null, changePercent7d: null, hasEnoughData: false };
    return calculatePortfolioChanges(walletAddress, portfolioResult?.totalUsd ?? 0);
  }, [walletAddress, portfolioResult?.totalUsd]);

  // Sparkline values from portfolio history (up to 90 evenly-sampled points across full history)
  const sparklineValues = useMemo(() => {
    if (!walletAddress) return [];
    return getSparklineValues(walletAddress, 90);
  }, [walletAddress]);

  // NFT count history aligned with sparkline (same sampling)
  const nftCountHistory = useMemo(() => {
    if (!walletAddress) return [];
    return getSparklineNftCounts(walletAddress, 90);
  }, [walletAddress]);

  // How many days the sparkline spans (for hover tooltip)
  const sparklineSpanDays = useMemo(() => {
    if (!walletAddress) return 0;
    return getSparklineSpanDays(walletAddress);
  }, [walletAddress]);

  // Portfolio insights
  const insights = useMemo(() => {
    const coverageRatio = nftPnL.totalItems > 0 ? nftPnL.nftsWithCost / nftPnL.totalItems : 0;
    if (coverageRatio < 0.3) return [];
    return generateInsights(nfts, gunPrice);
  }, [nfts, gunPrice, nftPnL.nftsWithCost, nftPnL.totalItems]);

  // Format 24h/7d changes
  const change24h = formatChangeDisplay(portfolioChanges.change24h);
  const changePercent24h = formatChangeDisplay(portfolioChanges.changePercent24h, true);
  const change7d = formatChangeDisplay(portfolioChanges.change7d);
  const changePercent7d = formatChangeDisplay(portfolioChanges.changePercent7d, true);

  // Derived values
  const totalValue = portfolioResult?.totalUsd ?? 0;
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
    change24h, changePercent24h, change7d, changePercent7d,
    sparklineValues, sparklineSpanDays, nftCountHistory, insights,
    totalValue, gunHoldings, gunValue, totalGunSpent, nftCount,
    nftFloorValueUsd, gunPct, nftPct,
    isEnriching, isEnrichmentComplete, hasFailures, progressPct,
    isProfit, isLoss,
  };
}
