'use client';

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { WalletData, NFT, NFTPaginationInfo } from '@/lib/types';
import { OpenSeaService } from '@/lib/api/opensea';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { groupNFTsByMetadata, mergeIntoGroups } from '@/lib/utils/nftGrouping';
import { calcPortfolio } from '@/lib/portfolio/calcPortfolio';
import { useNFTEnrichmentOrchestrator } from '@/lib/hooks/useNFTEnrichmentOrchestrator';
import { useWalletDataFetcher } from '@/lib/hooks/useWalletDataFetcher';
import { createEnrichmentUpdater } from '@/lib/utils/mergeEnrichedNFTs';
import { bootstrapPortfolioHistory } from '@/lib/utils/portfolioHistory';
import { usePortfolioSummaryData } from '@/components/portfolio-summary/usePortfolioSummaryData';
import useCountUp from '@/hooks/useCountUp';
import { BreakdownDrawer } from '@/components/portfolio-summary/BreakdownDrawer';
import { DetailedGrid } from '@/components/portfolio-summary/DetailedGrid';
import PnLScatterPlot from '@/components/charts/PnLScatterPlot';
import InsightsPanel from '@/components/ui/InsightsPanel';
import BackdropChart from '@/components/charts/BackdropChart';
import ConfidenceIndicator from '@/components/ui/ConfidenceIndicator';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

/* ───────────────────────────── Entry Points ──────────────────────────── */

function InsanityContent() {
  const searchParams = useSearchParams();
  const wallet = searchParams.get('wallet');
  if (!wallet) return <NoWalletPrompt />;
  return <InsanityInner address={wallet} />;
}

export default function InsanityPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <InsanityContent />
    </Suspense>
  );
}

/* ──────────────────────── No-Wallet Prompt ────────────────────────── */

function NoWalletPrompt() {
  const [input, setInput] = useState('');
  const isValid = /^0x[a-fA-F0-9]{40}$/.test(input.trim());

  return (
    <div className="min-h-screen bg-gunzscope">
      <Navbar />
      <div className="max-w-lg mx-auto py-20 px-4">
        <div
          className="relative bg-[var(--gs-dark-2)] border border-white/[0.06] p-6 overflow-hidden"
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />
          <h2 className="font-display text-xl font-bold text-[var(--gs-lime)] mb-1 tracking-wide">
            INSANITY MODE
          </h2>
          <p className="font-mono text-caption text-[var(--gs-gray-3)] mb-5">
            Enter a wallet address to view the full analysis dashboard.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (isValid) window.location.href = `/insanity?wallet=${input.trim()}`;
            }}
            className="flex gap-2 mb-4"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0x..."
              className="flex-1 bg-[var(--gs-dark-1)] border border-white/[0.08] px-3 py-2.5 font-mono text-sm text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/30 transition-colors"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            />
            <button
              type="submit"
              disabled={!isValid}
              className="px-4 py-2.5 bg-[var(--gs-lime)] text-black font-mono text-sm font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all cursor-pointer"
              style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
            >
              Analyze
            </button>
          </form>
          <Link
            href="/portfolio"
            className="font-mono text-sm text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
          >
            &larr; Back to Portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────── Main Insanity View ─────────────────────── */

