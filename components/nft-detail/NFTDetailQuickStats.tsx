/**
 * NFT Detail Quick Stats
 *
 * Compact 3-column stat row: Cost Basis | Market Value | Unrealized P&L
 * RENDER ONLY: All values computed in parent.
 */

'use client';

interface NFTDetailQuickStatsProps {
  costBasisGun: number | null;
  costBasisUsd: number | null;
  marketValueGun: number | null;
  marketValueUsd: number | null;
  unrealizedUsd: number | null;
  unrealizedPct: number | null;
  isLoading?: boolean;
}

export function NFTDetailQuickStats({
  costBasisGun,
  costBasisUsd,
  marketValueGun,
  marketValueUsd,
  unrealizedUsd,
  unrealizedPct,
  isLoading = false,
}: NFTDetailQuickStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
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
  const formatUsd = (value: number | null) => {
    if (value === null) return <span className="text-white/30">&mdash;</span>;
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatGun = (value: number | null) => {
    if (value === null) return <span className="text-white/30">&mdash;</span>;
    return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN`;
  };

  const formatPct = (value: number | null) => {
    if (value === null) return '';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-3 gap-2">
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
        className="bg-[var(--gs-dark-3)] border border-white/[0.06] border-l-2 p-3"
        style={{ borderLeftColor: 'var(--gs-purple)' }}
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
      </div>
    </div>
  );
}
