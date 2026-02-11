'use client';

import { useCallback, useMemo, useState } from 'react';
import { NFT, EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import useCountUp from '@/hooks/useCountUp';
import InsightsPanel from '@/components/ui/InsightsPanel';
import { PortfolioViewMode } from './types';
import { usePortfolioSummaryData } from './usePortfolioSummaryData';
import { ValueHeader } from './ValueHeader';
import { BreakdownDrawer } from './BreakdownDrawer';
import { SimpleMetrics } from './SimpleMetrics';
import { DetailedGrid } from './DetailedGrid';

interface PortfolioSummaryBarProps {
  portfolioResult: PortfolioCalcResult | null;
  gunPrice: number | undefined;
  nfts: NFT[];
  isInitializing?: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  onRetryEnrichment?: () => void;
  viewMode: PortfolioViewMode;
  onViewModeChange: (mode: PortfolioViewMode) => void;
  walletAddress?: string;
}

export default function PortfolioSummaryBar({
  portfolioResult,
  gunPrice,
  nfts,
  isInitializing = false,
  enrichmentProgress,
  onRetryEnrichment,
  viewMode,
  onViewModeChange,
  walletAddress,
}: PortfolioSummaryBarProps) {
  // All computed data from hook
  const data = usePortfolioSummaryData(portfolioResult, gunPrice, nfts, enrichmentProgress, walletAddress);

  // Animated count-up for total value
  const { displayValue: animatedTotal } = useCountUp({
    end: data.totalValue,
    duration: 1500,
    decimals: 2,
    startOnMount: true,
  });

  // Toggle states
  const [topExpanded, setTopExpanded] = useState(false);
  const [holdingsExpanded, setHoldingsExpanded] = useState(false);
  const [performanceExpanded, setPerformanceExpanded] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [showNftOverlay, setShowNftOverlay] = useState(false);
  const [showGunOverlay, setShowGunOverlay] = useState(false);

  const toggleTop = useCallback(() => setTopExpanded(prev => !prev), []);
  const toggleHoldings = useCallback(() => setHoldingsExpanded(prev => !prev), []);
  const togglePerformance = useCallback(() => setPerformanceExpanded(prev => !prev), []);
  const toggleBreakdown = useCallback(() => setBreakdownOpen(prev => !prev), []);
  const toggleNftOverlay = useCallback(() => setShowNftOverlay(prev => !prev), []);
  const toggleGunOverlay = useCallback(() => setShowGunOverlay(prev => !prev), []);

  // Derive overlay sparkline values by applying current ratio to total sparkline
  const nftSparklineValues = useMemo(() => {
    if (data.sparklineValues.length < 2 || data.totalValue <= 0) return [];
    const nftRatio = (data.nftFloorValueUsd ?? 0) / data.totalValue;
    return data.sparklineValues.map(v => v * nftRatio);
  }, [data.sparklineValues, data.nftFloorValueUsd, data.totalValue]);

  const gunSparklineValues = useMemo(() => {
    if (data.sparklineValues.length < 2 || data.totalValue <= 0) return [];
    const gunRatio = data.gunValue / data.totalValue;
    return data.sparklineValues.map(v => v * gunRatio);
  }, [data.sparklineValues, data.gunValue, data.totalValue]);

  const hasSparklineData = data.sparklineValues.length >= 2;

  const toggleViewMode = useCallback(() => {
    const next = viewMode === 'simple' ? 'detailed' : 'simple';
    if (next === 'simple') {
      setTopExpanded(false);
      setHoldingsExpanded(false);
      setPerformanceExpanded(false);
      setBreakdownOpen(false);
    }
    onViewModeChange(next);
  }, [viewMode, onViewModeChange]);

  if (!portfolioResult) return null;

  return (
    <div
      data-view={viewMode}
      className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden"
      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
    >
      {/* Value Header */}
      <ValueHeader
        viewMode={viewMode}
        isInitializing={isInitializing}
        topExpanded={topExpanded}
        onToggleTop={toggleTop}
        animatedTotal={animatedTotal}
        confidence={portfolioResult.confidence}
        walletAddress={walletAddress}
        change24h={data.change24h}
        changePercent24h={data.changePercent24h}
        change7d={data.change7d}
        changePercent7d={data.changePercent7d}
        sparklineValues={data.sparklineValues}
        sparklineSpanDays={data.sparklineSpanDays}
        totalValue={data.totalValue}
        gunHoldings={data.gunHoldings}
        gunValue={data.gunValue}
        nftCount={data.nftCount}
        nftFloorValueUsd={data.nftFloorValueUsd}
        totalGunSpent={data.totalGunSpent}
        gunPct={data.gunPct}
        nftPct={data.nftPct}
        isEnriching={data.isEnriching}
        enrichmentProgress={enrichmentProgress}
        isEnrichmentComplete={data.isEnrichmentComplete}
        hasFailures={data.hasFailures}
        progressPct={data.progressPct}
        totalPnLPct={data.totalPnLPct}
        isProfit={data.isProfit}
        isLoss={data.isLoss}
        onToggleViewMode={toggleViewMode}
        showNftOverlay={showNftOverlay}
        nftSparklineValues={nftSparklineValues}
        showGunOverlay={showGunOverlay}
        gunSparklineValues={gunSparklineValues}
      />

      {/* Breakdown Drawer (detailed mode only) */}
      {viewMode === 'detailed' && !isInitializing && (
        <BreakdownDrawer
          isOpen={breakdownOpen}
          onToggle={toggleBreakdown}
          gunValue={data.gunValue}
          gunHoldings={data.gunHoldings}
          gunPrice={gunPrice}
          nftFloorValueUsd={data.nftFloorValueUsd}
          totalGunSpent={data.totalGunSpent}
          nftPnL={data.nftPnL}
          isEnriching={data.isEnriching}
          enrichmentProgress={enrichmentProgress}
          progressPct={data.progressPct}
        />
      )}

      {/* Simple Mode: 4-Cell Metrics Row */}
      {viewMode === 'simple' && (
        <SimpleMetrics
          isInitializing={isInitializing}
          gunHoldings={data.gunHoldings}
          gunValue={data.gunValue}
          nftFloorValueUsd={data.nftFloorValueUsd}
          nftPnL={data.nftPnL}
          showNftOverlay={showNftOverlay}
          onToggleNftOverlay={toggleNftOverlay}
          showGunOverlay={showGunOverlay}
          onToggleGunOverlay={toggleGunOverlay}
          hasSparklineData={hasSparklineData}
        />
      )}

      {/* Detailed Mode: 2-Column Grid */}
      {viewMode === 'detailed' && (
        <DetailedGrid
          isInitializing={isInitializing}
          holdingsExpanded={holdingsExpanded}
          performanceExpanded={performanceExpanded}
          onToggleHoldings={toggleHoldings}
          onTogglePerformance={togglePerformance}
          acquisitionBreakdown={data.acquisitionBreakdown}
          gunValue={data.gunValue}
          gunHoldings={data.gunHoldings}
          gunPrice={gunPrice}
          gunPct={data.gunPct}
          nftPct={data.nftPct}
          nftCount={data.nftCount}
          nftFloorValueUsd={data.nftFloorValueUsd}
          totalGunSpent={data.totalGunSpent}
          nftPnL={data.nftPnL}
          isEnriching={data.isEnriching}
          enrichmentProgress={enrichmentProgress}
          hasFailures={data.hasFailures}
          progressPct={data.progressPct}
          onRetryEnrichment={onRetryEnrichment}
        />
      )}

      {/* Insights Panel */}
      {data.insights.length > 0 && !isInitializing && (
        <div className="border-t border-white/[0.06] px-6 py-3">
          <InsightsPanel insights={data.insights} />
        </div>
      )}
    </div>
  );
}
