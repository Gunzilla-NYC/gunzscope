'use client';

import dynamic from 'next/dynamic';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';

const BackdropChart = dynamic(() => import('@/components/charts/BackdropChart'), { ssr: false });
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import type { InsanitySummaryData } from '../hooks/useInsanityData';

interface InsanityValueHeaderProps {
  data: InsanitySummaryData;
  portfolioResult: PortfolioCalcResult | null;
  animatedTotal: string;
  isInitializing: boolean;
  gunSparklineValues: number[];
}

export function InsanityValueHeader({
  data,
  portfolioResult,
  animatedTotal,
  isInitializing,
  gunSparklineValues,
}: InsanityValueHeaderProps) {
  const hasSparkline = data.sparklineValues.length >= 2 && !isInitializing;

  return (
    <div className="relative overflow-hidden">
      {hasSparkline && (
        <div className="absolute inset-0" aria-hidden="true">
          <BackdropChart
            values={data.sparklineValues}
            overlayValues={gunSparklineValues}
            showOverlay={false}
            spanDays={data.sparklineSpanDays}
            height={120}
          />
        </div>
      )}
      <div className="relative z-10 p-6 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                Total Portfolio Value
              </p>
              {portfolioResult?.confidence && (
                <ConfidenceIndicator confidence={portfolioResult.confidence} isGathering={data.isEnriching} />
              )}
              {!isInitializing && portfolioResult?.confidence && (
                <span className="font-mono text-micro tracking-wider text-[var(--gs-gray-3)] border border-white/[0.08] px-1.5 py-0.5 ml-1">
                  {portfolioResult.confidence.percentage}% data confidence
                </span>
              )}
            </div>
            {isInitializing ? (
              <div className="space-y-2">
                <span className="font-display text-4xl font-bold text-[var(--gs-gray-3)]">Calculating</span>
                <div
                  className="h-[3px] w-48 bg-[var(--gs-dark-4)] overflow-hidden"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                >
                  <div className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] animate-loading-bar" style={{ width: '40%' }} />
                </div>
              </div>
            ) : (
              <>
                <p className="font-display text-4xl font-bold text-[var(--gs-white)]">${animatedTotal}</p>
                <p className="font-mono text-caption text-[var(--gs-gray-3)] mt-1">
                  <span className="text-[var(--gs-lime)]">{data.gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="text-[var(--gs-gray-2)]"> GUN</span>
                  <span className="text-[var(--gs-gray-2)] mx-1.5">&middot;</span>
                  <span className="text-[var(--gs-purple)]">{data.nftCount.toLocaleString()}</span>
                  <span className="text-[var(--gs-gray-2)]"> NFTs</span>
                </p>
              </>
            )}
          </div>

          {/* P&L Badge */}
          {data.totalPnLPct !== null && !isInitializing && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 border ${
                data.isProfit
                  ? 'bg-[var(--gs-profit)]/10 border-[var(--gs-profit)]/30 text-[var(--gs-profit)]'
                  : data.isLoss
                  ? 'bg-[var(--gs-loss)]/10 border-[var(--gs-loss)]/30 text-[var(--gs-loss)]'
                  : 'bg-white/5 border-white/10 text-[var(--gs-gray-4)]'
              }`}
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            >
              {data.isProfit && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {data.isLoss && (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-mono text-sm font-semibold">
                {data.totalPnLPct >= 0 ? '+' : ''}{data.totalPnLPct.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
