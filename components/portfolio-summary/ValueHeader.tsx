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
  change7d: ChangeDisplay;
  changePercent7d: ChangeDisplay;
  sparklineValues: number[];
  sparklineSpanDays: number;
  totalValue: number;
  isEnriching: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  isEnrichmentComplete: boolean;
  showGunOverlay: boolean;
  gunSparklineValues: number[];
}

export function ValueHeader({
  isInitializing,
  animatedTotal, confidence, walletAddress,
  change7d, changePercent7d,
  sparklineValues, sparklineSpanDays, totalValue,
  isEnriching,
  showGunOverlay, gunSparklineValues,
}: ValueHeaderProps) {
  const hasSparkline = sparklineValues.length >= 2 && !isInitializing;

  // 7d performance badge state
  const show7dBadge = walletAddress && !change7d.isCalculating && !isInitializing;
  const is7dUp = changePercent7d.text.startsWith('+') || (!changePercent7d.text.startsWith('-') && changePercent7d.text !== '0.0%');
  const is7dDown = changePercent7d.text.startsWith('-');

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
                {show7dBadge && (
                  <div
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 border text-[11px] ${
                      is7dUp
                        ? 'bg-[var(--gs-profit)]/8 border-[var(--gs-profit)]/20 text-[var(--gs-profit)]'
                        : is7dDown
                        ? 'bg-[var(--gs-loss)]/8 border-[var(--gs-loss)]/20 text-[var(--gs-loss)]'
                        : 'bg-white/5 border-white/10 text-[var(--gs-gray-4)]'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                  >
                    {is7dUp && (
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {is7dDown && (
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="font-mono font-semibold">
                      <span className="opacity-50 mr-0.5">7d</span>{changePercent7d.text}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
