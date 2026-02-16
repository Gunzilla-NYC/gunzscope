import { useMemo } from 'react';
import { NFT, EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { useNftPnL } from './hooks/useNftPnL';
import { useAcquisitionBreakdown } from './hooks/useAcquisitionBreakdown';
import { usePortfolioPerformance } from './hooks/usePortfolioPerformance';
import { usePortfolioInsights } from './hooks/usePortfolioInsights';

export function usePortfolioSummaryData(
  portfolioResult: PortfolioCalcResult | null,
  gunPrice: number | undefined,
  nfts: NFT[],
  enrichmentProgress: EnrichmentProgress | null | undefined,
  walletAddress: string | undefined,
  gunPriceSparkline?: number[],
) {
  const nftPnL = useNftPnL(nfts, gunPrice);
  const acquisitionBreakdown = useAcquisitionBreakdown(nfts);

  const totalValue = portfolioResult?.totalUsd ?? 0;

  // P&L percentage (pass-through from nftPnL)
  const totalPnLPct = useMemo(() => {
    if (!portfolioResult || nftPnL.pct === null) return null;
    return nftPnL.pct;
  }, [portfolioResult, nftPnL.pct]);

  // Derived values from portfolioResult
  const gunHoldings = portfolioResult?.totalGunBalance ?? 0;
  const gunValue = portfolioResult?.tokensUsd ?? 0;
  const totalGunSpent = portfolioResult?.totalGunSpent ?? 0;
  const nftCount = portfolioResult?.nftCount ?? nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);
  const nftFloorValueUsd = portfolioResult?.nftsUsd ?? null;
  const gunPct = totalValue > 0 ? (gunValue / totalValue) * 100 : 0;
  const nftPct = totalValue > 0 ? ((nftFloorValueUsd ?? 0) / totalValue) * 100 : 0;

  // Market value: estimated total using listing > floor > cost basis waterfall
  const totalMarketValue = portfolioResult?.totalMarketValueUsd ?? totalValue;
  const nftsMarketValueUsd = portfolioResult?.nftsMarketValueUsd ?? 0;
  const nftsWithMarketValue = portfolioResult?.nftsWithMarketValue ?? 0;
  const hasMarketValue = nftsWithMarketValue > 0 && Math.abs(totalMarketValue - totalValue) > 0.01;

  // Performance (sparklines, 7d changes)
  const { change7d, changePercent7d, sparklineValues, sparklineSpanDays, nftCountHistory } =
    usePortfolioPerformance(portfolioResult, gunPrice, walletAddress, nfts, gunPriceSparkline);

  // Insights
  const insights = usePortfolioInsights(nfts, gunPrice, nftPnL.nftsWithCost, nftPnL.totalItems);

  // Enrichment helpers
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
    totalMarketValue, nftsMarketValueUsd, nftsWithMarketValue, hasMarketValue,
    isEnriching, isEnrichmentComplete, hasFailures, progressPct,
    isProfit, isLoss,
  };
}
