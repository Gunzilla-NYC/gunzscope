'use client';

import { useMemo } from 'react';
import { NFT } from '@/lib/types';
import { PortfolioCalcResult, formatUsd } from '@/lib/portfolio/calcPortfolio';
import useCountUp from '@/hooks/useCountUp';

interface PortfolioSummaryBarProps {
  portfolioResult: PortfolioCalcResult | null;
  gunPrice: number | undefined;
  nfts: NFT[];
  isInitializing?: boolean;
}

export default function PortfolioSummaryBar({
  portfolioResult,
  gunPrice,
  nfts,
  isInitializing = false,
}: PortfolioSummaryBarProps) {
  // Calculate NFT-based P&L from floor prices
  const nftPnL = useMemo(() => {
    let totalFloorValue = 0;
    let totalSpent = 0;
    let nftsWithBothValues = 0;

    for (const nft of nfts) {
      const quantity = nft.quantity || 1;
      const floor = nft.floorPrice;
      const cost = nft.purchasePriceGun;

      // Only count NFTs that have both floor price and purchase price
      if (floor !== undefined && floor > 0 && cost !== undefined && cost > 0) {
        totalFloorValue += floor * quantity;
        totalSpent += cost * quantity;
        nftsWithBothValues += quantity;
      }
    }

    if (nftsWithBothValues === 0 || totalSpent === 0) {
      return { unrealizedGun: null, unrealizedUsd: null, pct: null };
    }

    const unrealizedGun = totalFloorValue - totalSpent;
    const unrealizedUsd = gunPrice ? unrealizedGun * gunPrice : null;
    const pct = (unrealizedGun / totalSpent) * 100;

    return { unrealizedGun, unrealizedUsd, pct };
  }, [nfts, gunPrice]);

  // Calculate total portfolio P&L percentage
  const totalPnLPct = useMemo(() => {
    if (!portfolioResult || !nftPnL.pct) return null;

    // Simple approach: use NFT P&L as the overall P&L indicator
    // (GUN tokens don't have a "cost basis" to compare against)
    return nftPnL.pct;
  }, [portfolioResult, nftPnL.pct]);

  // Format values
  const totalValue = portfolioResult?.totalUsd ?? 0;
  const gunHoldings = portfolioResult?.totalGunBalance ?? 0;
  const gunValue = portfolioResult?.tokensUsd ?? 0;
  const nftValue = portfolioResult?.nftsUsd ?? 0;

  // Animated count-up for total value
  const { displayValue: animatedTotal } = useCountUp({
    end: totalValue,
    duration: 1500,
    decimals: 2,
    startOnMount: true,
  });

  const isProfit = totalPnLPct !== null && totalPnLPct > 1;
  const isLoss = totalPnLPct !== null && totalPnLPct < -1;

  if (!portfolioResult) return null;

  return (
    <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg overflow-hidden">
      {/* Top Section - Total Value */}
      <div className="p-6 pb-4 flex justify-between items-start">
        <div>
          <p className="font-mono text-[10px] tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
            Total Portfolio Value
          </p>
          {isInitializing ? (
            <div className="flex items-baseline gap-1">
              <span className="font-display text-4xl font-bold text-[var(--gs-gray-3)]">
                Calculating
              </span>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" style={{ animationDelay: '160ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-dot-bounce" style={{ animationDelay: '320ms' }} />
              </span>
            </div>
          ) : (
            <p className="font-display text-4xl font-bold text-[var(--gs-white)]">
              ${animatedTotal}
            </p>
          )}
        </div>

        {/* P&L Badge */}
        {totalPnLPct !== null && !isInitializing && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm border ${
              isProfit
                ? 'bg-[var(--gs-profit)]/10 border-[var(--gs-profit)]/30 text-[var(--gs-profit)]'
                : isLoss
                ? 'bg-[var(--gs-loss)]/10 border-[var(--gs-loss)]/30 text-[var(--gs-loss)]'
                : 'bg-white/5 border-white/10 text-[var(--gs-gray-4)]'
            }`}
          >
            {isProfit && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {isLoss && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-mono text-sm font-semibold">
              {totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/[0.06]">
        {/* GUN Holdings */}
        <div className="p-4 border-r border-white/[0.06]">
          <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
            GUN Holdings
          </p>
          <p className="font-mono text-lg font-semibold text-[var(--gs-lime)]">
            {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* GUN Value */}
        <div className="p-4 border-r border-white/[0.06] lg:border-r">
          <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
            GUN Value
          </p>
          <p className="font-mono text-lg font-semibold text-[var(--gs-white)]">
            ${formatUsd(gunValue)}
          </p>
        </div>

        {/* NFT Value */}
        <div className="p-4 border-r border-white/[0.06] border-t lg:border-t-0">
          <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
            NFT Value
          </p>
          <p className="font-mono text-lg font-semibold text-[var(--gs-white)]">
            {nftValue > 0 ? `$${formatUsd(nftValue)}` : '—'}
          </p>
        </div>

        {/* Unrealized P&L */}
        <div className="p-4 border-t lg:border-t-0">
          <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
            Unrealized P&L
          </p>
          {nftPnL.unrealizedUsd !== null ? (
            <p
              className={`font-mono text-lg font-semibold ${
                nftPnL.unrealizedUsd > 0
                  ? 'text-[var(--gs-profit)]'
                  : nftPnL.unrealizedUsd < 0
                  ? 'text-[var(--gs-loss)]'
                  : 'text-[var(--gs-white)]'
              }`}
            >
              {nftPnL.unrealizedUsd >= 0 ? '+' : ''}${formatUsd(Math.abs(nftPnL.unrealizedUsd))}
            </p>
          ) : (
            <p className="font-mono text-lg font-semibold text-[var(--gs-gray-3)]">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
