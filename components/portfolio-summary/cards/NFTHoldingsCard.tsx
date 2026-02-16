import { memo, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { DotIndicator } from '@/components/ui/DotIndicator';

const MiniSparkline = dynamic(() => import('@/components/charts/MiniSparkline').then(m => m.MiniSparkline), { ssr: false });

const MINI_H = 36;

interface NFTHoldingsCardProps {
  isInitializing: boolean;
  nftCount: number;
  nftFloorValueUsd: number | null;
  nftCardSparkline: boolean;
  onToggleNftCardSparkline: () => void;
  nftSparklineValues: number[];
  nftCountHistory: (number | null)[];
  totalGunSpent: number;
  walletCount?: number;
}

export const NFTHoldingsCard = memo(function NFTHoldingsCard({
  isInitializing,
  nftCount,
  nftFloorValueUsd,
  nftCardSparkline,
  onToggleNftCardSparkline,
  nftSparklineValues,
  nftCountHistory,
  totalGunSpent,
  walletCount,
}: NFTHoldingsCardProps) {
  const hasNftSparkline = nftSparklineValues.length >= 2;
  const [nftHoverIdx, setNftHoverIdx] = useState<number | null>(null);
  const sparklineRef = useRef<HTMLDivElement>(null);

  const handleCardMouseMove = useCallback((e: React.MouseEvent) => {
    const container = sparklineRef.current;
    if (!container || nftSparklineValues.length < 2) return;
    const rect = container.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const idx = Math.round(pct * (nftSparklineValues.length - 1));
    setNftHoverIdx(idx);
  }, [nftSparklineValues.length]);

  const handleCardMouseLeave = useCallback(() => setNftHoverIdx(null), []);

  return (
    <div
      className={`px-4 py-3 sm:border-r border-white/[0.06] border-b sm:border-b-0 ${hasNftSparkline ? 'cursor-pointer select-none transition-colors hover:bg-white/[0.02]' : ''} ${nftCardSparkline ? 'bg-[var(--gs-purple)]/[0.06]' : ''}`}
      onClick={hasNftSparkline ? onToggleNftCardSparkline : undefined}
      onMouseMove={nftCardSparkline ? handleCardMouseMove : undefined}
      onMouseLeave={nftCardSparkline ? handleCardMouseLeave : undefined}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
          NFT Holdings
        </p>
        {walletCount && walletCount > 1 && (
          <span className="font-mono text-[9px] text-[var(--gs-purple)] opacity-70 tabular-nums">{walletCount} wallets</span>
        )}
        {hasNftSparkline && (
          <DotIndicator activeIndex={nftCardSparkline ? 1 : 0} color="var(--gs-purple)" />
        )}
      </div>
      {isInitializing ? (
        <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className="grid">
          {/* Layer 1: Data view */}
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
          {/* Layer 2: Inline sparkline */}
          <div
            style={{ gridArea: '1/1', transitionDelay: nftCardSparkline ? '100ms' : '0ms' }}
            className={`relative transition-opacity duration-300 ease-out ${
              nftCardSparkline ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
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
              <div ref={sparklineRef} className="mt-1 w-full" aria-hidden="true">
                <MiniSparkline
                  values={nftSparklineValues}
                  height={MINI_H}
                  color="#6D5BFF"
                  hoverIndex={nftHoverIdx}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
