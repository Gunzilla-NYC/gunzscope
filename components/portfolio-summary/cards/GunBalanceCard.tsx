import { memo, useState, useCallback } from 'react';
import { formatUsd } from '@/lib/portfolio/calcPortfolio';
import { DotIndicator } from '@/components/ui/DotIndicator';

interface GunBalanceCardProps {
  isInitializing: boolean;
  gunHoldings: number;
  gunValue: number;
  gunPrice: number | undefined;
}

export const GunBalanceCard = memo(function GunBalanceCard({
  isInitializing,
  gunHoldings,
  gunValue,
  gunPrice,
}: GunBalanceCardProps) {
  const [flipped, setFlipped] = useState(false);
  const toggle = useCallback(() => setFlipped(prev => !prev), []);

  return (
    <div
      className="px-4 py-3 border-r border-white/[0.06] border-b sm:border-b-0 cursor-pointer select-none transition-colors hover:bg-white/[0.02]"
      onClick={toggle}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
          {flipped ? 'GUN Price' : 'GUN Balance'}
        </p>
        <DotIndicator activeIndex={flipped ? 1 : 0} color="var(--gs-lime)" />
      </div>
      {isInitializing ? (
        <div className="h-6 w-20 bg-white/5 rounded animate-pulse" />
      ) : (
        <div className="grid">
          {/* Face A: Balance */}
          <div
            style={{ gridArea: '1/1' }}
            className={`transition-opacity duration-300 ease-out ${
              !flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
            style={{ gridArea: '1/1', transitionDelay: flipped ? '100ms' : '0ms' }}
            className={`transition-opacity duration-300 ease-out ${
              flipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
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
  );
});
