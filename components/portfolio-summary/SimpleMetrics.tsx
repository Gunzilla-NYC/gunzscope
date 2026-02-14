import { useState, useCallback } from 'react';
import { EnrichmentProgress } from '@/lib/types';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { NftPnL, AcquisitionBreakdown } from './types';
import { MiniSparkline } from '@/components/charts/MiniSparkline';

/** Dot pagination indicator for tappable cards */
function DotIndicator({ count = 2, activeIndex, color = 'var(--gs-gray-3)' }: { count?: number; activeIndex: number; color?: string }) {
  return (
    <span className="inline-flex gap-[3px] ml-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="w-[4px] h-[4px] rounded-full transition-opacity duration-200"
          style={{ backgroundColor: color, opacity: i === activeIndex ? 0.7 : 0.2 }}
        />
      ))}
    </span>
  );
}

// Mini sparkline height for the NFT Holdings card
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
  totalGunSpent: number;
  gunPrice: number | undefined;
}

export function SimpleMetrics({
  isInitializing, gunHoldings, gunValue, nftCount, nftFloorValueUsd, nftPnL,
  nftCardSparkline, onToggleNftCardSparkline, nftSparklineValues, nftCountHistory,
  showGunOverlay, onToggleGunOverlay,
  hasSparklineData,
  enrichmentProgress, progressPct,
  acquisitionBreakdown, totalGunSpent, gunPrice,
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

  // Toggle states for card flips
  const [gunCardFlipped, setGunCardFlipped] = useState(false);
  const [spentCardFlipped, setSpentCardFlipped] = useState(false);
  const [holdingsView, setHoldingsView] = useState(0); // 0=counts, 1=percentages, 2=coverage
  const toggleGunCard = useCallback(() => setGunCardFlipped(prev => !prev), []);
  const toggleSpentCard = useCallback(() => setSpentCardFlipped(prev => !prev), []);
  const cycleHoldingsView = useCallback(() => setHoldingsView(prev => (prev + 1) % 3), []);

  // Inline mini sparkline for NFT Holdings card
  const hasNftSparkline = nftSparklineValues.length >= 2;

  // Hover state for sparkline interaction (driven by MiniSparkline callback)
  const [nftHoverIdx, setNftHoverIdx] = useState<number | null>(null);
  const onSparklineHover = useCallback((idx: number | null) => setNftHoverIdx(idx), []);

  // Card 4: percentage + coverage helpers
  const pctOf = (n: number) => nftCount > 0 ? Math.round((n / nftCount) * 100) : 0;
  const resolvedCount = acquisitionBreakdown.minted + acquisitionBreakdown.bought + acquisitionBreakdown.transferred;
  const withDatesPct = nftCount > 0 ? Math.round((resolvedCount / nftCount) * 100) : 0;
  const withCostPct = nftCount > 0 ? Math.round((nftPnL.nftsWithCost / nftCount) * 100) : 0;
  const holdingsLabels = ['Holdings', 'Distribution', 'Data Quality'] as const;

  // P&L display helpers
  const hasPnL = nftPnL.unrealizedGun !== null;
  const pnlGun = nftPnL.unrealizedGun ?? 0;
  const pnlUsd = nftPnL.unrealizedUsd ?? 0;
  const pnlIsProfit = pnlGun >= 0;

  return (
    <div className="border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4">
      {/* Card 1: GUN Balance / GUN Price toggle */}
      <div
        className="px-4 py-3 border-r border-white/[0.06] border-b sm:border-b-0 cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
        onClick={toggleGunCard}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            {gunCardFlipped ? 'GUN Price' : 'GUN Balance'}
          </p>
          <DotIndicator activeIndex={gunCardFlipped ? 1 : 0} color="var(--gs-lime)" />
        </div>
        {isInitializing ? (
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
        ) : (
          <div className="grid">
            {/* Face A: Balance */}
            <div
              style={{ gridArea: '1/1' }}
              className={`transition-opacity duration-300 ease-out ${
                !gunCardFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <p className="font-display text-xl font-bold text-[var(--gs-lime)] tabular-nums">
                {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums mt-0.5">
                ${formatUsd(gunValue)}
              </p>
            </div>
            {/* Face B: Price */}
            <div
              style={{ gridArea: '1/1', transitionDelay: gunCardFlipped ? '100ms' : '0ms' }}
              className={`transition-opacity duration-300 ease-out ${
                gunCardFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <p className="font-display text-xl font-bold text-[var(--gs-lime)] tabular-nums">
                {gunPrice ? `$${gunPrice.toFixed(6)}` : '\u2014'}
              </p>
              <p className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums mt-0.5">
                {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN held
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card 2: NFT Holdings — clickable to toggle between data and inline sparkline */}
      <div
        className={`px-4 py-3 sm:border-r border-white/[0.06] border-b sm:border-b-0 ${hasNftSparkline ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''} ${nftCardSparkline ? 'bg-[var(--gs-purple)]/[0.06]' : ''}`}
        onClick={hasNftSparkline ? onToggleNftCardSparkline : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            NFT Holdings
          </p>
          {hasNftSparkline && (
            <DotIndicator activeIndex={nftCardSparkline ? 1 : 0} color="var(--gs-purple)" />
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
            >
              {/* NFT count — pinned left, changes on hover */}
              <p className="font-display text-xl font-bold text-[var(--gs-purple)] tabular-nums">
                {(nftHoverIdx !== null
                  ? (nftCountHistory[nftHoverIdx] ?? nftCount)
                  : nftCount
                ).toLocaleString()}
              </p>
              <p className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums mt-0.5">
                {nftCount > 0 && totalGunSpent > 0
                  ? `~${Math.round(totalGunSpent / nftCount).toLocaleString()} GUN avg`
                  : '\u2014'}
              </p>
              {hasNftSparkline && (
                <div className="mt-1" aria-hidden="true">
                  <MiniSparkline
                    values={nftSparklineValues}
                    width={200}
                    height={MINI_H}
                    color="#6D5BFF"
                    onHoverIndex={onSparklineHover}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Card 3: GUN Spent / Unrealized P&L toggle */}
      <div
        className={`px-4 py-3 border-r border-white/[0.06] ${!isScanning ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''}`}
        onClick={!isScanning ? toggleSpentCard : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            {spentCardFlipped ? 'Unrealized P&L' : 'GUN Spent'}
          </p>
          {isScanning && (
            <>
              <svg className="w-2.5 h-2.5 animate-spin text-[var(--gs-lime)]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="2" strokeOpacity="0.2" />
                <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-mono text-micro text-[var(--gs-lime)] tabular-nums">{enrichedCount}/{nftCount}</span>
            </>
          )}
          {!isScanning && <DotIndicator activeIndex={spentCardFlipped ? 1 : 0} />}
        </div>
        {isInitializing ? (
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
        ) : (
          <div className="grid">
            {/* Face A: Cost basis */}
            <div
              style={{ gridArea: '1/1' }}
              className={`transition-opacity duration-300 ease-out ${
                !spentCardFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <p className="font-display text-xl font-bold text-[var(--gs-white)] tabular-nums">
                {totalGunSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
              <p className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums mt-0.5">
                {gunPrice ? `$${formatUsd(totalGunSpent * gunPrice)}` : '\u2014'}
              </p>
            </div>
            {/* Face B: Unrealized P&L */}
            <div
              style={{ gridArea: '1/1', transitionDelay: spentCardFlipped ? '100ms' : '0ms' }}
              className={`transition-opacity duration-300 ease-out ${
                spentCardFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <p className={`font-display text-xl font-bold tabular-nums ${
                hasPnL
                  ? pnlIsProfit ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'
                  : 'text-[var(--gs-gray-3)]'
              }`}>
                {hasPnL
                  ? `${pnlIsProfit ? '+' : ''}${pnlGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN`
                  : '\u2014'}
              </p>
              <p className="font-mono text-caption text-[var(--gs-gray-3)] tabular-nums mt-0.5">
                {hasPnL && gunPrice
                  ? `${pnlIsProfit ? '+' : '-'}$${formatUsd(Math.abs(pnlUsd))}`
                  : `${nftPnL.coverage} of ${nftPnL.totalItems} priced`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card 4: Holdings — 3-state cycle (counts / percentages / data quality) */}
      <div
        className="px-4 py-3 cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
        onClick={cycleHoldingsView}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            {holdingsLabels[holdingsView]}
          </p>
          <DotIndicator count={3} activeIndex={holdingsView} />
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
              {acquisitionBreakdown.minted > 0 && (
                <div>
                  <span className="font-mono text-xs">
                    <span className="text-[var(--gs-lime)] mr-1.5">&#9670;</span>
                    <span className="text-[var(--gs-white)]">{acquisitionBreakdown.minted}</span>
                    <span className="text-[var(--gs-gray-3)] ml-1">Minted</span>
                  </span>
                  <p className="font-mono text-micro text-[var(--gs-gray-3)]/60 ml-[14px] tabular-nums">
                    {acquisitionBreakdown.mintedGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
                  </p>
                </div>
              )}
              {acquisitionBreakdown.bought > 0 && (
                <div>
                  <span className="font-mono text-xs">
                    <span className="text-[var(--gs-purple)] mr-1.5">&#9670;</span>
                    <span className="text-[var(--gs-white)]">{acquisitionBreakdown.bought}</span>
                    <span className="text-[var(--gs-gray-3)] ml-1">Bought</span>
                  </span>
                  <p className="font-mono text-micro text-[var(--gs-gray-3)]/60 ml-[14px] tabular-nums">
                    {acquisitionBreakdown.boughtGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
                  </p>
                </div>
              )}
              {acquisitionBreakdown.transferred > 0 && (
                <span className="font-mono text-xs">
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
            </div>

            {/* View 1: Percentages */}
            <div
              style={{ gridArea: '1/1', transitionDelay: holdingsView === 1 ? '100ms' : '0ms' }}
              className={`transition-opacity duration-300 ease-out space-y-1.5 ${
                holdingsView === 1 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
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
            </div>

            {/* View 2: Data Quality */}
            <div
              style={{ gridArea: '1/1', transitionDelay: holdingsView === 2 ? '100ms' : '0ms' }}
              className={`transition-opacity duration-300 ease-out space-y-2 ${
                holdingsView === 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-xs text-[var(--gs-gray-3)]">With dates</span>
                  <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">{withDatesPct}%</span>
                </div>
                <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                  <div className="h-full bg-[var(--gs-lime)]" style={{ width: `${withDatesPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-xs text-[var(--gs-gray-3)]">With prices</span>
                  <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">{withCostPct}%</span>
                </div>
                <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                  <div className="h-full bg-[var(--gs-purple)]" style={{ width: `${withCostPct}%` }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-xs text-[var(--gs-gray-3)]">Enriched</span>
                  <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">{enrichedPct}%</span>
                </div>
                <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                  <div className="h-full bg-[var(--gs-white)]/30" style={{ width: `${enrichedPct}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
