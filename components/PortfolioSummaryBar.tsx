'use client';

import { useCallback, useMemo, useState } from 'react';
import { NFT, EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult, formatUsd } from '@/lib/portfolio/calcPortfolio';
import useCountUp from '@/hooks/useCountUp';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import InfoTooltip from '@/components/ui/InfoTooltip';
export type PortfolioViewMode = 'simple' | 'detailed';

interface PortfolioSummaryBarProps {
  portfolioResult: PortfolioCalcResult | null;
  gunPrice: number | undefined;
  nfts: NFT[];
  isInitializing?: boolean;
  enrichmentProgress?: EnrichmentProgress | null;
  onRetryEnrichment?: () => void;
  viewMode: PortfolioViewMode;
  onViewModeChange: (mode: PortfolioViewMode) => void;
}

export default function PortfolioSummaryBar({
  portfolioResult,
  gunPrice,
  nfts,
  isInitializing = false,
  enrichmentProgress,
  onRetryEnrichment,
  viewMode,
  onViewModeChange,
}: PortfolioSummaryBarProps) {
  // Calculate NFT-based P&L from floor prices with coverage info
  const nftPnL = useMemo(() => {
    let totalFloorValue = 0;
    let totalSpent = 0;
    let nftsWithBothValues = 0;
    let nftsWithCost = 0;
    let nftsFreeTransfer = 0;
    const totalItems = nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);

    for (const nft of nfts) {
      const quantity = nft.quantity || 1;
      const floor = nft.floorPrice;
      const cost = nft.purchasePriceGun;

      if (nft.isFreeTransfer) {
        nftsFreeTransfer += quantity;
      } else if (cost !== undefined && cost > 0) {
        nftsWithCost += quantity;
      }

      // Only count NFTs that have both floor price and purchase price for P&L
      if (floor !== undefined && floor > 0 && cost !== undefined && cost > 0) {
        totalFloorValue += floor * quantity;
        totalSpent += cost * quantity;
        nftsWithBothValues += quantity;
      }
    }

    const unrealizedGun = nftsWithBothValues > 0 && totalSpent > 0
      ? totalFloorValue - totalSpent : null;
    const unrealizedUsd = unrealizedGun !== null && gunPrice
      ? unrealizedGun * gunPrice : null;
    const pct = unrealizedGun !== null && totalSpent > 0
      ? (unrealizedGun / totalSpent) * 100 : null;

    return {
      unrealizedGun, unrealizedUsd, pct,
      coverage: nftsWithBothValues,
      totalItems,
      nftsWithCost,
      nftsFreeTransfer,
    };
  }, [nfts, gunPrice]);

  // Acquisition breakdown by venue
  const acquisitionBreakdown = useMemo(() => {
    let minted = 0, mintedGun = 0;
    let bought = 0, boughtGun = 0;
    let transferred = 0;
    let unknown = 0;

    for (const nft of nfts) {
      const qty = nft.quantity || 1;
      const venue = nft.acquisitionVenue;
      const cost = nft.purchasePriceGun ?? 0;

      if (venue === 'decode' || venue === 'decoder' || venue === 'mint' || venue === 'system_mint') {
        minted += qty;
        mintedGun += cost * qty;
      } else if (venue === 'opensea' || venue === 'otg_marketplace' || venue === 'in_game_marketplace') {
        bought += qty;
        boughtGun += cost * qty;
      } else if (venue === 'transfer' || nft.isFreeTransfer) {
        transferred += qty;
      } else if (venue) {
        unknown += qty;
      } else {
        // No venue data yet (un-enriched)
        unknown += qty;
      }
    }

    return { minted, mintedGun, bought, boughtGun, transferred, unknown };
  }, [nfts]);

  // Calculate total portfolio P&L percentage
  const totalPnLPct = useMemo(() => {
    if (!portfolioResult || nftPnL.pct === null) return null;

    // Simple approach: use NFT P&L as the overall P&L indicator
    // (GUN tokens don't have a "cost basis" to compare against)
    return nftPnL.pct;
  }, [portfolioResult, nftPnL.pct]);

  // Format values
  const totalValue = portfolioResult?.totalUsd ?? 0;
  const gunHoldings = portfolioResult?.totalGunBalance ?? 0;
  const gunValue = portfolioResult?.tokensUsd ?? 0;
  const totalGunSpent = portfolioResult?.totalGunSpent ?? 0;
  const nftCount = portfolioResult?.nftCount ?? nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);

  // Animated count-up for total value
  const { displayValue: animatedTotal } = useCountUp({
    end: totalValue,
    duration: 1500,
    decimals: 2,
    startOnMount: true,
  });

  // Toggle view mode via parent callback
  const toggleViewMode = useCallback(() => {
    const next = viewMode === 'simple' ? 'detailed' : 'simple';
    if (next === 'simple') {
      setTopExpanded(false);
      setHoldingsExpanded(false);
      setPerformanceExpanded(false);
      setBreakdownOpen(false);
    }
    onViewModeChange(next);
  }, [viewMode, onViewModeChange]);

  // Toggle states — three binary toggles (consistent interaction model)
  const [topExpanded, setTopExpanded] = useState(false);
  const [holdingsExpanded, setHoldingsExpanded] = useState(false);
  const [performanceExpanded, setPerformanceExpanded] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const toggleTop = useCallback(() => setTopExpanded(prev => !prev), []);
  const toggleHoldings = useCallback(() => setHoldingsExpanded(prev => !prev), []);
  const togglePerformance = useCallback(() => setPerformanceExpanded(prev => !prev), []);
  const toggleBreakdown = useCallback(() => setBreakdownOpen(prev => !prev), []);

  // NFT floor value in USD from portfolio calculation
  const nftFloorValueUsd = portfolioResult?.nftsUsd ?? null;

  // Portfolio composition for mini chart
  const gunPct = totalValue > 0 ? (gunValue / totalValue) * 100 : 0;
  const nftPct = totalValue > 0 ? ((nftFloorValueUsd ?? 0) / totalValue) * 100 : 0;

  // Enrichment progress helpers
  const isEnriching = enrichmentProgress?.phase === 'enriching';
  const isEnrichmentComplete = enrichmentProgress?.phase === 'complete';
  const hasFailures = isEnrichmentComplete && (enrichmentProgress?.failedCount ?? 0) > 0;
  const progressPct = enrichmentProgress && enrichmentProgress.total > 0
    ? Math.round((enrichmentProgress.completed / enrichmentProgress.total) * 100)
    : null;

  const isProfit = totalPnLPct !== null && totalPnLPct > 0.01;
  const isLoss = totalPnLPct !== null && totalPnLPct < -0.01;

  if (!portfolioResult) return null;

  return (
    <div
      data-view={viewMode}
      className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden"
      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
    >
      {/* ================================================================= */}
      {/* VALUE HEADER — shared between Simple and Detailed modes           */}
      {/* ================================================================= */}
      <div
        className={`p-6 pb-4 ${viewMode === 'detailed' && !isInitializing ? 'cursor-pointer transition-colors duration-200 hover:bg-white/[0.01]' : ''}`}
        onClick={viewMode === 'detailed' && !isInitializing ? toggleTop : undefined}
      >
        <div className="relative" style={{ minHeight: '64px' }}>
          {/* Default: Total Value + P&L Badge + View Toggle */}
          <div
            className={`transition-all duration-200 ${
              topExpanded && viewMode === 'detailed' ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
            }`}
          >
            <div className="flex justify-between items-start">
              <div aria-live="polite" aria-busy={isInitializing}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                    Total Portfolio Value
                  </p>
                  {portfolioResult?.confidence && (
                    <ConfidenceIndicator confidence={portfolioResult.confidence} />
                  )}
                  {/* Detailed mode: method tag pill */}
                  {viewMode === 'detailed' && !isInitializing && (
                    <span className="font-mono text-micro tracking-wider text-[var(--gs-gray-3)] border border-white/[0.08] px-1.5 py-0.5 ml-1">
                      GUN live &middot; NFTs at cost
                    </span>
                  )}
                </div>
                {isInitializing ? (
                  <div className="space-y-2">
                    <span className="font-display text-4xl font-bold text-[var(--gs-gray-3)]">
                      Calculating
                    </span>
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
                  <>
                    <p className="font-display text-4xl font-bold text-[var(--gs-white)]">
                      ${animatedTotal}
                    </p>
                    {/* Detailed mode: asset split line below hero */}
                    {viewMode === 'detailed' && (
                      <p className="font-mono text-caption text-[var(--gs-gray-3)] mt-1">
                        <span className="text-[var(--gs-lime)]">{gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="text-[var(--gs-gray-2)]"> GUN</span>
                        <span className="text-[var(--gs-gray-2)] mx-1.5">&middot;</span>
                        <span className="text-[var(--gs-purple)]">{nftCount.toLocaleString()}</span>
                        <span className="text-[var(--gs-gray-2)]"> NFTs</span>
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Right column: View toggle + P&L Badge */}
              <div className="flex items-center gap-2">
                {/* View mode toggle */}
                {!isInitializing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleViewMode(); }}
                    className="font-mono text-micro tracking-wider uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors px-2 py-1 border border-white/[0.06] hover:border-[var(--gs-lime)]/20 cursor-pointer whitespace-nowrap"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
                  >
                    {viewMode === 'simple' ? '\u25C9 Detailed' : '\u25CF Simple'}
                  </button>
                )}

                {/* Detailed mode: enrichment indicator */}
                {viewMode === 'detailed' && !isInitializing && (isEnriching || isEnrichmentComplete) && (
                  <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums whitespace-nowrap">
                    {isEnriching ? (
                      <><span className="text-[var(--gs-lime)] animate-pulse">{'\u229B'}</span> {enrichmentProgress?.completed ?? 0}/{enrichmentProgress?.total ?? 0}</>
                    ) : (
                      <><span className="text-[var(--gs-gray-3)]">{'\u25CF'}</span> {enrichmentProgress?.total ?? nftCount}/{enrichmentProgress?.total ?? nftCount}</>
                    )}
                  </span>
                )}

                {/* P&L Badge */}
                {totalPnLPct !== null && !isInitializing ? (
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
                ) : portfolioResult && !isInitializing && viewMode === 'detailed' && (isEnriching || totalGunSpent === 0) ? (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 border bg-white/5 ${hasFailures ? 'border-[var(--gs-loss)]/20' : 'border-white/10'}`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    {isEnriching ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
                        <span className="font-mono text-data text-[var(--gs-gray-3)] tabular-nums">
                          {enrichmentProgress && enrichmentProgress.total > 0
                            ? `${enrichmentProgress.completed}/${enrichmentProgress.total}`
                            : 'Analyzing'}
                        </span>
                      </>
                    ) : isEnrichmentComplete ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-gray-3)]" />
                        <span className="font-mono text-data text-[var(--gs-gray-3)] tabular-nums">
                          All transferred
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse" />
                        <span className="font-mono text-data text-[var(--gs-gray-3)] tabular-nums">
                          Analyzing
                        </span>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Toggled: Enrichment / Portfolio Construction Detail (Detailed mode only) */}
          {viewMode === 'detailed' && (
            <div
              className={`absolute inset-0 transition-all duration-200 ${
                topExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                  Portfolio Construction
                </p>
                <span className="font-mono text-micro text-[var(--gs-gray-3)] ml-auto">
                  {'\u25C0'} back
                </span>
              </div>

              {isEnriching && enrichmentProgress && enrichmentProgress.total > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-4)]">Enriching</span>
                    <span className="font-mono text-2xl font-semibold text-[var(--gs-white)] tabular-nums">
                      {enrichmentProgress.completed}
                    </span>
                    <span className="font-mono text-sm text-[var(--gs-gray-3)] tabular-nums">
                      / {enrichmentProgress.total}
                    </span>
                  </div>
                  <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] transition-all duration-300 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                    <div className="absolute inset-0 enrichment-bar-shimmer" />
                  </div>
                </div>
              ) : isEnriching ? (
                <p className="font-mono text-sm text-[var(--gs-gray-3)] animate-pulse">
                  Analyzing&hellip;
                </p>
              ) : (
                <div className="flex items-baseline gap-4 flex-wrap">
                  <div>
                    <span className="font-mono text-caption text-[var(--gs-gray-4)] block mb-0.5">GUN Tokens</span>
                    <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                      ${formatUsd(gunValue)}
                    </span>
                    <span className="font-mono text-caption text-[var(--gs-gray-3)] ml-2">
                      {gunPct.toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="font-mono text-caption text-[var(--gs-gray-4)] block mb-0.5">NFTs</span>
                    <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                      {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
                    </span>
                    <span className="font-mono text-caption text-[var(--gs-gray-3)] ml-2">
                      {nftPct.toFixed(0)}%
                    </span>
                  </div>
                  {totalGunSpent > 0 && (
                    <div>
                      <span className="font-mono text-caption text-[var(--gs-gray-4)] block mb-0.5">Spent</span>
                      <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                        {totalGunSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} GUN
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* DETAILED MODE: Breakdown Drawer                                   */}
      {/* ================================================================= */}
      {viewMode === 'detailed' && !isInitializing && breakdownOpen && (
        <div className="border-t border-white/[0.06] px-6 py-4 bg-white/[0.01] space-y-4">
          {/* Valuation Sources */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)]" />
                <span className="font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-4)]">
                  GUN Token
                </span>
              </div>
              <p className="font-mono text-sm font-semibold text-[var(--gs-white)]">
                ${formatUsd(gunValue)}
              </p>
              <p className="font-mono text-micro text-[var(--gs-gray-3)] mt-1">
                CoinGecko &middot; Live
              </p>
              {gunPrice && (
                <p className="font-mono text-micro text-[var(--gs-gray-2)] mt-0.5">
                  {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })} &times; ${gunPrice.toFixed(4)}
                </p>
              )}
            </div>
            <div className="p-3 border border-white/[0.06]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-warning)]" />
                <span className="font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-4)]">
                  NFT Holdings
                </span>
              </div>
              <p className="font-mono text-sm font-semibold text-[var(--gs-white)]">
                {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
              </p>
              <p className="font-mono text-micro text-[var(--gs-gray-3)] mt-1">
                Cost Basis
              </p>
              <p className="font-mono text-micro text-[var(--gs-gray-2)] mt-0.5">
                Mkt Est. &mdash; Not yet available
              </p>
            </div>
          </div>

          {/* P&L Decomposition */}
          {nftPnL.unrealizedGun !== null && (
            <div className={`p-3 border ${nftPnL.unrealizedGun >= 0 ? 'border-[var(--gs-profit)]/10 bg-[var(--gs-profit)]/[0.02]' : 'border-[var(--gs-loss)]/10 bg-[var(--gs-loss)]/[0.02]'}`}>
              <p className="font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-4)] mb-2">
                P&L Decomposition
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex justify-between">
                  <span className="font-mono text-micro text-[var(--gs-gray-3)]">NFT Floor Value</span>
                  <span className="font-mono text-micro text-[var(--gs-white)] tabular-nums">
                    {nftPnL.coverage > 0 ? `${((nftPnL.unrealizedGun ?? 0) + (totalGunSpent > 0 ? totalGunSpent : 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN` : '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-micro text-[var(--gs-gray-3)]">Cost Basis</span>
                  <span className="font-mono text-micro text-[var(--gs-white)] tabular-nums">
                    {totalGunSpent > 0 ? `${totalGunSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN` : '\u2014'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-micro text-[var(--gs-gray-3)]">Unrealized P&L</span>
                  <span className={`font-mono text-micro tabular-nums ${nftPnL.unrealizedGun >= 0 ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
                    {nftPnL.unrealizedGun >= 0 ? '+' : ''}{nftPnL.unrealizedGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-micro text-[var(--gs-gray-3)]">Coverage</span>
                  <span className="font-mono text-micro text-[var(--gs-white)] tabular-nums">
                    {nftPnL.coverage}/{nftPnL.totalItems}
                  </span>
                </div>
              </div>
              <p className="font-mono text-micro text-[var(--gs-gray-2)] mt-2 italic">
                Floor price is collection-level, not per-item
              </p>
            </div>
          )}

          {/* Data Quality */}
          <div className="space-y-2">
            <p className="font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-4)]">
              Data Quality
            </p>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">Cost Data</span>
                <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums">
                  {nftPnL.totalItems > 0 ? Math.round(((nftPnL.nftsWithCost + nftPnL.nftsFreeTransfer) / nftPnL.totalItems) * 100) : 0}% &middot; {nftPnL.nftsWithCost} enriched / {nftPnL.totalItems - nftPnL.nftsWithCost - nftPnL.nftsFreeTransfer} unknown
                </span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div
                  className="h-full bg-[var(--gs-lime)]"
                  style={{ width: `${nftPnL.totalItems > 0 ? ((nftPnL.nftsWithCost + nftPnL.nftsFreeTransfer) / nftPnL.totalItems) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">Market Data</span>
                <span className="font-mono text-micro text-[var(--gs-gray-2)] tabular-nums">
                  0% &middot; Per-item pricing planned
                </span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
                <div className="h-full bg-[var(--gs-gray-2)]" style={{ width: '0%' }} />
              </div>
            </div>
          </div>

          {/* Enrichment Progress */}
          {enrichmentProgress && enrichmentProgress.total > 0 && (
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-mono text-micro text-[var(--gs-gray-3)]">
                  Enrichment {isEnriching ? '' : 'Complete'}
                </span>
                <span className="font-mono text-micro text-[var(--gs-gray-3)] tabular-nums">
                  {enrichmentProgress.completed}/{enrichmentProgress.total}
                  {(enrichmentProgress.failedCount ?? 0) > 0 && (
                    <span className="text-[var(--gs-loss)] ml-1">({enrichmentProgress.failedCount} failed)</span>
                  )}
                </span>
              </div>
              <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
                {isEnriching && <div className="absolute inset-0 enrichment-bar-shimmer" />}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed mode: Breakdown toggle button */}
      {viewMode === 'detailed' && !isInitializing && (
        <div className="border-t border-white/[0.06]">
          <button
            onClick={toggleBreakdown}
            className="w-full px-6 py-2 flex items-center justify-center gap-1.5 font-mono text-micro tracking-widest uppercase text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] hover:bg-white/[0.01] transition-colors cursor-pointer"
          >
            <span className={`transition-transform duration-200 ${breakdownOpen ? 'rotate-180' : ''}`}>
              {'\u25BE'}
            </span>
            {breakdownOpen ? 'Hide Breakdown' : 'Breakdown'}
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* SIMPLE MODE: 4-Cell Metrics Row                                    */}
      {/* ================================================================= */}
      {viewMode === 'simple' && (
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

          {/* Unrealized P&L */}
          <div className="px-4 py-3">
            <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">
              Unrealized P&L
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
      )}

      {/* ================================================================= */}
      {/* DETAILED MODE: 2-Column Grid — Holdings + Performance             */}
      {/* ================================================================= */}
      {viewMode === 'detailed' && isInitializing && (
        <div className="border-t border-white/[0.06] grid grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className={`p-4 ${i === 1 ? 'border-r border-white/[0.06]' : ''}`}>
              <div className="h-3 w-16 bg-white/5 rounded animate-pulse mb-3" />
              <div className="h-5 w-24 bg-white/10 rounded animate-pulse mb-2" />
              <div className="h-3 w-20 bg-white/5 rounded animate-pulse mb-2" />
              <div className="h-3 w-28 bg-white/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}
      {viewMode === 'detailed' && !isInitializing && (
        <div className="border-t border-white/[0.06] grid grid-cols-2">
          {/* Column 1 — Holdings */}
          <div
            className={`p-4 border-r border-white/[0.06] stat-cell-animate cursor-pointer transition-all duration-200 group/hold ${
              holdingsExpanded ? 'bg-[var(--gs-lime)]/[0.03]' : 'hover:bg-[var(--gs-lime)]/[0.02]'
            }`}
            onClick={toggleHoldings}
          >
            <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-3 flex items-center gap-1.5">
              Holdings
              <span className="font-mono text-micro text-[var(--gs-gray-3)] group-hover/hold:text-[var(--gs-lime)] transition-colors duration-200 ml-auto">
                {holdingsExpanded ? '\u25C0 back' : 'tap \u25B6'}
              </span>
            </p>

            <div className="relative" style={{ minHeight: '80px' }}>
              {/* Default: Acquisition Breakdown */}
              <div
                className={`transition-all duration-200 ${
                  holdingsExpanded ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
                }`}
              >
                <div className="space-y-1.5">
                  {acquisitionBreakdown.minted > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-caption text-[var(--gs-gray-4)]">
                        <span className="text-[var(--gs-lime)]">{'\u25C6'}</span> {acquisitionBreakdown.minted} Minted
                      </span>
                      <span className="font-mono text-caption text-[var(--gs-white)] tabular-nums">
                        {acquisitionBreakdown.mintedGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                      </span>
                    </div>
                  )}
                  {acquisitionBreakdown.bought > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-caption text-[var(--gs-gray-4)]">
                        <span className="text-[var(--gs-purple)]">{'\u25C6'}</span> {acquisitionBreakdown.bought} Bought
                      </span>
                      <span className="font-mono text-caption text-[var(--gs-white)] tabular-nums">
                        {acquisitionBreakdown.boughtGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                      </span>
                    </div>
                  )}
                  {acquisitionBreakdown.transferred > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-caption text-[var(--gs-gray-4)]">
                        <span className="text-[var(--gs-gray-3)]">{'\u25C6'}</span> {acquisitionBreakdown.transferred} Transferred
                      </span>
                      <span className="font-mono text-caption text-[var(--gs-gray-3)]">free</span>
                    </div>
                  )}
                  {acquisitionBreakdown.unknown > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-caption text-[var(--gs-gray-4)]">
                        <span className="text-[var(--gs-gray-2)]">{'\u25C6'}</span> {acquisitionBreakdown.unknown} Unknown
                      </span>
                      <span className="font-mono text-caption text-[var(--gs-gray-2)]">&mdash;</span>
                    </div>
                  )}
                  {acquisitionBreakdown.minted === 0 && acquisitionBreakdown.bought === 0 && acquisitionBreakdown.transferred === 0 && acquisitionBreakdown.unknown === 0 && (
                    <p className="font-mono text-caption text-[var(--gs-gray-3)]">No data yet</p>
                  )}
                </div>
              </div>

              {/* Expanded: Composition Bar + GUN/NFT values */}
              <div
                className={`absolute inset-0 transition-all duration-200 ${
                  holdingsExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
              >
                {/* GUN row */}
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                    ${formatUsd(gunValue)}
                  </span>
                  <span className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums">
                    {gunPct.toFixed(0)}%
                  </span>
                </div>
                <p className="font-mono text-caption text-[var(--gs-gray-3)] mb-3">
                  {gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-[var(--gs-lime)]">GUN</span>
                </p>

                {/* Thin composition bar */}
                <div
                  className="h-[3px] w-full flex mb-3 overflow-hidden"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                >
                  <div className="h-full bg-[var(--gs-lime)]" style={{ width: `${gunPct}%` }} />
                  <div className="h-full bg-[var(--gs-purple)]" style={{ width: `${nftPct}%` }} />
                </div>

                {/* NFT row */}
                <div className="flex items-baseline justify-between mb-0.5">
                  <span className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                    {nftFloorValueUsd !== null ? `$${formatUsd(nftFloorValueUsd)}` : '\u2014'}
                  </span>
                  <span className="font-mono text-caption text-[var(--gs-gray-4)] tabular-nums">
                    {nftPct.toFixed(0)}%
                  </span>
                </div>
                <p className="font-mono text-caption text-[var(--gs-gray-3)]">
                  {nftCount.toLocaleString()} <span className="text-[var(--gs-purple)]">NFTs</span>
                </p>
              </div>
            </div>
          </div>

          {/* Column 2 — Performance */}
          <div
            className={`p-4 stat-cell-animate cursor-pointer transition-all duration-200 group/perf ${
              performanceExpanded ? 'bg-[var(--gs-purple)]/[0.04]' : 'hover:bg-[var(--gs-purple)]/[0.03]'
            }`}
            onClick={togglePerformance}
          >
            <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-3 flex items-center gap-1.5">
              Performance
              <InfoTooltip text="Unrealized P&L based on floor prices vs acquisition cost. Click for cost basis." />
              <span className="font-mono text-micro text-[var(--gs-gray-3)] group-hover/perf:text-[var(--gs-purple)] transition-colors duration-200 ml-auto">
                {performanceExpanded ? '\u25C0 back' : 'tap \u25B6'}
              </span>
            </p>

            <div className="relative" style={{ minHeight: '80px' }}>
              {/* Default: P&L display */}
              <div
                className={`transition-all duration-200 ${
                  performanceExpanded ? 'opacity-0 -translate-y-2 pointer-events-none' : 'opacity-100 translate-y-0'
                }`}
              >
                {isEnriching && enrichmentProgress && enrichmentProgress.total > 0 ? (
                  <div className="flex flex-col justify-center gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-4)]">Analyzing</span>
                      <span className="font-mono text-2xl font-semibold text-[var(--gs-white)] tabular-nums">
                        {enrichmentProgress.completed}
                      </span>
                      <span className="font-mono text-sm text-[var(--gs-gray-3)] tabular-nums">
                        / {enrichmentProgress.total}
                      </span>
                    </div>
                    <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] transition-all duration-300 ease-out"
                        style={{ width: `${progressPct}%` }}
                      />
                      <div className="absolute inset-0 enrichment-bar-shimmer" />
                    </div>
                  </div>
                ) : isEnriching ? (
                  <p className="font-mono text-sm text-[var(--gs-gray-3)] animate-pulse">
                    Analyzing&hellip;
                  </p>
                ) : nftPnL.unrealizedUsd !== null ? (
                  <div>
                    <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-4)] block mb-1">Unrealized P&L</span>
                    <span
                      className={`font-mono text-xl font-semibold ${
                        nftPnL.unrealizedUsd > 0
                          ? 'text-[var(--gs-profit)]'
                          : nftPnL.unrealizedUsd < 0
                          ? 'text-[var(--gs-loss)]'
                          : 'text-[var(--gs-white)]'
                      }`}
                    >
                      {nftPnL.unrealizedUsd >= 0 ? '+' : '-'}${formatUsd(Math.abs(nftPnL.unrealizedUsd))}
                    </span>
                    {nftPnL.pct !== null && (
                      <span
                        className={`font-mono text-sm ml-1.5 ${
                          nftPnL.pct > 0 ? 'text-[var(--gs-profit)]' : nftPnL.pct < 0 ? 'text-[var(--gs-loss)]' : 'text-[var(--gs-gray-3)]'
                        }`}
                      >
                        ({nftPnL.pct >= 0 ? '+' : ''}{nftPnL.pct.toFixed(1)}%)
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                        {nftPnL.coverage} of {nftPnL.totalItems} priced
                      </span>
                      {hasFailures && onRetryEnrichment && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onRetryEnrichment(); }}
                          className="font-mono text-micro uppercase tracking-wider text-[var(--gs-loss)] hover:text-[var(--gs-loss)]/80 transition-colors cursor-pointer"
                        >
                          {enrichmentProgress!.failedCount} failed &middot; retry
                        </button>
                      )}
                    </div>
                  </div>
                ) : totalGunSpent > 0 ? (
                  <div>
                    <span className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-4)] block mb-1">Cost Basis</span>
                    <span className="font-mono text-xl font-semibold text-[var(--gs-white)]">
                      {totalGunSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                    </span>
                    <p className="font-mono text-caption text-[var(--gs-gray-4)] mt-1">
                      {nftPnL.nftsWithCost} purchased
                    </p>
                    {hasFailures && onRetryEnrichment && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onRetryEnrichment(); }}
                        className="font-mono text-micro uppercase tracking-wider text-[var(--gs-loss)] hover:text-[var(--gs-loss)]/80 transition-colors cursor-pointer mt-1"
                      >
                        retry
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="font-mono text-lg font-semibold text-[var(--gs-gray-3)]">
                      {nftPnL.totalItems} items
                    </span>
                    <p className="font-mono text-caption text-[var(--gs-gray-3)] mt-1">
                      {nftPnL.nftsFreeTransfer > 0 ? `${nftPnL.nftsFreeTransfer} transferred free` : 'No purchase data yet'}
                    </p>
                  </div>
                )}
              </div>

              {/* Expanded: Cost Basis */}
              <div
                className={`absolute inset-0 transition-all duration-200 ${
                  performanceExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                }`}
              >
                <p className="font-mono text-caption text-[var(--gs-gray-4)] mb-2 uppercase tracking-wider">
                  Cost Basis
                </p>
                {totalGunSpent > 0 ? (
                  <div className="space-y-1.5">
                    <p className="font-mono text-lg font-semibold text-[var(--gs-white)]">
                      {totalGunSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                    </p>
                    {gunPrice && (
                      <p className="font-mono text-caption text-[var(--gs-gray-3)]">
                        ${formatUsd(totalGunSpent * gunPrice)} at current price
                      </p>
                    )}
                    <p className="font-mono text-caption text-[var(--gs-gray-4)]">
                      {nftPnL.coverage} of {nftPnL.totalItems} with floor &amp; cost
                    </p>
                  </div>
                ) : (
                  <p className="font-mono text-caption text-[var(--gs-gray-3)]">No purchase data</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

