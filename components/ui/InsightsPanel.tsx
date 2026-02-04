'use client';

import { PortfolioInsight } from '@/lib/portfolio/portfolioInsights';

interface InsightsPanelProps {
  insights: PortfolioInsight[];
  isLoading?: boolean;
  onInsightClick?: (insight: PortfolioInsight) => void;
}

/**
 * Panel displaying auto-generated portfolio insights.
 * Shows key metrics like best performer and NFTs below cost basis.
 */
export default function InsightsPanel({ insights, isLoading, onInsightClick }: InsightsPanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-7 bg-white/5 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--gs-gray-4)]">
        Insights
      </p>
      {insights.map((insight, idx) => (
        <button
          key={insight.type}
          onClick={() => onInsightClick?.(insight)}
          disabled={!onInsightClick}
          className={`w-full flex items-center justify-between px-2.5 py-2 bg-white/[0.03] rounded transition-colors text-left ${
            onInsightClick ? 'hover:bg-white/[0.06] cursor-pointer' : 'cursor-default'
          }`}
          style={{
            opacity: 0,
            animation: `nft-card-fade-in 300ms ease-out ${idx * 100}ms forwards`,
          }}
        >
          <span className="text-[11px] text-white/70 flex items-center gap-1.5">
            {/* Icon based on insight type */}
            {insight.type === 'best_performer' && (
              <svg className="w-3 h-3 text-[var(--gs-profit)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {insight.type === 'below_cost' && (
              <svg className="w-3 h-3 text-[var(--gs-loss)]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span>{insight.label}</span>
            {insight.nftName && (
              <span className="text-white/40 truncate max-w-[80px]">· {insight.nftName}</span>
            )}
          </span>
          <span
            className={`text-[11px] font-mono font-medium ${
              insight.isPositive ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'
            }`}
          >
            {insight.value}
          </span>
        </button>
      ))}
    </div>
  );
}
