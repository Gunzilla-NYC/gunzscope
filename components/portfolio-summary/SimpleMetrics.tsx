import { useState, useCallback, useMemo } from 'react';
import { EnrichmentProgress } from '@/lib/types';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { NftPnL, AcquisitionBreakdown } from './types';
import { computeSparklinePath } from './sparklineUtils';

/** Small sparkline-shaped icon — hints "click for chart" */
function SparklineIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" className={className} aria-hidden="true">
      <path
        d="M1 6.5 C2 5, 2.5 4, 3.5 4 C4.5 4, 5 5.5, 6 5.5 C7 5.5, 7.5 2, 8.5 1.5 C9.5 1, 10 2.5, 11 2.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Small dollar icon — hints "click for values" */
function ValueIcon({ className }: { className?: string }) {
  return (
    <svg width="8" height="10" viewBox="0 0 8 10" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 0.5V1.5M4 8.5V9.5M2 3.5C2 2.7 2.9 2 4 2C5.1 2 6 2.7 6 3.5S5.1 5 4 5C2.9 5 2 5.7 2 6.5S2.9 8 4 8C5.1 8 6 7.3 6 6.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Mini sparkline dimensions for the NFT Holdings card
const MINI_W = 200;
const MINI_H = 36;

interface SimpleMetricsProps {
  isInitializing: boolean;
  gunHoldings: number;
  gunValue: number;
  nftCount: number;
  nftFloorValueUsd: number | null;
  nftPnL: NftPnL;
  nftCardSparkline: boolean;
  onToggleNftCardSparkline: () => void;
  nftSparklineValues: number[];
  nftCountHistory: (number | null)[];
  showGunOverlay: boolean;
  onToggleGunOverlay: () => void;
  hasSparklineData: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  progressPct: number | null;
  acquisitionBreakdown: AcquisitionBreakdown;
  onToggleViewMode?: () => void;
}

export function SimpleMetrics({
  isInitializing, gunHoldings, gunValue, nftCount, nftFloorValueUsd, nftPnL,
  nftCardSparkline, onToggleNftCardSparkline, nftSparklineValues, nftCountHistory,
  showGunOverlay, onToggleGunOverlay,
  hasSparklineData,
  enrichmentProgress, progressPct,
  acquisitionBreakdown, onToggleViewMode,
}: SimpleMetricsProps) {
  const isActiveEnrichment = enrichmentProgress != null && enrichmentProgress.phase !== 'complete';
  // During active scanning: use pipeline completed count (cumulative across pages)
  // After scanning: use totalItems (all loaded items went through the pipeline)
  const enrichedCount = isActiveEnrichment && enrichmentProgress!.total > 0
    ? enrichmentProgress!.completed
    : nftPnL.totalItems;
  const enrichedPct = nftCount > 0
    ? Math.min(100, Math.round((enrichedCount / nftCount) * 100))
    : 0;
  // Show spinner while enrichment hasn't covered all NFTs (survives between-page gaps)
  const isScanning = enrichmentProgress != null && enrichedCount < nftCount;

  // Inline mini sparkline for NFT Holdings card
  const hasNftSparkline = nftSparklineValues.length >= 2;
  const nftMini = useMemo(() => {
    if (!hasNftSparkline) return { path: '', fillPath: '', points: [] };
    const min = Math.min(...nftSparklineValues);
    const max = Math.max(...nftSparklineValues);
    return computeSparklinePath(nftSparklineValues, MINI_W, MINI_H, min, max);
  }, [nftSparklineValues, hasNftSparkline]);

  // Hover state for sparkline interaction
  const [nftHoverIdx, setNftHoverIdx] = useState<number | null>(null);
  const onSparklineMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setNftHoverIdx(Math.round(pct * (nftSparklineValues.length - 1)));
  }, [nftSparklineValues.length]);
  const onSparklineLeave = useCallback(() => setNftHoverIdx(null), []);

  return (
    <div className="border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4">
      {/* GUN Balance — clickable to toggle GUN sparkline overlay */}
      <div
        className={`px-4 py-3 border-r border-white/[0.06] border-b sm:border-b-0 ${hasSparklineData ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''} ${showGunOverlay ? 'bg-[var(--gs-lime)]/[0.04]' : ''}`}
        onClick={hasSparklineData ? onToggleGunOverlay : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            GUN Balance
          </p>
          {hasSparklineData && (
            <SparklineIcon className={`transition-colors ${showGunOverlay ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-3)]/40'}`} />
          )}
        </div>
        {isInitializing ? (
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
        ) : (
          <>
            <p className="font-display text-xl font-bold text-[var(--gs-lime)] tabular-nums">
              {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums mt-0.5">
              ${formatUsd(gunValue)}
            </p>
          </>
        )}
      </div>

      {/* NFT Holdings — clickable to toggle between data and inline sparkline */}
      <div
        className={`px-4 py-3 sm:border-r border-white/[0.06] border-b sm:border-b-0 ${hasNftSparkline ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''} ${nftCardSparkline ? 'bg-[var(--gs-purple)]/[0.06]' : ''}`}
        onClick={hasNftSparkline ? onToggleNftCardSparkline : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            NFT Holdings
          </p>
          {hasNftSparkline && (
            nftCardSparkline
              ? <ValueIcon className="text-[var(--gs-purple)] transition-colors" />
              : <SparklineIcon className="text-[var(--gs-gray-3)]/40 transition-colors" />
          )}
        </div>
        {isInitializing ? (
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
        ) : (
          <div className="grid">
            {/* Layer 1: Data view (count + USD) */}
            <div
              style={{ gridArea: '1/1' }}
              className={`transition-opacity duration-300 ease-out ${
                !nftCardSparkline ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <p className="font-display text-xl font-bold text-[var(--gs-purple)] tabular-nums">
                {nftCount.toLocaleString()}
              </p>
              <p className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums mt-0.5">
                {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
              </p>
            </div>
            {/* Layer 2: Inline sparkline with hover */}
            <div
              style={{ gridArea: '1/1', transitionDelay: nftCardSparkline ? '100ms' : '0ms' }}
              className={`relative transition-opacity duration-300 ease-out ${
                nftCardSparkline ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
              onMouseMove={nftCardSparkline ? onSparklineMove : undefined}
              onMouseLeave={nftCardSparkline ? onSparklineLeave : undefined}
            >
              {/* NFT count — pinned left, changes on hover */}
              <p className="font-display text-xl font-bold text-[var(--gs-purple)] tabular-nums leading-none">
                {(nftHoverIdx !== null
                  ? (nftCountHistory[nftHoverIdx] ?? nftCount)
                  : nftCount
                ).toLocaleString()}
              </p>
              {hasNftSparkline && nftMini.path && (
                <svg
                  className="w-full mt-1"
                  height={MINI_H}
                  viewBox={`0 0 ${MINI_W} ${MINI_H}`}
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="nft-card-sparkline-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--gs-purple)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--gs-purple)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={nftMini.fillPath} fill="url(#nft-card-sparkline-grad)" />
                  <path d={nftMini.path} fill="none" stroke="var(--gs-purple)" strokeWidth="1.5" strokeOpacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
                  {/* Hover dot */}
                  {nftHoverIdx !== null && nftMini.points[nftHoverIdx] && (
                    <circle
                      cx={nftMini.points[nftHoverIdx].x}
                      cy={nftMini.points[nftHoverIdx].y}
                      r="3"
                      fill="var(--gs-purple)"
                      opacity="0.9"
                    />
                  )}
                </svg>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Data Quality → Holdings crossfade (spans last 2 columns) */}
      <div className="px-4 py-3 col-span-2">
        <div className="grid">
          {/* Layer 1: Scanning progress */}
          <div
            style={{ gridArea: '1/1' }}
            className={`transition-opacity duration-500 ease-out ${
              isScanning ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                Data Quality
              </p>
              <svg className="w-3 h-3 animate-spin text-[var(--gs-lime)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-mono text-micro text-[var(--gs-lime)]">Scanning</span>
            </div>
            <p className="font-mono text-sm font-semibold text-[var(--gs-white)] tabular-nums">
              {enrichedCount}<span className="text-[var(--gs-gray-3)] font-normal">/{nftCount}</span>
            </p>
            <p className="font-mono text-micro text-[var(--gs-gray-3)] mt-0.5 mb-1.5">enriched</p>
            <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden relative max-w-48">
              <div
                className="h-full transition-all duration-500 ease-out bg-gradient-to-r from-[var(--gs-purple)] to-[var(--gs-lime)] animate-pulse"
                style={{ width: `${enrichedPct}%` }}
              />
              <div className="absolute inset-0 enrichment-bar-shimmer" />
            </div>
          </div>

          {/* Layer 2: Holdings breakdown (revealed on completion) */}
          <div
            style={{ gridArea: '1/1', transitionDelay: !isScanning ? '200ms' : '0ms' }}
            className={`transition-opacity duration-500 ease-out ${
              !isScanning ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                Holdings
              </p>
              {onToggleViewMode && (
                <button
                  onClick={onToggleViewMode}
                  className="font-mono text-micro uppercase tracking-widest text-[var(--gs-lime)] hover:text-[var(--gs-lime)]/70 transition-colors flex items-center gap-1"
                >
                  TAP <span className="text-[8px]">&#9654;</span>
                </button>
              )}
            </div>
            <div className="space-y-1">
              {acquisitionBreakdown.minted > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">
                    <span className="text-[var(--gs-lime)] mr-1.5">&#9670;</span>
                    <span className="text-[var(--gs-white)]">{acquisitionBreakdown.minted}</span>
                    <span className="text-[var(--gs-gray-3)] ml-1">Minted</span>
                  </span>
                  <span className="font-mono text-xs text-[var(--gs-gray-3)] tabular-nums">
                    {acquisitionBreakdown.mintedGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                  </span>
                </div>
              )}
              {acquisitionBreakdown.bought > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">
                    <span className="text-[var(--gs-purple)] mr-1.5">&#9670;</span>
                    <span className="text-[var(--gs-white)]">{acquisitionBreakdown.bought}</span>
                    <span className="text-[var(--gs-gray-3)] ml-1">Bought</span>
                  </span>
                  <span className="font-mono text-xs text-[var(--gs-gray-3)] tabular-nums">
                    {acquisitionBreakdown.boughtGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                  </span>
                </div>
              )}
              {acquisitionBreakdown.transferred > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">
                    <span className="text-[var(--gs-gray-2)] mr-1.5">&#9670;</span>
                    <span className="text-[var(--gs-white)]">{acquisitionBreakdown.transferred}</span>
                    <span className="text-[var(--gs-gray-3)] ml-1">Free</span>
                  </span>
                  <span className="font-mono text-xs text-[var(--gs-gray-3)]/50 tabular-nums">
                    &mdash;
                  </span>
                </div>
              )}
              {acquisitionBreakdown.pending > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">
                    <span className="text-[var(--gs-gray-3)]/40 mr-1.5">&#9670;</span>
                    <span className="text-[var(--gs-white)]">{acquisitionBreakdown.pending}</span>
                    <span className="text-[var(--gs-gray-3)] ml-1">Unresolved</span>
                  </span>
                  <span className="font-mono text-xs text-[var(--gs-gray-3)]/50 tabular-nums">
                    &mdash;
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
