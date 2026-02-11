import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { NftPnL } from './types';

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
  nftFloorValueUsd: number | null;
  nftPnL: NftPnL;
  showNftOverlay: boolean;
  onToggleNftOverlay: () => void;
  showGunOverlay: boolean;
  onToggleGunOverlay: () => void;
  hasSparklineData: boolean;
}

export function SimpleMetrics({
  isInitializing, gunHoldings, gunValue, nftFloorValueUsd, nftPnL,
  showNftOverlay, onToggleNftOverlay,
  showGunOverlay, onToggleGunOverlay,
  hasSparklineData,
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

      {/* GUN Value — clickable to toggle GUN sparkline overlay */}
      <div
        className={`px-4 py-3 sm:border-r border-white/[0.06] border-b sm:border-b-0 border-white/[0.06] ${hasSparklineData ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''} ${showGunOverlay ? 'bg-[var(--gs-lime)]/[0.04]' : ''}`}
        onClick={hasSparklineData ? onToggleGunOverlay : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            GUN Value
          </p>
          {hasSparklineData && (
            <SparklineIcon className={`transition-colors ${showGunOverlay ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-gray-3)]/40'}`} />
          )}
        </div>
        {isInitializing ? (
          <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
        ) : (
          <p className="font-display text-xl font-bold text-[var(--gs-white)] tabular-nums">
            ${formatUsd(gunValue)}
          </p>
        )}
      </div>

      {/* NFT Value — clickable to toggle NFT sparkline overlay */}
      <div
        className={`px-4 py-3 border-r border-white/[0.06] ${hasSparklineData ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''} ${showNftOverlay ? 'bg-[var(--gs-purple)]/[0.06]' : ''}`}
        onClick={hasSparklineData ? onToggleNftOverlay : undefined}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
            NFT Value
          </p>
          {hasSparklineData && (
            <SparklineIcon className={`transition-colors ${showNftOverlay ? 'text-[var(--gs-purple)]' : 'text-[var(--gs-gray-3)]/40'}`} />
          )}
        </div>
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
