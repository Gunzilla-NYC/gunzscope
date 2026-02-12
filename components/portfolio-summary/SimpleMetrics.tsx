import { EnrichmentProgress } from '@/lib/types';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { NftPnL, AcquisitionBreakdown } from './types';

/** Small sparkline-shaped icon used as an overlay toggle indicator */
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

interface SimpleMetricsProps {
  isInitializing: boolean;
  gunHoldings: number;
  gunValue: number;
  nftCount: number;
  nftFloorValueUsd: number | null;
  nftPnL: NftPnL;
  showNftOverlay: boolean;
  onToggleNftOverlay: () => void;
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
  showNftOverlay, onToggleNftOverlay,
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

      {/* NFT Holdings — clickable to toggle NFT sparkline overlay */}
      <div
        className={`px-4 py-3 sm:border-r border-white/[0.06] border-b sm:border-b-0 ${hasSparklineData ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''} ${showNftOverlay ? 'bg-[var(--gs-purple)]/[0.06]' : ''}`}
        onClick={hasSparklineData ? onToggleNftOverlay : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            NFT Holdings
          </p>
          {hasSparklineData && (
            <SparklineIcon className={`transition-colors ${showNftOverlay ? 'text-[var(--gs-purple)]' : 'text-[var(--gs-gray-3)]/40'}`} />
          )}
        </div>
        {isInitializing ? (
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
        ) : (
          <>
            <p className="font-display text-xl font-bold text-[var(--gs-purple)] tabular-nums">
              {nftCount.toLocaleString()}
            </p>
            <p className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums mt-0.5">
              {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
            </p>
          </>
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
