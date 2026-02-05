'use client';

import { useCallback, useMemo, useState } from 'react';
import { NFT } from '@/lib/types';
import { PortfolioCalcResult, formatUsd } from '@/lib/portfolio/calcPortfolio';
import useCountUp from '@/hooks/useCountUp';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';

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
  const totalGunSpent = portfolioResult?.totalGunSpent ?? 0;
  const nftCount = portfolioResult?.nftCount ?? nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);

  // Animated count-up for total value
  const { displayValue: animatedTotal } = useCountUp({
    end: totalValue,
    duration: 1500,
    decimals: 2,
    startOnMount: true,
  });

  // Hover states for interactive reveal
  const [gunHovered, setGunHovered] = useState(false);
  const [nftHovered, setNftHovered] = useState(false);

  // Memoized hover handlers to prevent re-creation on each render
  const handleGunMouseEnter = useCallback(() => setGunHovered(true), []);
  const handleGunMouseLeave = useCallback(() => setGunHovered(false), []);
  const handleNftMouseEnter = useCallback(() => setNftHovered(true), []);
  const handleNftMouseLeave = useCallback(() => setNftHovered(false), []);

  // Calculate total USD cost basis from acquisition prices
  const totalCostBasisUsd = useMemo(() => {
    let total = 0;
    for (const nft of nfts) {
      if (nft.purchasePriceUsd !== undefined && nft.purchasePriceUsd > 0) {
        total += nft.purchasePriceUsd * (nft.quantity || 1);
      }
    }
    return total > 0 ? total : null;
  }, [nfts]);

  const isProfit = totalPnLPct !== null && totalPnLPct > 1;
  const isLoss = totalPnLPct !== null && totalPnLPct < -1;

  if (!portfolioResult) return null;

  return (
    <div
      className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden"
      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
    >
      {/* Top Section - Total Value */}
      <div className="p-6 pb-4 flex justify-between items-start">
        <div aria-live="polite" aria-busy={isInitializing}>
          <div className="flex items-center gap-2 mb-1">
            <p className="font-mono text-[10px] tracking-widest uppercase text-[var(--gs-gray-4)]">
              Total Portfolio Value
            </p>
            {portfolioResult?.confidence && (
              <ConfidenceIndicator confidence={portfolioResult.confidence} />
            )}
          </div>
          {isInitializing ? (
            <div className="space-y-2">
              <span className="font-display text-4xl font-bold text-[var(--gs-gray-3)]">
                Calculating
              </span>
              {/* Branded gradient loading bar */}
              <div
                className="h-[3px] w-48 bg-[var(--gs-dark-4)] overflow-hidden"
                style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
              >
                <div
                  className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] animate-loading-bar"
                  style={{ width: '40%' }}
                />
              </div>
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
            className={`flex items-center gap-1.5 px-3 py-1.5 border ${
              isProfit
                ? 'bg-[var(--gs-profit)]/10 border-[var(--gs-profit)]/30 text-[var(--gs-profit)]'
                : isLoss
                ? 'bg-[var(--gs-loss)]/10 border-[var(--gs-loss)]/30 text-[var(--gs-loss)]'
                : 'bg-white/5 border-white/10 text-[var(--gs-gray-4)]'
            }`}
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
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
      {isInitializing ? (
        <div className="grid grid-cols-3 border-t border-white/[0.06]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`p-4 ${i < 3 ? 'border-r border-white/[0.06]' : ''}`}
            >
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse mb-2" />
              <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 border-t border-white/[0.06]">
          {/* GUN Balance - Interactive hover reveal */}
          <div
            className={`p-4 border-r border-white/[0.06] stat-cell-animate cursor-pointer transition-all duration-200 ${
              gunHovered ? 'bg-[var(--gs-lime)]/5' : ''
            }`}
            onMouseEnter={handleGunMouseEnter}
            onMouseLeave={handleGunMouseLeave}
          >
            <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
              GUN Balance Today
            </p>
            <div className="relative h-[52px] overflow-hidden">
              {/* Default: Token count */}
              <div
                className={`transition-all duration-200 ${
                  gunHovered ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
                }`}
              >
                <p className="font-mono text-2xl font-semibold text-[var(--gs-lime)]">
                  {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">
                  tokens
                </p>
              </div>
              {/* Hover: USD value */}
              <div
                className={`absolute inset-0 transition-all duration-200 ${
                  gunHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                <p className="font-mono text-2xl font-semibold text-[var(--gs-white)]">
                  ${formatUsd(gunValue)}
                </p>
                <p className="font-mono text-[10px] text-[var(--gs-lime)] mt-1">
                  {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
                </p>
              </div>
            </div>
          </div>

          {/* NFT Holdings - Interactive hover reveal */}
          <div
            className={`p-4 border-r border-white/[0.06] stat-cell-animate cursor-pointer transition-all duration-200 ${
              nftHovered ? 'bg-[var(--gs-purple)]/5' : ''
            }`}
            onMouseEnter={handleNftMouseEnter}
            onMouseLeave={handleNftMouseLeave}
          >
            <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
              NFT Holdings
            </p>
            <div className="relative h-[52px] overflow-hidden">
              {/* Default: NFT count */}
              <div
                className={`transition-all duration-200 ${
                  nftHovered ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
                }`}
              >
                <p className="font-mono text-2xl font-semibold text-[var(--gs-white)]">
                  {nftCount.toLocaleString()}
                </p>
                <p className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">
                  items
                </p>
              </div>
              {/* Hover: Cost basis */}
              <div
                className={`absolute inset-0 transition-all duration-200 ${
                  nftHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                {totalGunSpent > 0 || totalCostBasisUsd !== null ? (
                  <>
                    <p className="font-mono text-2xl font-semibold text-[var(--gs-purple)]">
                      {totalGunSpent > 0
                        ? totalGunSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : '—'}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">
                      GUN spent{totalCostBasisUsd !== null && ` · $${formatUsd(totalCostBasisUsd)}`}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-mono text-2xl font-semibold text-[var(--gs-gray-3)]">
                      —
                    </p>
                    <p className="font-mono text-[10px] text-[var(--gs-gray-4)] mt-1">
                      cost basis
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Unrealized P&L */}
          <div className="p-4 stat-cell-animate">
            <p className="font-mono text-[9px] tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
              Unrealized P&L
            </p>
            {nftPnL.unrealizedUsd !== null ? (
              <div className="h-[52px]">
                <p
                  className={`font-mono text-2xl font-semibold ${
                    nftPnL.unrealizedUsd > 0
                      ? 'text-[var(--gs-profit)]'
                      : nftPnL.unrealizedUsd < 0
                      ? 'text-[var(--gs-loss)]'
                      : 'text-[var(--gs-white)]'
                  }`}
                >
                  {nftPnL.unrealizedUsd >= 0 ? '+' : '-'}${formatUsd(Math.abs(nftPnL.unrealizedUsd))}
                </p>
                {nftPnL.pct !== null && (
                  <p
                    className={`font-mono text-[11px] mt-0.5 ${
                      nftPnL.pct > 0 ? 'text-[var(--gs-profit)]' : nftPnL.pct < 0 ? 'text-[var(--gs-loss)]' : 'text-[var(--gs-gray-3)]'
                    }`}
                  >
                    {nftPnL.pct >= 0 ? '+' : ''}{nftPnL.pct.toFixed(1)}% from cost
                  </p>
                )}
              </div>
            ) : (
              <div className="h-[52px] flex flex-col justify-center">
                {/* Animated progress bar */}
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] rounded-full animate-pulse"
                      style={{ width: '60%' }}
                    />
                  </div>
                </div>
                {/* Status text */}
                <p className="font-mono text-[11px] text-[var(--gs-gray-3)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
                  Analyzing...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
