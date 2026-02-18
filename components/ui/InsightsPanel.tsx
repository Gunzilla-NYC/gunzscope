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
      <div className="flex items-center gap-2">
        <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)]">
          Insights
        </p>
        <span className="font-mono text-[8px] uppercase tracking-widest px-1.5 py-0.5 text-[#FF9F43] border border-[#FF9F43]/30 bg-[#FF9F43]/[0.08]">
          Under Active Dev
        </span>
      </div>
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
          <span className="text-data text-white/70 flex items-center gap-1.5">
            {/* Icon based on insight type */}
            {insight.type === 'total_pnl' && (
              <svg className={`w-3 h-3 ${insight.isPositive ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
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
            {insight.type === 'most_valuable' && (
              <svg className="w-3 h-3 text-[var(--gs-lime)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            )}
            {insight.type === 'worst_performer' && (
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
            className={`text-data font-mono font-medium ${
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
