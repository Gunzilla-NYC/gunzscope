import { memo, useState, useCallback } from 'react';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { DotIndicator } from '@/components/ui/DotIndicator';
import { NftPnL } from '../types';

interface GunSpentCardProps {
  isInitializing: boolean;
  totalGunSpent: number;
  gunPrice: number | undefined;
  nftPnL: NftPnL;
}

export const GunSpentCard = memo(function GunSpentCard({
  isInitializing,
  totalGunSpent,
  gunPrice,
  nftPnL,
}: GunSpentCardProps) {
  const [flipped, setFlipped] = useState(false);
  const toggle = useCallback(() => setFlipped(prev => !prev), []);

  const hasPnL = nftPnL.unrealizedGun !== null;
  const pnlGun = nftPnL.unrealizedGun ?? 0;
  const pnlUsd = nftPnL.unrealizedUsd ?? 0;
  const pnlIsProfit = pnlGun >= 0;

  return (
    <div
      className="px-4 py-3 border-r border-white/[0.06] cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
      onClick={toggle}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
          {flipped ? 'Unrealized P&L' : 'GUN Spent'}
        </p>
        <DotIndicator activeIndex={flipped ? 1 : 0} />
      </div>
      {isInitializing ? (
        <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className="grid">
          {/* Face A: Cost basis */}
          <div
            style={{ gridArea: '1/1' }}
            className={`transition-opacity duration-300 ease-out ${
              !flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
            style={{ gridArea: '1/1', transitionDelay: flipped ? '100ms' : '0ms' }}
            className={`transition-opacity duration-300 ease-out ${
              flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
                : nftPnL.nftsWithCost > 0 && nftPnL.coverage === 0
                ? 'Awaiting floor prices'
                : `${nftPnL.coverage} of ${nftPnL.totalItems} with P&L`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