function InsanityInner({ address }: { address: string }) {
  // ── State ──
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [gunPrice, setGunPrice] = useState<number | undefined>();
  const [gunPriceSparkline, setGunPriceSparkline] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [nftPagination, setNftPagination] = useState<NFTPaginationInfo>({
    totalOwnedCount: 0, fetchedCount: 0, pageSize: 50,
    pagesLoaded: 0, hasMore: false, isLoadingMore: false,
  });

  // ── Hooks ──
  const {
    progress: enrichmentProgress,
    startEnrichment,
    retryEnrichment,
  } = useNFTEnrichmentOrchestrator();
  const walletFetcher = useWalletDataFetcher();
  const { getServices } = walletFetcher;
  const marketplaceRef = useRef(new GameMarketplaceService());
  const openSeaRef = useRef(new OpenSeaService());

  // ── Derived data ──
  const portfolioResult = useMemo(() => {
    if (!walletData) return null;
    return calcPortfolio({ walletData, gunPrice, totalOwnedNftCount: nftPagination.totalOwnedCount });
  }, [walletData, gunPrice, nftPagination.totalOwnedCount]);

  const nfts = walletData?.avalanche.nfts ?? [];
  const data = usePortfolioSummaryData(portfolioResult, gunPrice, nfts, enrichmentProgress, address, gunPriceSparkline);
  const { displayValue: animatedTotal } = useCountUp({ end: data.totalValue, duration: 1500, decimals: 2, startOnMount: true });

  // ── Toggle states for DetailedGrid / Drawer ──
  const [holdingsExpanded, setHoldingsExpanded] = useState(false);
  const [performanceExpanded, setPerformanceExpanded] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  // ── Transition out of initializing ──
  useEffect(() => {
    if (!isInitializing || !portfolioResult || !gunPrice || gunPrice <= 0) return;
    if (portfolioResult.nftsWithPrice > 0 || portfolioResult.nftCount === 0) {
      setIsInitializing(false);
      return;
    }
    const id = setTimeout(() => setIsInitializing(false), 10000);
    return () => clearTimeout(id);
  }, [isInitializing, portfolioResult, gunPrice]);

  // ── Initial data fetch ──
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { avalanche: avalancheService, coinGecko: coinGeckoService } = getServices();
        const [priceData, walletResult] = await Promise.all([
          coinGeckoService.getGunTokenPrice(),
          walletFetcher.fetchSingleWallet(address),
        ]);

        if (cancelled) return;
        if (!walletResult) throw new Error('Failed to fetch wallet data');

        const { walletData: wd, nftResult } = walletResult;
        setWalletData(wd);
        setNftPagination({
          totalOwnedCount: nftResult.totalCount,
          fetchedCount: nftResult.fetchedCount,
          pageSize: 50, pagesLoaded: 1,
          hasMore: nftResult.hasMore,
          isLoadingMore: false,
        });

        const price = priceData?.gunTokenPrice;
        if (price) setGunPrice(price);
        if (priceData?.sparkline7d?.length) {
          setGunPriceSparkline(priceData.sparkline7d);
          // Bootstrap portfolio history on first visit for instant sparkline + changes
          if (price) {
            const gunBal = (wd.avalanche.gunToken?.balance ?? 0) + (wd.solana.gunToken?.balance ?? 0);
            const estValue = gunBal * price;
            if (estValue > 0) {
              bootstrapPortfolioHistory(address, estValue, priceData.sparkline7d, price);
            }
          }
        }
        setLoading(false);

        // Start background enrichment (reads from cache if portfolio was visited first)
        const mc = marketplaceRef.current;
        startEnrichment(
          wd.avalanche.nfts, address, avalancheService,
          mc.isConfigured() ? mc : null,
          (enrichedNFTs) => setWalletData(createEnrichmentUpdater(enrichedNFTs, address)),
        );

        // Fetch collection floor + rarity-tier floors in parallel, apply in ONE setWalletData
        const nftContract = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
        const floorP = openSeaRef.current.getNFTFloorPrice(nftContract, 'avalanche').catch(() => null);
        const rarityP = fetch('/api/opensea/rarity-floors')
          .then(r => r.ok ? r.json() : null)
          .catch(() => null) as Promise<{ floors: Record<string, number> } | null>;

        Promise.all([floorP, rarityP]).then(([collectionFloor, rarityData]) => {
          if (cancelled) return;
          const hasFloor = collectionFloor !== null && collectionFloor > 0;
          const rarityFloors = rarityData?.floors && Object.keys(rarityData.floors).length > 0
            ? rarityData.floors : null;
          if (!hasFloor && !rarityFloors) return;

          setWalletData(prev => {
            if (!prev) return prev;
            const nfts = prev.avalanche.nfts.map(nft => {
              if (nft.currentLowestListing && nft.currentLowestListing > 0) {
                return hasFloor ? { ...nft, floorPrice: nft.floorPrice ?? collectionFloor } : nft;
              }
              if (rarityFloors) {
                const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'];
                if (rarity) {
                  const tierFloor = rarityFloors[rarity];
                  if (tierFloor && tierFloor > 0) return { ...nft, floorPrice: tierFloor };
                }
              }
              if (hasFloor) return { ...nft, floorPrice: nft.floorPrice ?? collectionFloor };
              return nft;
            });
            return { ...prev, avalanche: { ...prev.avalanche, nfts } };
          });
        });
      } catch {
        if (!cancelled) {
          setError('Failed to load wallet data.');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // ── Auto-load remaining NFT pages ──
  const handleLoadMoreNFTs = useCallback(async () => {
    if (!walletData || nftPagination.isLoadingMore || !nftPagination.hasMore) return;
    setNftPagination(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const { avalanche: avalancheService } = getServices();
      const result = await avalancheService.getNFTsPaginated(
        walletData.address, nftPagination.fetchedCount, nftPagination.pageSize,
      );

      if (result.nfts.length > 0) {
        const mergedNFTs = mergeIntoGroups(walletData.avalanche.nfts, result.nfts);
        setWalletData(prev => prev ? { ...prev, avalanche: { ...prev.avalanche, nfts: mergedNFTs } } : prev);
        setNftPagination(prev => ({
          ...prev,
          fetchedCount: prev.fetchedCount + result.nfts.length,
          pagesLoaded: prev.pagesLoaded + 1,
          hasMore: result.hasMore,
          isLoadingMore: false,
        }));

        // Enrich newly loaded NFTs
        const mc = marketplaceRef.current;
        const grouped = groupNFTsByMetadata(result.nfts);
        startEnrichment(
          grouped, walletData.address, avalancheService,
          mc.isConfigured() ? mc : null,
          (enrichedNFTs: NFT[]) => setWalletData(createEnrichmentUpdater(enrichedNFTs)),
        );
      } else {
        setNftPagination(prev => ({ ...prev, hasMore: false, isLoadingMore: false }));
      }
    } catch {
      setNftPagination(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [walletData, nftPagination, startEnrichment, getServices]);

  useEffect(() => {
    if (nftPagination.hasMore && !nftPagination.isLoadingMore && walletData) {
      handleLoadMoreNFTs();
    }
  }, [nftPagination.hasMore, nftPagination.isLoadingMore, walletData, handleLoadMoreNFTs]);

  // ── GUN sparkline overlay ──
  const gunSparklineValues = useMemo(() => {
    if (data.sparklineValues.length < 2 || data.totalValue <= 0) return [];
    const ratio = data.gunValue / data.totalValue;
    return data.sparklineValues.map(v => v * ratio);
  }, [data.sparklineValues, data.gunValue, data.totalValue]);

  const truncatedAddress = `${address.slice(0, 6)}\u2026${address.slice(-4)}`;

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen bg-gunzscope">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--gs-lime)]" />
          <p className="font-mono text-sm tracking-wide text-[var(--gs-gray-4)]">Loading insanity data&hellip;</p>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div className="min-h-screen bg-gunzscope">
        <Navbar />
        <div className="max-w-2xl mx-auto py-20 px-4">
          <div className="p-4 bg-[var(--gs-dark-2)] border border-[var(--gs-loss)]">
            <p className="text-[var(--gs-loss)] font-mono text-sm">{error}</p>
            <Link
              href="/portfolio"
              className="font-mono text-sm text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors mt-3 inline-block"
            >
              &larr; Back to Portfolio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!walletData) return null;

  // ── Main render ──
  return (
    <div className="min-h-screen bg-gunzscope">
      <Navbar />
      <div className="max-w-7xl mx-auto py-8 px-4">
        {/* Header bar */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href={`/portfolio?address=${address}`}
            className="font-mono text-caption text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
          >
            &larr; Portfolio
          </Link>
          <span className="text-white/10">|</span>
          <h1 className="font-display text-lg font-bold text-[var(--gs-lime)] tracking-wide">
            INSANITY MODE
          </h1>
          <span className="font-mono text-caption text-[var(--gs-gray-3)]">{truncatedAddress}</span>
        </div>

        {/* Main card */}
        <div
          className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden"
          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
        >
          {/* ─── Value Header ─── */}
          <div className="relative overflow-hidden">
            {data.sparklineValues.length >= 2 && !isInitializing && (
              <div className="absolute inset-0" aria-hidden="true">
                <BackdropChart
                  values={data.sparklineValues}
                  overlayValues={gunSparklineValues}
                  showOverlay={false}
                  spanDays={data.sparklineSpanDays}
                  height={120}
                />
              </div>
            )}
            <div className="relative z-10 p-6 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-mono text-caption tracking-widest uppercase text-[var(--gs-gray-4)]">
                      Total Portfolio Value
                    </p>
                    {portfolioResult?.confidence && (
                      <ConfidenceIndicator confidence={portfolioResult.confidence} isGathering={data.isEnriching} />
                    )}
                    {!isInitializing && portfolioResult?.confidence && (
                      <span className="font-mono text-micro tracking-wider text-[var(--gs-gray-3)] border border-white/[0.08] px-1.5 py-0.5 ml-1">
                        {portfolioResult.confidence.percentage}% data confidence
                      </span>
                    )}
                  </div>
                  {isInitializing ? (
                    <div className="space-y-2">
                      <span className="font-display text-4xl font-bold text-[var(--gs-gray-3)]">Calculating</span>
                      <div
                        className="h-[3px] w-48 bg-[var(--gs-dark-4)] overflow-hidden"
                        style={{ clipPath: 'polygon(0 0, calc(100% - 2px) 0, 100% 2px, 100% 100%, 2px 100%, 0 calc(100% - 2px))' }}
                      >
                        <div className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] animate-loading-bar" style={{ width: '40%' }} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="font-display text-4xl font-bold text-[var(--gs-white)]">${animatedTotal}</p>
                      <p className="font-mono text-caption text-[var(--gs-gray-3)] mt-1">
                        <span className="text-[var(--gs-lime)]">{data.gunHoldings.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span className="text-[var(--gs-gray-2)]"> GUN</span>
                        <span className="text-[var(--gs-gray-2)] mx-1.5">&middot;</span>
                        <span className="text-[var(--gs-purple)]">{data.nftCount.toLocaleString()}</span>
                        <span className="text-[var(--gs-gray-2)]"> NFTs</span>
                      </p>
                    </>
                  )}
                </div>

                {/* P&L Badge */}
                {data.totalPnLPct !== null && !isInitializing && (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 border ${
                      data.isProfit
                        ? 'bg-[var(--gs-profit)]/10 border-[var(--gs-profit)]/30 text-[var(--gs-profit)]'
                        : data.isLoss
                        ? 'bg-[var(--gs-loss)]/10 border-[var(--gs-loss)]/30 text-[var(--gs-loss)]'
                        : 'bg-white/5 border-white/10 text-[var(--gs-gray-4)]'
                    }`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  >
                    {data.isProfit && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {data.isLoss && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className="font-mono text-sm font-semibold">
                      {data.totalPnLPct >= 0 ? '+' : ''}{data.totalPnLPct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Breakdown Drawer ─── */}
          {!isInitializing && (
            <BreakdownDrawer
              isOpen={breakdownOpen}
              onToggle={() => setBreakdownOpen(prev => !prev)}
              gunValue={data.gunValue}
              gunHoldings={data.gunHoldings}
              gunPrice={gunPrice}
              nftFloorValueUsd={data.nftFloorValueUsd}
              totalGunSpent={data.totalGunSpent}
              nftPnL={data.nftPnL}
              isEnriching={data.isEnriching}
              enrichmentProgress={enrichmentProgress}
              progressPct={data.progressPct}
            />
          )}

          {/* ─── Detailed Grid (Holdings + Performance) ─── */}
          <DetailedGrid
            isInitializing={isInitializing}
            holdingsExpanded={holdingsExpanded}
            performanceExpanded={performanceExpanded}
            onToggleHoldings={() => setHoldingsExpanded(prev => !prev)}
            onTogglePerformance={() => setPerformanceExpanded(prev => !prev)}
            acquisitionBreakdown={data.acquisitionBreakdown}
            gunValue={data.gunValue}
            gunHoldings={data.gunHoldings}
            gunPrice={gunPrice}
            gunPct={data.gunPct}
            nftPct={data.nftPct}
            nftCount={data.nftCount}
            nftFloorValueUsd={data.nftFloorValueUsd}
            totalGunSpent={data.totalGunSpent}
            nftPnL={data.nftPnL}
            isEnriching={data.isEnriching}
            enrichmentProgress={enrichmentProgress}
            hasFailures={data.hasFailures}
            progressPct={data.progressPct}
            onRetryEnrichment={retryEnrichment}
          />

          {/* ─── P&L Scatter Plot ─── */}
          {!isInitializing && data.nftPnL.nftsWithCost > 0 && (
            <PnLScatterPlot nfts={nfts} gunPrice={gunPrice} />
          )}

          {/* ─── Insights Panel ─── */}
          {data.insights.length > 0 && !isInitializing && (
            <div className="border-t border-white/[0.06] px-6 py-3">
              <InsightsPanel insights={data.insights} />
            </div>
          )}
        </div>

        <Footer />
      </div>
    </div>
  );
}
