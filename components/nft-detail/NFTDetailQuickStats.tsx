/**
 * NFT Detail Quick Stats
 *
 * Compact stat row: Cost Basis | Market Value | Unrealized P&L | Market Exit (Track B)
 * Adapts to 3 or 4 columns based on Track B data availability.
 * RENDER ONLY: All values computed in parent.
 */

'use client';

import type { MarketRefSource } from '@/lib/nft/types';

/** Human-readable descriptions for market reference sources */
const SOURCE_LABELS: Record<MarketRefSource, string> = {
  listing_avg: 'Average of current OpenSea listings for this item',
  listing_midpoint: 'Midpoint between lowest and highest listing',
  listing_low: 'Lowest current listing on OpenSea',
  listing_high: 'Highest current listing on OpenSea',
  enrichment_listing: 'Lowest listing found during portfolio enrichment',
  comparable_sales: 'Median price from recent sales of similar items',
  rarity_floor: 'Floor price for items of this rarity tier',
};

interface NFTDetailQuickStatsProps {
  costBasisGun: number | null;
  costBasisUsd: number | null;
  marketValueGun: number | null;
  marketValueUsd: number | null;
  marketValueSource?: MarketRefSource | null;
  unrealizedUsd: number | null;
  unrealizedPct: number | null;
  pnlSource?: string | null;
  isLoading?: boolean;
  // Track B — Market Exit
  marketExitGun?: number | null;
  marketExitUsd?: number | null;
  marketExitTierLabel?: string | null;
  marketExitPnlUsd?: number | null;
}

export function NFTDetailQuickStats({
  costBasisGun,
  costBasisUsd,
  marketValueGun,
  marketValueUsd,
  marketValueSource,
  unrealizedUsd,
  unrealizedPct,
  pnlSource,
  isLoading = false,
  marketExitGun,
  marketExitUsd,
  marketExitTierLabel,
  marketExitPnlUsd,
}: NFTDetailQuickStatsProps) {
  const hasTrackB = marketExitGun != null && marketExitGun > 0;
  const colCount = hasTrackB ? 4 : 3;

  if (isLoading) {
    return (
      <div className={`grid gap-2 ${colCount === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
        {Array.from({ length: colCount }, (_, i) => (
          <div key={i} className="bg-[var(--gs-dark-3)] border border-white/[0.06] p-3 animate-pulse">
            <div className="h-2 w-12 bg-white/10 rounded mb-2" />
            <div className="h-5 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // Determine P&L color
  const getPnlColor = () => {
    if (unrealizedUsd === null) return 'text-white/60';
    if (unrealizedUsd > 0.01) return 'text-[var(--gs-profit)]';
    if (unrealizedUsd < -0.01) return 'text-[var(--gs-loss)]';
    return 'text-white/60';
  };

  // Format currency — dash for missing data
  const formatUsd = (value: number | null | undefined) => {
    if (value == null) return <span className="text-white/30">&mdash;</span>;
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatGun = (value: number | null | undefined) => {
    if (value == null) return <span className="text-white/30">&mdash;</span>;
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN`;
  };

  const formatPct = (value: number | null) => {
    if (value === null) return '';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  // Track B P&L color
  const getTrackBPnlColor = () => {
    if (marketExitPnlUsd == null) return 'text-white/60';
    if (marketExitPnlUsd > 0.01) return 'text-[var(--gs-profit)]';
    if (marketExitPnlUsd < -0.01) return 'text-[var(--gs-loss)]';
    return 'text-white/60';
  };

  return (
    <div className={`grid gap-2 ${colCount === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
      {/* Cost Basis */}
      <div
        className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3"
        style={{ borderLeftColor: 'var(--gs-gray-1)' }}
      >
        <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">
          Cost Basis
        </div>
        <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">
          {formatUsd(costBasisUsd)}
        </div>
        <div className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums mt-0.5">
          {formatGun(costBasisGun)}
        </div>
      </div>

      {/* Market Value */}
      <div
        className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3 cursor-help"
        style={{ borderLeftColor: 'var(--gs-purple)' }}
        title={marketValueSource ? SOURCE_LABELS[marketValueSource] : marketValueGun !== null ? 'Market reference value' : 'No market data available'}
      >
        <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">
          Market Value
        </div>
        <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">
          {formatUsd(marketValueUsd)}
        </div>
        <div className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums mt-0.5">
          {formatGun(marketValueGun)}
        </div>
      </div>

      {/* Unrealized P&L */}
      <div
        className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3"
        style={{
          borderLeftColor: unrealizedUsd !== null && unrealizedUsd > 0
            ? 'var(--gs-profit)'
            : unrealizedUsd !== null && unrealizedUsd < 0
              ? 'var(--gs-loss)'
              : 'var(--gs-gray-1)',
        }}
      >
        <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">
          Unrealized
        </div>
        <div className={`font-display text-sm font-semibold tabular-nums ${getPnlColor()}`}>
          {unrealizedUsd !== null ? (
            <>
              {unrealizedUsd >= 0 ? '+' : '-'}${Math.abs(unrealizedUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </>
          ) : <span className="text-white/30">&mdash;</span>}
        </div>
        <div className={`font-mono text-caption tabular-nums mt-0.5 ${unrealizedPct !== null ? getPnlColor() : ''}`}>
          {unrealizedPct !== null ? formatPct(unrealizedPct) : ''}
        </div>
        {pnlSource && (
          <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--gs-gray-3)] mt-0.5">
            {pnlSource}
          </div>
        )}
      </div>

      {/* Track B — Market Exit (only shown when data available) */}
      {hasTrackB && (
        <div
          className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3"
          style={{ borderLeftColor: 'var(--gs-gray-2)' }}
          title="Estimated sale price from comparable market data"
        >
          <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">
            Market Exit
          </div>
          <div className="font-display text-sm font-semibold text-[var(--gs-white)] tabular-nums">
            ~{Math.round(marketExitGun!).toLocaleString()} GUN
          </div>
          <div className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums mt-0.5">
            {formatUsd(marketExitUsd)}
          </div>
          {marketExitTierLabel && (
            <div className="font-mono text-[8px] uppercase tracking-widest text-[var(--gs-gray-3)] mt-0.5">
              {marketExitTierLabel}
            </div>
          )}
          {marketExitPnlUsd != null && (
            <div className={`font-mono text-[8px] tabular-nums mt-0.5 ${getTrackBPnlColor()}`}>
              {marketExitPnlUsd >= 0 ? '+' : '-'}${Math.abs(marketExitPnlUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
