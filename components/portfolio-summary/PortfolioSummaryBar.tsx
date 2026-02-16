'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';
import { NFT, EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import useCountUp from '@/hooks/useCountUp';
import InsightsPanel from '@/components/ui/InsightsPanel';
import { clipHex } from '@/lib/utils/styles';
import ChartInsightsRow from './ChartInsightsRow';
import { usePortfolioSummaryData } from './usePortfolioSummaryData';
import { ValueHeader } from './ValueHeader';
import { SimpleMetrics } from './SimpleMetrics';

interface PortfolioSummaryBarProps {
  portfolioResult: PortfolioCalcResult | null;
  gunPrice: number | undefined;
  gunPriceSparkline?: number[];
  nfts: NFT[];
  /** Milestone-gated NFT array for charts — only updates at enrichment milestones */
  chartNfts?: NFT[];
  isInitializing?: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  onRetryEnrichment?: () => void;
  walletAddress?: string;
  walletCount?: number;
}

export default function PortfolioSummaryBar({
  portfolioResult,
  gunPrice,
  gunPriceSparkline,
  nfts,
  chartNfts,
  isInitializing = false,
  enrichmentProgress,
  walletAddress,
  walletCount,
}: PortfolioSummaryBarProps) {
  // All computed data from hook
  const data = usePortfolioSummaryData(portfolioResult, gunPrice, nfts, enrichmentProgress, walletAddress, gunPriceSparkline);

  // Animated count-up for total value (prefer market value when available)
  const displayTotal = data.hasMarketValue ? data.totalMarketValue : data.totalValue;
  const { displayValue: animatedTotal } = useCountUp({
    end: displayTotal,
    duration: 1500,
    decimals: 2,
    startOnMount: true,
  });

  // Toggle states (simple mode only)
  const [nftCardSparkline, setNftCardSparkline] = useState(false);
  const [showGunOverlay, setShowGunOverlay] = useState(false);
  const settingsLoadedRef = useRef(false);

  const toggleGunOverlay = useCallback(() => setShowGunOverlay(prev => !prev), []);

  // Load persisted nftCardSparkline from settings API (auth'd users)
  useEffect(() => {
    if (settingsLoadedRef.current) return;
    const token = getAuthToken();
    if (!token) return;
    settingsLoadedRef.current = true;
    fetch('/api/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.nftCardSparkline != null) setNftCardSparkline(!!d.nftCardSparkline); })
      .catch(() => {});
  }, []);

  const toggleNftCardSparkline = useCallback(() => {
    setNftCardSparkline(prev => {
      const next = !prev;
      const token = getAuthToken();
      if (token) {
        fetch('/api/settings', {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ nftCardSparkline: next }),
        }).catch(() => {});
      }
      return next;
    });
  }, []);

  // Acquisition timeline: cumulative NFT count over time (from enriched purchaseDate)
  // Uses sqrt time scale to compress long gaps while preserving recent activity detail
  const acquisitionTimeline = useMemo(() => {
    const dated = nfts
      .filter(nft => nft.purchaseDate)
      .flatMap(nft => {
        const t = new Date(nft.purchaseDate!).getTime();
        return Array.from({ length: nft.quantity || 1 }, () => t);
      })
      .sort((a, b) => a - b);

    if (dated.length < 2) return [];

    // Build cumulative series with timestamps
    let cumulative = 0;
    const events = dated.map(t => ({ t, count: ++cumulative }));

    const tMin = events[0].t;
    const tMax = events[events.length - 1].t;
    const slots = 40;

    // If all events happened at the same instant, fall back to step
    if (tMax - tMin < 1000) return [0, cumulative];

    // Start from zero, add a small margin before first event so curve rises from 0
    const margin = (tMax - tMin) * 0.08;
    const rangeStart = tMin - margin;
    const range = tMax - rangeStart;

    // pct^1.5 — gentler compression than pct² for smoother curves
    const sampled: number[] = [0]; // leading zero for the margin period
    let eventIdx = 0;
    for (let i = 1; i < slots; i++) {
      const pct = i / (slots - 1);
      const slotTime = rangeStart + Math.pow(pct, 1.5) * range;
      while (eventIdx < events.length - 1 && events[eventIdx + 1].t <= slotTime) {
        eventIdx++;
      }
      // Before first event: count is 0; after: use event count
      sampled.push(slotTime < tMin ? 0 : events[eventIdx].count);
    }
    return sampled;
  }, [nfts]);

  // nftCountHistory aligned with timeline (the values ARE cumulative counts)
  const nftCountHistory = useMemo((): (number | null)[] => {
    if (acquisitionTimeline.length >= 2) return acquisitionTimeline;
    return [];
  }, [acquisitionTimeline]);

  const gunSparklineValues = useMemo(() => {
    if (data.sparklineValues.length < 2 || data.totalValue <= 0) return [];
    const gunRatio = data.gunValue / data.totalValue;
    return data.sparklineValues.map(v => v * gunRatio);
  }, [data.sparklineValues, data.gunValue, data.totalValue]);

  const hasSparklineData = data.sparklineValues.length >= 2;

  if (!portfolioResult) return null;

  return (
    <div
      className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden"
      style={{ clipPath: clipHex(10) }}
    >
      {/* Value Header */}
      <ValueHeader
        isInitializing={isInitializing}
        animatedTotal={animatedTotal}
        confidence={portfolioResult.confidence}
        walletAddress={walletAddress}
        change7d={data.change7d}
        changePercent7d={data.changePercent7d}
        sparklineValues={data.sparklineValues}
        sparklineSpanDays={data.sparklineSpanDays}
        totalValue={data.totalValue}
        isEnriching={data.isEnriching}
        enrichmentProgress={enrichmentProgress}
        isEnrichmentComplete={data.isEnrichmentComplete}
        showGunOverlay={showGunOverlay}
        gunSparklineValues={gunSparklineValues}
        hasMarketValue={data.hasMarketValue}
        costBasisTotal={data.totalValue}
        nftCount={data.nftCount}
        gunBalance={data.gunHoldings}
        nftPnlPct={data.nftPnL.pct}
      />

      {/* Simple Mode: 4-Cell Metrics Row */}
      <SimpleMetrics
        isInitializing={isInitializing}
        gunHoldings={data.gunHoldings}
        gunValue={data.gunValue}
        nftCount={data.nftCount}
        nftFloorValueUsd={data.nftFloorValueUsd}
        nftPnL={data.nftPnL}
        nftCardSparkline={nftCardSparkline}
        onToggleNftCardSparkline={toggleNftCardSparkline}
        nftSparklineValues={acquisitionTimeline}
        nftCountHistory={nftCountHistory}
        showGunOverlay={showGunOverlay}
        onToggleGunOverlay={toggleGunOverlay}
        hasSparklineData={hasSparklineData}
        enrichmentProgress={enrichmentProgress}
        progressPct={data.progressPct}
        acquisitionBreakdown={data.acquisitionBreakdown}
        totalGunSpent={data.totalGunSpent}
        gunPrice={gunPrice}
        walletCount={walletCount}
      />

      {/* Charts + Insights — side-by-side on desktop, stacked on mobile */}
      {!isInitializing && nfts.length > 0 ? (
        <ChartInsightsRow nfts={chartNfts ?? nfts} gunPrice={gunPrice} insights={data.insights} />
      ) : data.insights.length > 0 && !isInitializing ? (
        <div className="border-t border-white/[0.06] px-6 py-3">
          <InsightsPanel insights={data.insights} />
        </div>
      ) : null}
    </div>
  );
}
