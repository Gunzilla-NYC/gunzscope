import { EnrichmentProgress } from '@/lib/types';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { NftPnL, AcquisitionBreakdown } from './types';

interface DetailedGridProps {
  isInitializing: boolean;
  holdingsExpanded: boolean;
  performanceExpanded: boolean;
  onToggleHoldings: () => void;
  onTogglePerformance: () => void;
  acquisitionBreakdown: AcquisitionBreakdown;
  gunValue: number;
  gunHoldings: number;
  gunPrice: number | undefined;
  gunPct: number;
  nftPct: number;
  nftCount: number;
  nftFloorValueUsd: number | null;
  totalGunSpent: number;
  nftPnL: NftPnL;
  isEnriching: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  hasFailures: boolean;
  progressPct: number | null;
  onRetryEnrichment?: () => void;
}

export function DetailedGrid({
  isInitializing,
  holdingsExpanded, performanceExpanded,
  onToggleHoldings, onTogglePerformance,
  acquisitionBreakdown,
  gunValue, gunHoldings, gunPrice, gunPct, nftPct, nftCount,
  nftFloorValueUsd, totalGunSpent, nftPnL,
  isEnriching, enrichmentProgress, hasFailures, progressPct,
  onRetryEnrichment,
}: DetailedGridProps) {
  // Loading skeleton
  if (isInitializing) {
    return (
      <div className="border-t border-white/[0.06] grid grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className={`p-4 ${i === 1 ? 'border-r border-white/[0.06]' : ''}`}>
            <div className="h-3 w-16 bg-white/5 rounded animate-pulse mb-3" />
            <div className="h-5 w-24 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-white/5 rounded animate-pulse mb-2" />
            <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.06] grid grid-cols-2">
      {/* Column 1 — Holdings */}
      <div
        className={`p-4 border-r border-white/[0.06] stat-cell-animate cursor-pointer transition-all duration-200 group/hold ${
          holdingsExpanded ? 'bg-[var(--gs-lime)]/[0.03]' : 'hover:bg-[var(--gs-lime)]/[0.02]'
        }`}
        onClick={onToggleHoldings}
      >
        <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-3 flex items-center gap-1.5">
          Holdings
          <span className="font-mono text-micro text-[var(--gs-gray-3)] group-hover/hold:text-[var(--gs-lime)] transition-colors duration-200 ml-auto">
            {holdingsExpanded ? '\u25C0 back' : 'tap \u25B6'}
          </span>
        </p>

        <div className="relative" style={{ minHeight: '80px' }}>
          {/* Default: Acquisition Breakdown */}
          <div
            className={`transition-all duration-200 ${
              holdingsExpanded ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="space-y-1.5">
              {acquisitionBreakdown.minted > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption text-[var(--gs-gray-4)]">
                    <span className="text-[var(--gs-lime)]">{'\u25C6'}</span> {acquisitionBreakdown.minted} Minted
                  </span>
                  <span className="font-mono text-caption text-[var(--gs-white)] tabular-nums">
                    {acquisitionBreakdown.mintedGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                  </span>
                </div>
              )}
              {acquisitionBreakdown.bought > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption text-[var(--gs-gray-4)]">
                    <span className="text-[var(--gs-purple)]">{'\u25C6'}</span> {acquisitionBreakdown.bought} Bought
                  </span>
                  <span className="font-mono text-caption text-[var(--gs-white)] tabular-nums">
                    {acquisitionBreakdown.boughtGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                  </span>
                </div>
              )}
              {acquisitionBreakdown.transferred > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption text-[var(--gs-gray-4)]">
                    <span className="text-[var(--gs-gray-3)]">{'\u25C6'}</span> {acquisitionBreakdown.transferred} Transferred
                  </span>
                  <span className="font-mono text-caption text-[var(--gs-gray-3)]">free</span>
                </div>
              )}
              {acquisitionBreakdown.pending > 0 && (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption text-[var(--gs-gray-4)]">
                    <span className={`text-[var(--gs-gray-2)] ${isEnriching ? 'animate-pulse' : ''}`}>{'\u25C6'}</span> {acquisitionBreakdown.pending} {isEnriching ? 'Scanning\u2026' : 'Unresolved'}
                  </span>
                  <span className="font-mono text-caption text-[var(--gs-gray-2)]">&mdash;</span>
                </div>
              )}
              {acquisitionBreakdown.minted === 0 && acquisitionBreakdown.bought === 0 && acquisitionBreakdown.transferred === 0 && acquisitionBreakdown.pending === 0 && (
                <p className="font-mono text-caption text-[var(--gs-gray-3)]">No data yet</p>
              )}
            </div>
          </div>

          {/* Expanded: Composition Bar + GUN/NFT values */}
          <div
            className={`absolute inset-0 transition-all duration-200 ${
              holdingsExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <div className="flex items-baseline justify-between mb-0.5">
              <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                ${formatUsd(gunValue)}
              </span>
              <span className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums">
                {gunPct.toFixed(0)}%
              </span>
            </div>
            <p className="font-mono text-caption text-[var(--gs-gray-3)] mb-3">
              {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[var(--gs-lime)]">GUN</span>
            </p>

            <div
              className="h-[3px] w-full flex mb-3 overflow-hidden"
              style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
            >
              <div className="h-full bg-[var(--gs-lime)]" style={{ width: `${gunPct}%` }} />
              <div className="h-full bg-[var(--gs-purple)]" style={{ width: `${nftPct}%` }} />
            </div>

            <div className="flex items-baseline justify-between mb-0.5">
              <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
              </span>
              <span className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums">
                {nftPct.toFixed(0)}%
              </span>
            </div>
            <p className="font-mono text-caption text-[var(--gs-gray-3)]">
              {nftCount.toLocaleString()} <span className="text-[var(--gs-purple)]">NFTs</span>
            </p>
          </div>
        </div>
      </div>

      {/* Column 2 — Performance */}
      <div
        className={`p-4 stat-cell-animate cursor-pointer transition-all duration-200 group/perf ${
          performanceExpanded ? 'bg-[var(--gs-purple)]/[0.04]' : 'hover:bg-[var(--gs-purple)]/[0.03]'
        }`}
        onClick={onTogglePerformance}
      >
        <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-3 flex items-center gap-1.5">
          Performance
          <InfoTooltip text="Profit/loss based on floor prices vs what you paid. Tap for cost breakdown." />
          <span className="font-mono text-micro text-[var(--gs-gray-3)] group-hover/perf:text-[var(--gs-purple)] transition-colors duration-200 ml-auto">
            {performanceExpanded ? '\u25C0 back' : 'tap \u25B6'}
          </span>
        </p>

        <div className="relative" style={{ minHeight: '80px' }}>
          {/* Default: P&L display */}
          <div
            className={`transition-all duration-200 ${
              performanceExpanded ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
            }`}
          >
            {isEnriching && enrichmentProgress && enrichmentProgress.total > 0 ? (
              <div className="flex flex-col justify-center gap-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-4)]">Scanning</span>
                  <span className="font-mono text-2xl font-semibold text-[var(--gs-white)] tabular-nums">
                    {enrichmentProgress.completed}
                  </span>
                  <span className="font-mono text-sm text-[var(--gs-gray-3)] tabular-nums">
                    / {enrichmentProgress.total}
                  </span>
                </div>
                <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] transition-all duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div className="absolute inset-0 enrichment-bar-shimmer" />
                </div>
              </div>
            ) : isEnriching ? (
              <p className="font-mono text-sm text-[var(--gs-gray-3)] animate-pulse">
                Scanning&hellip;
              </p>
            ) : nftPnL.unrealizedUsd !== null ? (
              <div>
                <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-4)] block mb-1">Profit / Loss</span>
                <span
                  className={`font-mono text-xl font-semibold ${
                    nftPnL.unrealizedUsd > 0
                      ? 'text-[var(--gs-profit)]'
                      : nftPnL.unrealizedUsd < 0
                      ? 'text-[var(--gs-loss)]'
                      : 'text-[var(--gs-white)]'
                  }`}
                >
                  {nftPnL.unrealizedUsd >= 0 ? '+' : '-'}${formatUsd(Math.abs(nftPnL.unrealizedUsd))}
                </span>
                {nftPnL.pct !== null && (
                  <span
                    className={`font-mono text-sm ml-1.5 ${
                      nftPnL.pct > 0 ? 'text-[var(--gs-profit)]' : nftPnL.pct < 0 ? 'text-[var(--gs-loss)]' : 'text-[var(--gs-gray-3)]'
                    }`}
                  >
                    ({nftPnL.pct >= 0 ? '+' : ''}{nftPnL.pct.toFixed(1)}%)
                  </span>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                    {nftPnL.coverage} of {nftPnL.totalItems} priced
                  </span>
                  {hasFailures && onRetryEnrichment && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRetryEnrichment(); }}
                      className="font-mono text-micro uppercase tracking-wider text-[var(--gs-loss)] hover:text-[var(--gs-loss)]/80 transition-colors cursor-pointer"
                    >
                      {enrichmentProgress!.failedCount} missed &middot; rescan
                    </button>
                  )}
                </div>
              </div>
            ) : totalGunSpent > 0 ? (
              <div>
                <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-4)] block mb-1">Cost Basis</span>
                <span className="font-mono text-xl font-semibold text-[var(--gs-white)]">
                  {totalGunSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                </span>
                <p className="font-mono text-caption text-[var(--gs-gray-4)] mt-1">
                  {nftPnL.nftsWithCost} purchased
                </p>
                {hasFailures && onRetryEnrichment && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onRetryEnrichment(); }}
                    className="font-mono text-micro uppercase tracking-wider text-[var(--gs-loss)] hover:text-[var(--gs-loss)]/80 transition-colors cursor-pointer mt-1"
                  >
                    retry
                  </button>
                )}
              </div>
            ) : (
              <div>
                <span className="font-mono text-lg font-semibold text-[var(--gs-gray-3)]">
                  {nftPnL.totalItems} items
                </span>
                <p className="font-mono text-caption text-[var(--gs-gray-3)] mt-1">
                  {nftPnL.nftsFreeTransfer > 0 ? `${nftPnL.nftsFreeTransfer} transferred free` : 'No purchase data yet'}
                </p>
              </div>
            )}
          </div>

          {/* Expanded: Cost Basis */}
          <div
            className={`absolute inset-0 transition-all duration-200 ${
              performanceExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
            }`}
          >
            <p className="font-mono text-caption text-[var(--gs-gray-4)] mb-2 uppercase tracking-wider">
              Cost Basis
            </p>
            {totalGunSpent > 0 ? (
              <div className="space-y-1.5">
                <p className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                  {totalGunSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                </p>
                {gunPrice && (
                  <p className="font-mono text-caption text-[var(--gs-gray-3)]">
                    ${formatUsd(totalGunSpent * gunPrice)} at current price
                  </p>
                )}
                <p className="font-mono text-caption text-[var(--gs-gray-4)]">
                  {nftPnL.coverage} of {nftPnL.totalItems} with floor &amp; cost
                </p>
              </div>
            ) : (
              <p className="font-mono text-caption text-[var(--gs-gray-3)]">No purchase data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
