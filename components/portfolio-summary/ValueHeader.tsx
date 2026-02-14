'use client';

import { EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import BackdropChart from '@/components/charts/BackdropChart';
import { ChangeDisplay } from './types';

interface ValueHeaderProps {
  isInitializing: boolean;
  animatedTotal: string;
  confidence?: PortfolioCalcResult['confidence'];
  walletAddress?: string;
  change24h: ChangeDisplay;
  changePercent24h: ChangeDisplay;
  change7d: ChangeDisplay;
  changePercent7d: ChangeDisplay;
  sparklineValues: number[];
  sparklineSpanDays: number;
  totalValue: number;
  isEnriching: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  isEnrichmentComplete: boolean;
  totalPnLPct: number | null;
  isProfit: boolean;
  isLoss: boolean;
  showGunOverlay: boolean;
  gunSparklineValues: number[];
}

export function ValueHeader({
  isInitializing,
  animatedTotal, confidence, walletAddress,
  change24h, changePercent24h, change7d, changePercent7d,
  sparklineValues, sparklineSpanDays, totalValue,
  isEnriching, enrichmentProgress, isEnrichmentComplete,
  totalPnLPct, isProfit, isLoss,
  showGunOverlay, gunSparklineValues,
}: ValueHeaderProps) {
  const hasSparkline = sparklineValues.length >= 2 && !isInitializing;

  return (
    <div className="relative overflow-hidden">
      {/* Visx backdrop chart */}
      {hasSparkline && (
        <div className="absolute inset-0" aria-hidden="true">
          <BackdropChart
            values={sparklineValues}
            overlayValues={gunSparklineValues}
            showOverlay={showGunOverlay}
            spanDays={sparklineSpanDays}
            height={120}
          />
        </div>
      )}

      {/* Content layer */}
      <div className="relative z-10 p-6 pb-4">
        <div className="flex justify-between items-start">
          <div aria-live="polite" aria-busy={isInitializing}>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                Total Portfolio Value
              </p>
              {confidence && (
                <ConfidenceIndicator confidence={confidence} isGathering={isEnriching} />
              )}
            </div>
            {isInitializing ? (
              <div className="space-y-2">
                <span className="font-display text-4xl font-bold text-[var(--gs-gray-3)]">
                  Calculating
                </span>
                <div
                  className="h-[3px] w-48 bg-[var(--gs-dark-4)] overflow-hidden"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                >
                  <div
                    className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] animate-loading-bar"
                    style={{ width: '40%' }}
                  />
                </div>
              </div>
            ) : (
              <>
                <p className="font-display text-4xl font-bold text-[var(--gs-white)]">
                  ${animatedTotal}
                </p>
                {walletAddress && !(change24h.isCalculating && change7d.isCalculating) && (
                  <div className="flex items-center gap-3 mt-1">
                    {!change24h.isCalculating && (
                      <span className="font-mono text-[13px]">
                        <span className="text-[var(--gs-gray-3)] mr-1">24h</span>
                        <span className={change24h.colorClass}>{change24h.text}</span>
                        <span className={`text-data ml-0.5 ${changePercent24h.colorClass}`}>({changePercent24h.text})</span>
                      </span>
                    )}
                    {!change7d.isCalculating && (
                      <span className="font-mono text-[13px]">
                        <span className="text-[var(--gs-gray-3)] mr-1">7d</span>
                        <span className={change7d.colorClass}>{change7d.text}</span>
                        <span className={`text-data ml-0.5 ${changePercent7d.colorClass}`}>({changePercent7d.text})</span>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right column: P&L Badge */}
          <div className="flex items-center gap-2">
            {/* P&L Badge */}
            {totalPnLPct !== null && !isInitializing ? (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 border ${
                  isProfit
                    ? 'bg-[var(--gs-profit)]/10 border-[var(--gs-profit)]/30 text-[var(--gs-profit)]'
                    : isLoss
                    ? 'bg-[var(--gs-loss)]/10 border-[var(--gs-loss)]/30 text-[var(--gs-loss)]'
                    : 'bg-white/5 border-white/10 text-[var(--gs-gray-4)]'
                }`}
                style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
              >
                {isProfit && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {isLoss && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="font-mono text-sm font-semibold">
                  {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
