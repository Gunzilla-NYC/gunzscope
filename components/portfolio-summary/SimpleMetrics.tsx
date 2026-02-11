import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { NftPnL } from './types';

interface SimpleMetricsProps {
  isInitializing: boolean;
  gunHoldings: number;
  gunValue: number;
  nftFloorValueUsd: number | null;
  nftPnL: NftPnL;
}

export function SimpleMetrics({
  isInitializing, gunHoldings, gunValue, nftFloorValueUsd, nftPnL,
}: SimpleMetricsProps) {
  return (
    <div className="border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4">
      {/* GUN Holdings */}
      <div className="px-4 py-3 border-r border-white/[0.06] sm:border-r border-b sm:border-b-0 border-white/[0.06]">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
          GUN Holdings
        </p>
        {isInitializing ? (
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
        ) : (
          <p className="font-display text-xl font-bold text-[var(--gs-lime)] tabular-nums">
            {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        )}
      </div>

      {/* GUN Value */}
      <div className="px-4 py-3 sm:border-r border-white/[0.06] border-b sm:border-b-0 border-white/[0.06]">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
          GUN Value
        </p>
        {isInitializing ? (
          <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
        ) : (
          <p className="font-display text-xl font-bold text-[var(--gs-white)] tabular-nums">
            ${formatUsd(gunValue)}
          </p>
        )}
      </div>

      {/* NFT Value */}
      <div className="px-4 py-3 border-r border-white/[0.06]">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
          NFT Value
        </p>
        {isInitializing ? (
          <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
        ) : (
          <p className="font-display text-xl font-bold text-[var(--gs-purple)] tabular-nums">
            {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
          </p>
        )}
      </div>

      {/* Profit / Loss */}
      <div className="px-4 py-3">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
          Profit / Loss
        </p>
        {isInitializing ? (
          <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
        ) : nftPnL.unrealizedUsd !== null ? (
          <p className={`font-display text-xl font-bold tabular-nums ${nftPnL.unrealizedUsd >= 0 ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
            {nftPnL.unrealizedUsd >= 0 ? '+' : '-'}${formatUsd(Math.abs(nftPnL.unrealizedUsd))}
          </p>
        ) : (
          <p className="font-display text-xl font-bold text-[var(--gs-gray-3)]">
            &mdash;
          </p>
        )}
      </div>
    </div>
  );
}
