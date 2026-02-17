import { memo, useState, useCallback } from 'react';
import { EnrichmentProgress } from '@/lib/types';
import { DotIndicator } from '@/components/ui/DotIndicator';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { NftPnL, AcquisitionBreakdown } from '../types';

interface DataQualityCardProps {
  isInitializing: boolean;
  nftCount: number;
  nftPnL: NftPnL;
  acquisitionBreakdown: AcquisitionBreakdown;
  enrichmentProgress?: EnrichmentProgress | null;
}

export const DataQualityCard = memo(function DataQualityCard({
  isInitializing,
  nftCount,
  nftPnL,
  acquisitionBreakdown,
  enrichmentProgress,
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

  const holdingsLabels = ['Holdings', 'Distribution', 'Data Quality'] as const;

  return (
    <div
      className="px-4 py-3 cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
      onClick={cycle}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
          {holdingsLabels[holdingsView]}
        </p>
        <DotIndicator count={3} activeIndex={holdingsView} />
        {isScanning && holdingsView === 2 && (
          <span className="flex items-center gap-1 ml-auto">
            <svg className="w-2.5 h-2.5 animate-spin text-[var(--gs-lime)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
              <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-mono text-micro text-[var(--gs-lime)] tabular-nums">{enrichedCount}/{nftCount}</span>
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
            <ProgressBar label="With dates" value={withDatesPct} color="var(--gs-lime)" />
            <ProgressBar label="With cost" value={withCostPct} color="var(--gs-purple)" />
            <ProgressBar label="Enriched" value={enrichedPct} color="rgba(255,255,255,0.3)" />
          </div>
        </div>
      )}
    </div>
  );
});
