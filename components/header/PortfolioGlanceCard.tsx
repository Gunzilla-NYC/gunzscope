'use client';

import { useMemo, useState } from 'react';
import Sparkline from '@/components/ui/Sparkline';
import WaffleChart from '@/components/ui/WaffleChart';
import PnLLoadingIndicator from '@/components/ui/PnLLoadingIndicator';
import CoverageBadge from '@/components/ui/CoverageBadge';
import { calculatePortfolioChanges, getSparklineValues, PortfolioChanges } from '@/lib/utils/portfolioHistory';
import { EnrichmentProgress } from '@/lib/types';

interface PortfolioBreakdown {
  gunValue: number;
  nftValue: number;
  otherValue: number;
  nftCount: number;
  totalGunSpent?: number;
}

interface CostBasis {
  tokens: number | null;
  nfts: number | null;
  total: number | null;
}

interface PortfolioGlanceCardProps {
  address: string;
  totalValue: number;
  breakdown: PortfolioBreakdown;
  costBasis?: CostBasis;
  pnlLoading?: boolean;
  pnlCoverage?: number;  // 0-1, fraction of NFTs with cost basis
  enrichmentProgress?: EnrichmentProgress | null;
  className?: string;
}

/**
 * Format a number as USD currency
 */
function formatUSD(value: number, decimals: number = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a change value with sign and appropriate styling
 */
function formatChange(
  value: number | null,
  isPercent: boolean = false
): { text: string; colorClass: string; isCalculating: boolean } {
  if (value === null) {
    return { text: 'Calculating…', colorClass: 'text-[var(--gs-gray-2)]', isCalculating: true };
  }

  const sign = value >= 0 ? '+' : '';
  const formatted = isPercent
    ? `${sign}${value.toFixed(2)}%`
    : `${sign}$${formatUSD(Math.abs(value))}`;

  const colorClass = value > 0 ? 'text-[#beffd2]' : value < 0 ? 'text-[#ff6b6b]' : 'text-[var(--gs-gray-3)]';

  return {
    text: value >= 0 ? formatted : `-$${formatUSD(Math.abs(value))}`,
    colorClass,
    isCalculating: false,
  };
}

export default function PortfolioGlanceCard({
  address,
  totalValue,
  breakdown,
  costBasis,
  pnlLoading = false,
  pnlCoverage,
  enrichmentProgress,
  className = '',
}: PortfolioGlanceCardProps) {
  const [showPerformanceTooltip, setShowPerformanceTooltip] = useState(false);

  // Get portfolio changes from history
  const changes = useMemo<PortfolioChanges>(() => {
    return calculatePortfolioChanges(address, totalValue);
  }, [address, totalValue]);

  // Get sparkline values
  const sparklineValues = useMemo(() => {
    return getSparklineValues(address, 24);
  }, [address]);

  // Calculate PnL if cost basis is available
  const pnl = useMemo(() => {
    if (!costBasis) return null;

    const tokenPnL = costBasis.tokens !== null ? breakdown.gunValue - costBasis.tokens : null;
    const nftPnL = costBasis.nfts !== null ? breakdown.nftValue - costBasis.nfts : null;
    const totalPnL = costBasis.total !== null ? totalValue - costBasis.total : null;

    return { tokens: tokenPnL, nfts: nftPnL, total: totalPnL };
  }, [breakdown, totalValue, costBasis]);

  // Waffle chart percentages
  const waffleData = useMemo(() => {
    const total = totalValue > 0 ? totalValue : 1;
    const gunPercent = (breakdown.gunValue / total) * 100;
    const nftPercent = (breakdown.nftValue / total) * 100;
    return { gunPercent, nftPercent };
  }, [totalValue, breakdown]);

  // Format changes
  const change24h = formatChange(changes.change24h);
  const changePercent24h = formatChange(changes.changePercent24h, true);
  const change7d = formatChange(changes.change7d);
  const changePercent7d = formatChange(changes.changePercent7d, true);

  const isCalculating = change24h.isCalculating || change7d.isCalculating;

  return (
    <div className={`p-5 ${className}`}>
      {/* Performance section - now at top */}
      <div>
        {/* Performance eyebrow with sparkline and tooltip */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-1.5 relative">
            <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium">
              Performance
            </span>
            {isCalculating && (
              <button
                className="relative"
                onMouseEnter={() => setShowPerformanceTooltip(true)}
                onMouseLeave={() => setShowPerformanceTooltip(false)}
                aria-label="Performance info"
              >
                <svg className="w-3 h-3 text-white/30 hover:text-white/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {showPerformanceTooltip && (
                  <div className="absolute left-0 top-full mt-1 z-50 w-48 bg-black/95 border border-white/20 rounded-lg px-3 py-2 text-[11px] text-white/70 shadow-xl">
                    Change metrics appear after enough history is collected.
                  </div>
                )}
              </button>
            )}
          </div>
          {/* Sparkline aligned to the right */}
          <div className="flex-shrink-0 opacity-80">
            <Sparkline
              values={sparklineValues.length > 0 ? sparklineValues : [totalValue, totalValue]}
              width={90}
              height={36}
              strokeWidth={1.25}
              showFill={true}
              showCurrentDot={true}
            />
          </div>
        </div>

        {/* Performance metrics - two columns */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[12px] text-[var(--gs-gray-3)]">24h:</span>
            {change24h.isCalculating ? (
              <span className="text-[13px] font-medium text-[var(--gs-gray-2)] italic">{change24h.text}</span>
            ) : (
              <>
                <span className={`text-[13px] font-medium ${change24h.colorClass}`}>{change24h.text}</span>
                <span className={`text-[11px] ${changePercent24h.colorClass}`}>({changePercent24h.text})</span>
              </>
            )}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[12px] text-[var(--gs-gray-3)]">7d:</span>
            {change7d.isCalculating ? (
              <span className="text-[13px] font-medium text-[var(--gs-gray-2)] italic">{change7d.text}</span>
            ) : (
              <>
                <span className={`text-[13px] font-medium ${change7d.colorClass}`}>{change7d.text}</span>
                <span className={`text-[11px] ${changePercent7d.colorClass}`}>({changePercent7d.text})</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Composition section - Waffle Chart */}
      <div className="border-t border-white/[0.06] pt-3 mt-3">
        <span className="text-[11px] tracking-[0.12em] uppercase text-[var(--gs-gray-3)] font-medium mb-3 block">
          Composition
        </span>
        <div className="flex justify-center">
          <WaffleChart
            gunPercent={waffleData.gunPercent}
            nftPercent={waffleData.nftPercent}
            gunValueUsd={breakdown.gunValue}
            nftValueUsd={breakdown.nftValue}
            nftCount={breakdown.nftCount}
            size={140}
            showLegend={true}
            gunCostBasis={costBasis?.tokens}
            nftCostBasis={costBasis?.nfts}
            gunPnl={pnl?.tokens}
            nftPnl={pnl?.nfts}
            totalGunSpent={breakdown.totalGunSpent}
          />
        </div>
        {/* P&L Status */}
        <PnLLoadingIndicator isLoading={pnlLoading} progress={enrichmentProgress} />
        {!pnlLoading && pnlCoverage !== undefined && pnlCoverage > 0 && (
          <div className="flex justify-center mt-2">
            <CoverageBadge coverage={pnlCoverage} />
          </div>
        )}
      </div>

      {/* Status line - tertiary helper text */}
      {!changes.hasEnoughData && (
        <div className="mt-2 text-[12px] text-[var(--gs-gray-2)] flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Collecting history data…</span>
        </div>
      )}
    </div>
  );
}
