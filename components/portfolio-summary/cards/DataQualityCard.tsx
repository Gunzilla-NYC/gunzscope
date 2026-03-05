import { memo, useState, useCallback } from 'react';
import { EnrichmentProgress } from '@/lib/types';
import { DotIndicator } from '@/components/ui/DotIndicator';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { NftPnL, AcquisitionBreakdown } from '../types';

/** Format a date as a relative time string (e.g. "Just now", "2m ago", "1h ago"). */
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface DataQualityCardProps {
  isInitializing: boolean;
  nftCount: number;
  nftPnL: NftPnL;
  acquisitionBreakdown: AcquisitionBreakdown;
  enrichmentProgress?: EnrichmentProgress | null;
  cachedAt?: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const DataQualityCard = memo(function DataQualityCard({
  isInitializing,
  nftCount,
  nftPnL,
  acquisitionBreakdown,
  enrichmentProgress,
  cachedAt,
  onRefresh,
  isRefreshing,
}: DataQualityCardProps) {
  const [holdingsView, setHoldingsView] = useState(2); // 0=counts, 1=percentages, 2=coverage
  const cycle = useCallback(() => setHoldingsView(prev => (prev + 1) % 3), []);

  const isActiveEnrichment = enrichmentProgress != null && enrichmentProgress.phase !== 'complete';
  const enrichedCount = isActiveEnrichment && enrichmentProgress!.total > 0
    ? enrichmentProgress!.completed
    : nftPnL.totalItems;
  const enrichedPct = nftCount > 0 ? Math.min(100, Math.round((enrichedCount / nftCount) * 100)) : 0;
  const isScanning = enrichmentProgress != null && enrichedCount < nftCount;

  const pctOf = (n: number) => nftCount > 0 ? Math.round((n / nftCount) * 100) : 0;
  const resolvedCount = acquisitionBreakdown.minted + acquisitionBreakdown.bought + acquisitionBreakdown.transferred;
  const withDatesPct = nftCount > 0 ? Math.round((resolvedCount / nftCount) * 100) : 0;
  const withCostPct = nftCount > 0 ? Math.round((nftPnL.nftsWithCost / nftCount) * 100) : 0;

  const isStale = cachedAt != null && (Date.now() - cachedAt.getTime()) > 24 * 60 * 60 * 1000;

  const holdingsLabels = ['Holdings', 'Distribution', 'Data Quality'] as const;

  return (
    <div
      data-testid="data-quality-card"
      className="px-4 py-3 cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
      onClick={cycle}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
          {holdingsLabels[holdingsView]}
        </p>
        <DotIndicator count={3} activeIndex={holdingsView} />
        {/* Pulsing live dot when scanning */}
        {isScanning && holdingsView === 2 && (
          <span
            className="text-[var(--gs-lime)] text-[8px] leading-none"
            style={{ animation: 'confidence-blink 2s ease-in-out infinite' }}
          >&#9679;</span>
        )}
        {/* State A: Enriching — spinner + counter */}
        {(isScanning || isRefreshing) && holdingsView === 2 && (
          <span className="flex items-center gap-1 ml-auto">
            <span className="animate-spin inline-block w-2.5 h-2.5"><svg className="w-2.5 h-2.5 text-[var(--gs-lime)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
              <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg></span>
            <span className="font-mono text-micro text-[var(--gs-lime)] tabular-nums">
              {isRefreshing && !isScanning ? 'Refreshing\u2026' : `${enrichedCount}/${nftCount}`}
            </span>
          </span>
        )}
        {/* State B: Complete — checkmark/stale dot + sync timestamp + refresh button */}
        {!isScanning && !isRefreshing && holdingsView === 2 && nftCount > 0 && enrichedPct > 0 && (
          <span className="flex items-center gap-1.5 ml-auto" onClick={e => e.stopPropagation()}>
            {isStale ? (
              <span className="text-[#FFAA00] text-[8px] leading-none">&#9679;</span>
            ) : (
              <svg className="w-2.5 h-2.5 text-[var(--gs-lime)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5L6.5 12L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span className={`font-mono text-micro tabular-nums ${isStale ? 'text-[#FFAA00]' : 'text-[var(--gs-gray-3)]'}`}>
              {cachedAt ? `Synced ${formatRelativeTime(cachedAt)}` : 'Enriched'}
            </span>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors min-h-5 min-w-5 flex items-center justify-center"
                title="Refresh portfolio data"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </span>
        )}
      </div>
      {isInitializing ? (
        <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className="grid">
          {/* View 0: Counts */}
          <div
            style={{ gridArea: '1/1' }}
            className={`transition-opacity duration-300 ease-out space-y-1.5 ${
              holdingsView === 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {resolvedCount === 0 && acquisitionBreakdown.pending === 0 ? (
              <div className="space-y-1.5">
                <span className="font-mono text-xs text-[var(--gs-gray-3)]/60">
                  {nftCount > 0 ? 'Scanning acquisition history\u2026' : 'No NFTs loaded'}
                </span>
                <div className="flex gap-3">
                  <span className="font-mono text-xs"><span className="text-[var(--gs-lime)]/20 mr-1.5">&#9670;</span><span className="text-[var(--gs-gray-3)]/30">Minted</span></span>
                  <span className="font-mono text-xs"><span className="text-[var(--gs-purple)]/20 mr-1.5">&#9670;</span><span className="text-[var(--gs-gray-3)]/30">Bought</span></span>
                  <span className="font-mono text-xs"><span className="text-[var(--gs-gray-2)]/20 mr-1.5">&#9670;</span><span className="text-[var(--gs-gray-3)]/30">Free</span></span>
                </div>
              </div>
            ) : (
              <>
                {(acquisitionBreakdown.minted > 0 || acquisitionBreakdown.bought > 0) && (
                  <span className="font-mono text-xs block">
                    {acquisitionBreakdown.bought > 0 && (
                      <>
                        <span className="text-[var(--gs-purple)] mr-1.5">&#9670;</span>
                        <span className="text-[var(--gs-white)]">{acquisitionBreakdown.bought}</span>
                        <span className="text-[var(--gs-gray-3)] ml-1">Bought</span>
                      </>
                    )}
                    {acquisitionBreakdown.bought > 0 && acquisitionBreakdown.minted > 0 && (
                      <span className="text-[var(--gs-gray-3)]/30 mx-2">&middot;</span>
                    )}
                    {acquisitionBreakdown.minted > 0 && (
                      <>
                        <span className="text-[var(--gs-lime)] mr-1.5">&#9670;</span>
                        <span className="text-[var(--gs-white)]">{acquisitionBreakdown.minted}</span>
                        <span className="text-[var(--gs-gray-3)] ml-1">Minted</span>
                      </>
                    )}
                  </span>
                )}
                {acquisitionBreakdown.transferred > 0 && (
                  <span className="font-mono text-xs block">
                    <span className="text-[var(--gs-gray-2)] mr-1.5">&#9670;</span>
                    <span className="text-[var(--gs-white)]">{acquisitionBreakdown.transferred}</span>
                    <span className="text-[var(--gs-gray-3)] ml-1">Free</span>
                  </span>
                )}
                {acquisitionBreakdown.pending > 0 && (
                  <span className="font-mono text-xs block">
                    <span className="text-[var(--gs-gray-3)]/40 mr-1.5">&#9670;</span>
                    <span className="text-[var(--gs-white)]">{acquisitionBreakdown.pending}</span>
                    <span className="text-[var(--gs-gray-3)] ml-1">Unresolved</span>
                  </span>
                )}
              </>
            )}
          </div>

          {/* View 1: Percentages */}
          <div
            style={{ gridArea: '1/1', transitionDelay: holdingsView === 1 ? '100ms' : '0ms' }}
            className={`transition-opacity duration-300 ease-out space-y-1.5 ${
              holdingsView === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {resolvedCount === 0 && acquisitionBreakdown.pending === 0 ? (
              <div className="space-y-1.5">
                <span className="font-mono text-xs text-[var(--gs-gray-3)]/60">
                  {nftCount > 0 ? 'Resolving categories\u2026' : 'No NFTs loaded'}
                </span>
                <div className="space-y-1">
                  <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden"><div className="h-full bg-[var(--gs-lime)]/10" style={{ width: '33%' }} /></div>
                  <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden"><div className="h-full bg-[var(--gs-purple)]/10" style={{ width: '33%' }} /></div>
                  <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden"><div className="h-full bg-[var(--gs-gray-2)]/10" style={{ width: '33%' }} /></div>
                </div>
              </div>
            ) : (
              <>
                {acquisitionBreakdown.minted > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">
                      <span className="text-[var(--gs-lime)] mr-1.5">&#9670;</span>
                      <span className="text-[var(--gs-white)]">{pctOf(acquisitionBreakdown.minted)}%</span>
                      <span className="text-[var(--gs-gray-3)] ml-1">Minted</span>
                    </span>
                  </div>
                )}
                {acquisitionBreakdown.bought > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">
                      <span className="text-[var(--gs-purple)] mr-1.5">&#9670;</span>
                      <span className="text-[var(--gs-white)]">{pctOf(acquisitionBreakdown.bought)}%</span>
                      <span className="text-[var(--gs-gray-3)] ml-1">Bought</span>
                    </span>
                  </div>
                )}
                {acquisitionBreakdown.transferred > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">
                      <span className="text-[var(--gs-gray-2)] mr-1.5">&#9670;</span>
                      <span className="text-[var(--gs-white)]">{pctOf(acquisitionBreakdown.transferred)}%</span>
                      <span className="text-[var(--gs-gray-3)] ml-1">Free</span>
                    </span>
                  </div>
                )}
                {acquisitionBreakdown.pending > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">
                      <span className="text-[var(--gs-gray-3)]/40 mr-1.5">&#9670;</span>
                      <span className="text-[var(--gs-white)]">{pctOf(acquisitionBreakdown.pending)}%</span>
                      <span className="text-[var(--gs-gray-3)] ml-1">Unresolved</span>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* View 2: Data Quality */}
          <div
            style={{ gridArea: '1/1', transitionDelay: holdingsView === 2 ? '100ms' : '0ms' }}
            className={`transition-opacity duration-300 ease-out space-y-2 ${
              holdingsView === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <ProgressBar
              label="With dates" value={withDatesPct} color="var(--gs-lime)"
              shimmer={isScanning}
              valueLabel={isScanning ? `${resolvedCount}/${nftCount}` : undefined}
            />
            <ProgressBar
              label="With cost" value={withCostPct} color="var(--gs-purple)"
              shimmer={isScanning}
              valueLabel={isScanning ? `${nftPnL.nftsWithCost}/${nftCount}` : undefined}
            />
            <ProgressBar
              label="Enriched" value={enrichedPct} color="rgba(255,255,255,0.3)"
              shimmer={isScanning}
              scanning={isActiveEnrichment && !isScanning}
              valueLabel={isScanning ? `${enrichedCount}/${nftCount}` : undefined}
            />
          </div>
        </div>
      )}
    </div>
  );
});
