'use client';

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import PortfolioHeader from '@/components/header/PortfolioHeader';
const NFTGallery = dynamic(() => import('@/components/NFTGallery'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3 py-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 bg-white/[0.02] animate-pulse rounded" />
      ))}
    </div>
  ),
});
import { WalletData, NFTPaginationInfo, NFT } from '@/lib/types';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import type { NetworkInfo } from '@/lib/utils/networkDetector';
import { mergeIntoGroups } from '@/lib/utils/nftGrouping';
import Navbar from '@/components/Navbar';

const DebugPanel = dynamic(() => import('@/components/DebugPanel'), { ssr: false });
const AccountPanel = dynamic(() => import('@/components/AccountPanel'), { ssr: false });
import { calcPortfolio, PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { PortfolioProvider, PortfolioContextValue } from '@/lib/contexts/PortfolioContext';
import { SlidePanelProvider, SlidePanelLayout } from '@/lib/contexts/SlidePanelContext';
const PortfolioSummaryBar = dynamic(() => import('@/components/PortfolioSummaryBar'), {
  ssr: false,
  loading: () => (
    <div className="space-y-3">
      <div className="h-24 bg-white/[0.02] animate-pulse rounded" />
      <div className="h-48 bg-white/[0.02] animate-pulse rounded" />
    </div>
  ),
});
const Footer = dynamic(() => import('@/components/Footer'));
import ScrollToTopButton from '@/components/ui/ScrollToTopButton';
import Link from 'next/link';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { useNFTEnrichmentOrchestrator } from '@/lib/hooks/useNFTEnrichmentOrchestrator';
import { useWalletDataFetcher } from '@/lib/hooks/useWalletDataFetcher';
import { useAccountGate } from '@/lib/hooks/useAccountGate';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import UnlockBanner from '@/components/UnlockBanner';
import WalletRequiredGate from '@/components/WalletRequiredGate';
import { useStableEnrichmentUpdates } from '@/lib/hooks/useStableEnrichmentUpdates';
import { WalletAddressInput } from '@/components/ui/WalletAddressInput';
import { detectChain } from '@/lib/utils/detectChain';
import { bootstrapPortfolioHistory } from '@/lib/utils/portfolioHistory';
import { usePortfolioAutoLoad } from '@/lib/hooks/usePortfolioAutoLoad';
import { useReferralTracking } from '@/lib/hooks/useReferralTracking';
import { applyValuationTables, RarityFloorsData, ComparableSalesData } from '@/lib/portfolio/applyValuationTables';
import type { MarketReferencePriceData } from '@/lib/types';
import { usePortfolioCache } from '@/lib/hooks/usePortfolioCache';
import { seedLocalCacheFromNFTs, invalidateListingPrices, getCachedNFT } from '@/lib/utils/nftCache';
import { useLoadingMessages } from '@/lib/hooks/useLoadingMessages';
import { useChartMilestoneGating } from '@/lib/hooks/useChartMilestoneGating';
import { usePortfolioSnapshot } from '@/lib/hooks/usePortfolioSnapshot';
import { useWalletSearchActions } from '@/lib/hooks/useWalletSearchActions';

function PortfolioContent() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === '1';
  const addressParam = searchParams.get('address');
  const { user, primaryWallet } = useDynamicContext();

  // If a specific address is in the URL, allow read-only access without auth.
  // The address param is display-only — it never gets associated with any user account.
  if (addressParam) {
    return <PortfolioInner debugMode={debugMode} initialAddress={addressParam} />;
  }

  // Authenticated users (wallet OR email-only) get through.
  // Email-only users see an empty portfolio with a search bar to look up wallets.
  if (user) {
    return <PortfolioInner debugMode={debugMode} initialAddress={primaryWallet?.address ?? null} />;
  }

  // Anonymous — require login
  return (
    <WalletRequiredGate feature="Portfolio">
      <PortfolioInner debugMode={debugMode} initialAddress={null} />
    </WalletRequiredGate>
  );
}

export default function PortfolioClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PortfolioContent />
    </Suspense>
  );
}

// =============================================================================
// Enrichment Cache Merge
// =============================================================================

/** Enrichment fields to merge from localStorage cache onto fresh NFTs.
 *  Only these keys are carried over — fresh data wins for everything else. */
const ENRICHMENT_FIELDS = [
  'purchasePriceGun',
  'purchasePriceUsd',
  'purchasePriceUsdEstimated',
  'purchaseDate',
  'transferredFrom',
  'isFreeTransfer',
  'transferType',
  'acquisitionVenue',
  'acquisitionTxHash',
  'currentLowestListing',
  'currentHighestListing',
] as const;

/** Stale threshold for enrichment merge — entries older than 72h are dropped.
 *  Must match DEFAULT_TTL_SECONDS in nftCache.ts */
const ENRICHMENT_STALE_MS = 72 * 60 * 60 * 1000;

/**
 * Merge localStorage-cached enrichment fields into freshly fetched NFTs.
 * Prevents the "flash of zeros" between live fetch and enrichment re-hydration.
 */
function mergeEnrichmentFromCache(
  nfts: NFT[],
  walletAddress: string,
): { merged: NFT[]; mergedCount: number } {
  let mergedCount = 0;

  const merged = nfts.map(nft => {
    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
    const cached = getCachedNFT(walletAddress, primaryTokenId);
    if (!cached) return nft;

    // Only apply if cache entry has a timestamp and is < 72h old
    if (!cached.cachedAtIso) return nft;
    const age = Date.now() - new Date(cached.cachedAtIso).getTime();
    if (age > ENRICHMENT_STALE_MS) return nft;

    // Surgically copy only enrichment fields
    const patch: Record<string, unknown> = {};
    for (const field of ENRICHMENT_FIELDS) {
      const value = cached[field as keyof typeof cached];
      if (value !== undefined) {
        if (field === 'purchaseDate' && typeof value === 'string') {
          patch[field] = new Date(value);
        } else {
          patch[field] = value;
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      mergedCount++;
      return { ...nft, ...patch };
    }
    return nft;
  });

  return { merged, mergedCount };
}

// Hardcoded — we always target GunzChain mainnet
const NETWORK_INFO: NetworkInfo = {
  environment: 'mainnet',
  chainId: 43419,
  name: 'GunzChain Mainnet',
  explorerUrl: 'https://gunzscan.io',
};

function PortfolioInner({ debugMode, initialAddress }: { debugMode: boolean; initialAddress: string | null }) {
  // Per-wallet storage: all fetched wallets keyed by lowercase address
  const [walletMap, setWalletMap] = useState<Record<string, WalletData>>({});
  const [activeWalletAddress, setActiveWalletAddress] = useState<string | null>(null);

  // Derived: the currently displayed wallet
  const activeWalletData = useMemo(() => {
    if (!activeWalletAddress) return null;
    return walletMap[activeWalletAddress.toLowerCase()] ?? null;
  }, [walletMap, activeWalletAddress]);

  // Compatibility wrapper: useStableEnrichmentUpdates calls setWalletData(updater).
  // createEnrichmentUpdater already scopes by address, so applying to all entries is safe.
  const setWalletData = useCallback((updater: React.SetStateAction<WalletData | null>) => {
    setWalletMap(prev => {
      const newMap = { ...prev };
      let changed = false;
      for (const key of Object.keys(newMap)) {
        const result = typeof updater === 'function' ? updater(newMap[key]) : updater;
        if (result && result !== newMap[key]) {
          newMap[key] = result;
          changed = true;
        }
      }
      return changed ? newMap : prev;
    });
  }, []);
  const [gunPrice, setGunPrice] = useState<number | undefined>(undefined);
  const [gunPriceSparkline, setGunPriceSparkline] = useState<number[]>([]);
  const [loading, setLoading] = useState(!!initialAddress);
  const [error, setError] = useState<string | null>(null);
  const [searchAddress, setSearchAddress] = useState('');
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  // noWalletDetected, showFoundMessage — owned by usePortfolioAutoLoad below

  // Slide-down unlock banner state
  const [showUnlockBanner, setShowUnlockBanner] = useState(false);
  const unlockBannerRef = useRef<HTMLDivElement>(null);

  // NFT enrichment hook - handles background enrichment with caching and progress
  const {
    progress: enrichmentProgress,
    isEnriching: enrichingNFTs,
    startEnrichment,
    cancelEnrichment,
    retryEnrichment,
  } = useNFTEnrichmentOrchestrator();

  // Stable enrichment updates — debounces walletData updates to prevent UI flicker
  const { createUpdateCallback, flushPendingUpdates } = useStableEnrichmentUpdates({
    setWalletData,
  });

  // Flush pending debounced updates when enrichment completes
  useEffect(() => {
    if (!enrichingNFTs) flushPendingUpdates();
  }, [enrichingNFTs, flushPendingUpdates]);

  // Server-side portfolio cache — instant hydration for logged-in users
  const { loadCache, saveCache, cachedAt, loadedFromCache, setLoadedFromCache } = usePortfolioCache();

  // Wallet data fetcher hook - provides fetchSingleWallet and services
  const walletFetcher = useWalletDataFetcher();
  const { getServices } = walletFetcher;

  // Shared service instances (avoid re-creating per call)
  const marketplaceServiceRef = useRef(new GameMarketplaceService());






  // portfolioMergedRef: tracks whether late-arriving portfolio wallets have been merged.
  // Reset in handleWalletSubmit and handleWalletDisconnect.
  const portfolioMergedRef = useRef(false);

  // Race-condition guard: incremented at the start of each handleWalletSubmit call.
  // After every await, we check that this ref still matches the local snapshot —
  // if not, a newer wallet switch has started and we abandon stale results.
  const walletRequestIdRef = useRef(0);

  // Wallet hint dismissal — permanently hidden after visiting /account or manual dismiss
  // Start hidden to avoid SSR hydration mismatch, then check localStorage after mount
  const [walletHintDismissed, setWalletHintDismissed] = useState(true);
  useEffect(() => {
    if (localStorage.getItem('gs_wallet_hint_dismissed') !== '1') setWalletHintDismissed(false);
  }, []);

  // Account gate — first search free, then require wallet connection
  const { canSearch, isGated, incrementSearch, getLastSearchedAddress } = useAccountGate();
  const { setShowAuthFlow, primaryWallet } = useDynamicContext();

  // Referral funnel tracking — fires wallet_connected + portfolio_loaded events
  useReferralTracking({
    primaryWalletAddress: primaryWallet?.address,
    isPortfolioLoaded: !!activeWalletData && !loading,
  });

  // Get user profile for portfolio addresses (authenticated users only)
  const { profile, isConnected, isAuthenticated, addTrackedAddress, addPortfolioAddress, isInPortfolio } = useUserProfile();
  const portfolioAddresses = profile?.portfolioAddresses ?? [];

  // Wallet action handlers (watch / portfolio)
  const { isAddingWatchlist, isAddingPortfolio, handleAddToWatchlist, handleAddToPortfolio } =
    useWalletSearchActions(addTrackedAddress, addPortfolioAddress);

  // Computed values for wallet actions (identity bar)
  const viewedAddress = activeWalletData?.address ?? searchAddress;
  const isInWatchlist = profile?.trackedAddresses.some(
    t => t.address.toLowerCase() === viewedAddress.toLowerCase()
  ) ?? false;
  const addressInPortfolio = isInPortfolio(viewedAddress);
  const isAtPortfolioLimit = (profile?.portfolioAddresses?.length ?? 0) >= 5;

  // Late portfolio wallet loading: when portfolioAddresses arrive after the initial
  // single-wallet load, fetch missing wallets into walletMap (background, no UI change).
  useEffect(() => {
    if (portfolioMergedRef.current) return;
    if (!activeWalletData || loading) return;
    if (!isConnected || portfolioAddresses.length === 0) return;

    const loadedSet = new Set(Object.keys(walletMap));
    const missingAddresses = portfolioAddresses
      .map(p => p.address)
      .filter(a => !loadedSet.has(a.toLowerCase()));

    if (missingAddresses.length === 0) return;
    portfolioMergedRef.current = true;

    Promise.all(
      missingAddresses.map(addr => walletFetcher.fetchSingleWallet(addr))
    ).then(results => {
      const successful = results.filter(
        (r): r is NonNullable<typeof r> => r !== null
      );
      if (successful.length === 0) return;

      setWalletMap(prev => {
        const m = { ...prev };
        for (const r of successful) {
          m[r.walletData.address.toLowerCase()] = r.walletData;
        }
        return m;
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioAddresses, activeWalletData, loading, isConnected]);

  // Auto-save enriched portfolio to server cache when enrichment completes
  useEffect(() => {
    if (!enrichingNFTs && activeWalletData && isAuthenticated) {
      saveCache(activeWalletData.address, activeWalletData, gunPrice);
    }
  }, [enrichingNFTs]); // eslint-disable-line react-hooks/exhaustive-deps

  // NFT Pagination state
  const [nftPagination, setNftPagination] = useState<NFTPaginationInfo>({
    totalOwnedCount: 0,
    fetchedCount: 0,
    pageSize: 50,
    pagesLoaded: 0,
    hasMore: false,
    isLoadingMore: false,
  });

  // Track if initial portfolio data has loaded (for "Calculating..." state)
  // Once set to false, stays false until new wallet search
  const [isPortfolioInitializing, setIsPortfolioInitializing] = useState(true);

  // Single source of truth for portfolio calculations
  const portfolioResult: PortfolioCalcResult | null = useMemo(() => {
    if (!activeWalletData) return null;
    return calcPortfolio({
      walletData: activeWalletData,
      gunPrice,
      totalOwnedNftCount: nftPagination.totalOwnedCount,
    });
  }, [activeWalletData, gunPrice, nftPagination.totalOwnedCount]);

  // Scrambled loading text for wallet fetch + SDK init
  const { loadingText, sdkInitText } = useLoadingMessages();

  // Transition out of initializing state when we have valid NFT price data OR after timeout
  // This ensures "Calculating..." shows during enrichment, then transitions to values or "Unpriced"
  useEffect(() => {
    if (!isPortfolioInitializing) return;
    if (!portfolioResult || !gunPrice || gunPrice <= 0) return;

    // If we have NFT price data, transition immediately
    if (portfolioResult.nftsWithPrice > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Guarded one-time transition
      setIsPortfolioInitializing(false);
      return;
    }

    // If no NFTs, transition immediately (nothing to calculate)
    if (portfolioResult.nftCount === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Guarded one-time transition
      setIsPortfolioInitializing(false);
      return;
    }

    // Otherwise, wait for enrichment with a timeout (max 10 seconds)
    const timeoutId = setTimeout(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Timeout-based transition
      setIsPortfolioInitializing(false);
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [isPortfolioInitializing, portfolioResult, gunPrice]);

  // Record portfolio snapshot for site-wide NFT tracking (fires once per address)
  usePortfolioSnapshot(activeWalletData, portfolioResult, loading, enrichingNFTs, gunPrice);

  // Load more NFTs (pagination)
  const handleLoadMoreNFTs = useCallback(async () => {
    if (!activeWalletData || nftPagination.isLoadingMore || !nftPagination.hasMore) return;

    setNftPagination(prev => ({ ...prev, isLoadingMore: true }));

    try {
      // Get avalanche service from hook (reuses existing instance)
      const { avalanche: avalancheService } = getServices();
      const startIndex = nftPagination.fetchedCount;

      const result = await avalancheService.getNFTsPaginated(
        activeWalletData.address,
        startIndex,
        nftPagination.pageSize
      );

      if (result.nfts.length > 0) {
        // Merge new NFTs into existing groups (preserves enrichment data on existing groups,
        // absorbs matching NFTs into their group, groups unmatched among themselves)
        const mergedNFTs = mergeIntoGroups(activeWalletData.avalanche.nfts, result.nfts);

        // Update walletMap for the active wallet
        const activeKey = activeWalletData.address.toLowerCase();
        setWalletMap(prev => {
          const wd = prev[activeKey];
          if (!wd) return prev;
          return {
            ...prev,
            [activeKey]: {
              ...wd,
              avalanche: {
                ...wd.avalanche,
                nfts: mergedNFTs,
              },
            },
          };
        });

        // Update pagination state
        setNftPagination(prev => ({
          ...prev,
          fetchedCount: prev.fetchedCount + result.nfts.length,
          pagesLoaded: prev.pagesLoaded + 1,
          hasMore: result.hasMore,
          isLoadingMore: false,
        }));

        // Start background enrichment ONLY when all pages are loaded.
        // This prevents concurrent enrichment races and backward progress jumps.
        if (!result.hasMore) {
          const marketplaceConfigured = marketplaceServiceRef.current.isConfigured();
          startEnrichment(
            mergedNFTs,
            activeWalletData.address,
            avalancheService,
            marketplaceConfigured ? marketplaceServiceRef.current : null,
            createUpdateCallback(activeWalletData.address),
            connectedWallets
          );
        }
      } else {
        setNftPagination(prev => ({
          ...prev,
          hasMore: false,
          isLoadingMore: false,
        }));
      }
    } catch (error) {
      console.error('Error loading more NFTs:', error);
      setNftPagination(prev => ({ ...prev, isLoadingMore: false }));
    }
  }, [activeWalletData, nftPagination, startEnrichment, getServices]);

  // Auto-load all remaining NFT pages in the background for complete portfolio data
  useEffect(() => {
    if (nftPagination.hasMore && !nftPagination.isLoadingMore && activeWalletData) {
      handleLoadMoreNFTs();
    }
  }, [nftPagination.hasMore, nftPagination.isLoadingMore, activeWalletData, handleLoadMoreNFTs]);

  const handleWalletSubmit = async (address: string, _chain: 'avalanche' | 'solana') => {
    console.log('[PortfolioClient] handleWalletSubmit', {
      walletAddress: address,
      cachedStateFound: loadedFromCache,
      isAuthenticated,
      fetchingFresh: true,
    });

    // Increment request ID — any in-flight fetch from a previous call becomes stale
    const thisRequestId = ++walletRequestIdRef.current;

    // Cancel any ongoing enrichment
    cancelEnrichment();
    portfolioMergedRef.current = false;

    // Cache-first hydration for authenticated users — render cached portfolio instantly
    let hydratedFromCache = false;
    if (isAuthenticated && !loadedFromCache) {
      const cached = await loadCache(address);
      // Stale guard after async cache load
      if (walletRequestIdRef.current !== thisRequestId) return;
      if (cached) {
        // Sanitize server-cached NFTs: strip legacy $0.0776 fallback purchasePriceUsd values.
        // These were saved before purchasePriceUsdEstimated existed (field is undefined).
        // The enrichment backfill will recompute correct per-date historical USD prices.
        const sanitizedNfts = cached.walletData.avalanche.nfts.map(nft => {
          if (nft.purchasePriceUsd != null && nft.purchasePriceUsdEstimated !== false) {
            const { purchasePriceUsd, purchasePriceUsdEstimated, ...rest } = nft;
            return rest as typeof nft;
          }
          return nft;
        });
        const sanitizedWalletData = {
          ...cached.walletData,
          avalanche: { ...cached.walletData.avalanche, nfts: sanitizedNfts },
        };

        setWalletMap({ [address.toLowerCase()]: sanitizedWalletData });
        setActiveWalletAddress(address);
        if (cached.gunPrice) setGunPrice(cached.gunPrice);
        setIsPortfolioInitializing(false);
        setLoadedFromCache(true);
        hydratedFromCache = true;

        // Seed localStorage from server-cached enriched NFTs so the
        // enrichment orchestrator skips RPC re-scans for already-enriched items
        seedLocalCacheFromNFTs(address, cached.walletData.avalanche.nfts);

        console.log('[PortfolioClient] Cache hydrated from server', {
          nftCount: sanitizedNfts.length,
          enrichedCount: sanitizedNfts.filter(n => n.purchasePriceGun != null).length,
          savedAt: cached.savedAt ?? 'unknown',
        });

        // Continue to live fetch below — don't return
      }
    }

    // Reset portfolio states for new search (skip if cache already rendered)
    if (!hydratedFromCache) {
      setIsPortfolioInitializing(true);
    }

    setLoading(true);
    setError(null);

    try {
      // Get services from hook (reuses existing instances)
      const { avalanche: avalancheService, coinGecko: coinGeckoService } = getServices();
      const marketplaceService = marketplaceServiceRef.current;

      // Determine all addresses to fetch
      // Primary address is always included, plus any portfolio addresses if user is authenticated
      const addressesToFetch = [address];
      if (isConnected && portfolioAddresses.length > 0) {
        // Add portfolio addresses, avoiding duplicates
        const primaryLower = address.toLowerCase();
        const additionalAddresses = portfolioAddresses
          .map(p => p.address)
          .filter(a => a.toLowerCase() !== primaryLower);
        addressesToFetch.push(...additionalAddresses);
      }

      // Fetch price and wallet data in parallel
      // Network info is hardcoded (we know it's GunzChain mainnet)
      const [
        priceData,
        ...walletResults
      ] = await Promise.all([
        coinGeckoService.getGunTokenPrice(),
        ...addressesToFetch.map(addr => walletFetcher.fetchSingleWallet(addr)),
      ]);

      // Stale response guard — a newer wallet switch has started, discard these results
      if (walletRequestIdRef.current !== thisRequestId) return;

      // Filter out failed fetches
      const successfulResults = walletResults.filter(
        (r): r is NonNullable<typeof r> => r !== null
      );

      if (successfulResults.length === 0) {
        throw new Error('Failed to fetch any wallet data');
      }

      // Store each wallet separately in walletMap, merging cached enrichment
      // fields to prevent the "flash of zeros" between live fetch and enrichment.
      const newMap: Record<string, WalletData> = {};
      let totalMerged = 0;
      for (const r of successfulResults) {
        const addrKey = r.walletData.address.toLowerCase();
        const { merged, mergedCount } = mergeEnrichmentFromCache(
          r.walletData.avalanche.nfts,
          addrKey,
        );
        totalMerged += mergedCount;
        newMap[addrKey] = {
          ...r.walletData,
          avalanche: { ...r.walletData.avalanche, nfts: merged },
        };
      }
      console.log('[PortfolioClient] Live fetch complete — walletMap set with enrichment merge', {
        walletAddress: address,
        freshNftCount: newMap[address.toLowerCase()]?.avalanche?.nfts?.length ?? 0,
        enrichedFieldsMerged: totalMerged,
        enrichedFieldsLost: 0,
      });
      setWalletMap(newMap);
      setActiveWalletAddress(address);

      // Pagination for the primary (active) wallet only
      const primaryResult = successfulResults[0];
      setNftPagination({
        totalOwnedCount: primaryResult.nftResult.totalCount,
        fetchedCount: primaryResult.nftResult.fetchedCount,
        pageSize: 50,
        pagesLoaded: 1,
        hasMore: primaryResult.nftResult.hasMore,
        isLoadingMore: false,
      });

      const price = priceData?.gunTokenPrice;
      if (price) {
        setGunPrice(price);
      }
      if (priceData?.sparkline7d && priceData.sparkline7d.length > 0) {
        setGunPriceSparkline(priceData.sparkline7d);

        // Bootstrap portfolio history on first visit for this wallet
        // Seeds localStorage with synthetic points from GUN price sparkline
        // so that sparkline + 24h/7d changes render immediately
        if (price) {
          const activeWd = newMap[address.toLowerCase()];
          if (activeWd) {
            const gunBal = (activeWd.avalanche.gunToken?.balance ?? 0) + (activeWd.solana.gunToken?.balance ?? 0);
            const estValue = gunBal * price;
            if (estValue > 0) {
              // Prefer 14d sparkline for a wider initial chart; fall back to 7d
              const spark = priceData.sparkline14d?.length ? priceData.sparkline14d : priceData.sparkline7d;
              const days = priceData.sparkline14d?.length ? 14 : 7;
              bootstrapPortfolioHistory(address, estValue, spark, price, estValue, days);
            }
          }
        }
      }      setLoading(false);

      // Live data arrived — clear cache flag so UI shows fresh data
      if (loadedFromCache) setLoadedFromCache(false);

      // Persist address in URL so browser back-navigation preserves it
      const url = new URL(window.location.href);
      url.searchParams.set('address', address);
      window.history.replaceState({}, '', url.toString());

      // Persist to sessionStorage so clicking nav links recovers the last search
      sessionStorage.setItem('gs_last_search', address);

      // Track search for account gate (anonymous users only)
      // Shared link loads (arriving via ?address= URL param) don't count against the limit
      if (!isConnected && !isSharedLinkLoad.current) {
        incrementSearch(address);
      }
      isSharedLinkLoad.current = false;

      // Clear search input after successful load
      // This prevents the search bar from showing the wallet address and triggering the dropdown
      setSearchAddress('');

      // Start background enrichment ONLY when all NFT pages are loaded.
      // For wallets with >50 NFTs, enrichment is deferred until handleLoadMoreNFTs
      // fetches the final page — prevents concurrent enrichment races and backward
      // progress jumps.
      if (!primaryResult.nftResult.hasMore) {
        const marketplaceConfigured = marketplaceService.isConfigured();
        const activeWd = newMap[address.toLowerCase()];
        if (activeWd) {
          startEnrichment(
            activeWd.avalanche.nfts,
            address,
            avalancheService,
            marketplaceConfigured ? marketplaceService : null,
            createUpdateCallback(address),
            connectedWallets
          );
        }
      }

      // Fetch rarity floors + comparable sales + collection floor + market reference in parallel, then inject into NFTs
      const rarityPromise = fetch('/api/opensea/rarity-floors')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null) as Promise<RarityFloorsData | null>;
      const comparablePromise = fetch('/api/opensea/comparable-sales')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null) as Promise<ComparableSalesData | null>;
      const floorPromise = fetch('/api/opensea/floor?chain=avalanche&contract=0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271')
        .then(r => r.ok ? r.json() : null)
        .then(d => d?.floorPrice as number | null ?? null)
        .catch(() => null) as Promise<number | null>;
      const marketRefPromise = fetch('/api/market/reference-prices')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null) as Promise<MarketReferencePriceData | null>;

      Promise.all([rarityPromise, comparablePromise, floorPromise, marketRefPromise]).then(([rarityData, comparableData, collectionFloor, marketRef]) => {
        // Stale response guard — a newer wallet switch has started
        if (walletRequestIdRef.current !== thisRequestId) return;
        if (!rarityData && !comparableData && !collectionFloor && !marketRef) return;

        const addrKey = address.toLowerCase();
        setWalletMap(prev => {
          const wd = prev[addrKey];
          if (!wd) return prev;
          const enrichedNfts = applyValuationTables(wd.avalanche.nfts, rarityData, comparableData, collectionFloor, marketRef);
          if (enrichedNfts === wd.avalanche.nfts) return prev; // No changes
          return { ...prev, [addrKey]: { ...wd, avalanche: { ...wd.avalanche, nfts: enrichedNfts } } };
        });

      });

    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to fetch wallet data. Please check the address and try again.');
      setLoading(false);
    }
  };

  // Handle wallet search (gated after first free search)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress.trim() || !detectedChain) return;
    if (!canSearch) return;
    setNoWalletDetected(false);
    handleWalletSubmit(searchAddress.trim(), 'avalanche');
  };

  // Detect wallet address chain type
  const detectedChain = detectChain(searchAddress);

  // Handle CTA form submit — the "Analyze a Wallet" entry form is ungated
  const handleCtaSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress.trim() || !detectedChain) return;
    setNoWalletDetected(false);
    handleWalletSubmit(searchAddress.trim(), 'avalanche');
  };

  // Handle wallet connection from Dynamic
  const handleWalletConnect = (address: string) => {
    // Auto-save the last searched address as a tracked address
    const lastSearched = getLastSearchedAddress();
    if (lastSearched) {
      addTrackedAddress(lastSearched).catch(() => {
        // Non-critical — profile may not exist yet on first connect
      });
    }
    // Auto-load wallet data when user connects via Dynamic
    handleWalletSubmit(address, 'avalanche');
  };

  // Handle wallet disconnect
  const handleWalletDisconnect = () => {
    flushPendingUpdates();
    cancelEnrichment();
    portfolioMergedRef.current = false;
    setWalletMap({});
    setActiveWalletAddress(null);
    setGunPrice(undefined);
    setGunPriceSparkline([]);
    setError(null);
    setSearchAddress('');
    // Reset pagination
    setNftPagination({
      totalOwnedCount: 0,
      fetchedCount: 0,
      pageSize: 50,
      pagesLoaded: 0,
      hasMore: false,
      isLoadingMore: false,
    });
  };

  // Auto-load, disconnect detection, and SDK init — consolidated hook
  const {
    noWalletDetected, setNoWalletDetected,
    isSharedLinkLoad,
  } = usePortfolioAutoLoad({
    initialAddress,
    primaryWalletAddress: primaryWallet?.address,
    isAuthenticated,
    portfolioAddresses,
    walletData: activeWalletData,
    loading,
    onSubmit: (addr) => handleWalletSubmit(addr, 'avalanche'),
    onDisconnect: handleWalletDisconnect,
    onSetSearchAddress: setSearchAddress,
  });

  // Handle selecting a tracked address from account panel
  const handleTrackedAddressSelect = useCallback((address: string) => {
    setSearchAddress(address);
    handleWalletSubmit(address, 'avalanche');
  }, []);

  // Handle "Back to My Wallet" from wallet identity bar
  const handleBackToOwnWallet = useCallback(() => {
    if (primaryWallet?.address) {
      // If already in walletMap, switch instantly; else re-fetch
      const key = primaryWallet.address.toLowerCase();
      if (walletMap[key]) {
        handleWalletSwitch(primaryWallet.address);
      } else {
        handleWalletSubmit(primaryWallet.address, 'avalanche');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryWallet?.address, walletMap]);

  // Switch to a different wallet from walletMap (instant, no re-fetch)
  const handleWalletSwitch = useCallback((address: string) => {
    const key = address.toLowerCase();
    const wd = walletMap[key];
    if (!wd) return;

    cancelEnrichment();
    setActiveWalletAddress(address);

    // Update pagination for this wallet
    const nftCount = wd.avalanche.nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);
    setNftPagination({
      totalOwnedCount: nftCount,
      fetchedCount: nftCount,
      pageSize: 50,
      pagesLoaded: 1,
      hasMore: false,
      isLoadingMore: false,
    });

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('address', address);
    window.history.replaceState({}, '', url.toString());

    // Start enrichment for this wallet (cache makes already-done items instant)
    const { avalanche: avalancheService } = getServices();
    const marketplaceService = marketplaceServiceRef.current;
    const marketplaceConfigured = marketplaceService.isConfigured();
    startEnrichment(
      wd.avalanche.nfts,
      address,
      avalancheService,
      marketplaceConfigured ? marketplaceService : null,
      createUpdateCallback(address),
      connectedWallets
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletMap, cancelEnrichment, startEnrichment, getServices, createUpdateCallback]);


  // Close unlock banner on outside click
  useEffect(() => {
    if (!showUnlockBanner) return;
    function handleClick(e: MouseEvent) {
      if (unlockBannerRef.current && !unlockBannerRef.current.contains(e.target as Node)) {
        setShowUnlockBanner(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUnlockBanner]);


  // Memoize allNfts separately to stabilize the reference —
  // downstream hooks (PortfolioHeader) depend on this for useMemo/useEffect
  const allNfts = useMemo(
    () => activeWalletData
      ? [...activeWalletData.avalanche.nfts, ...activeWalletData.solana.nfts]
      : [],
    [activeWalletData?.avalanche.nfts, activeWalletData?.solana.nfts],
  );

  // Milestone-gated NFT array for charts — prevents flicker during per-batch enrichment
  const chartNfts = useChartMilestoneGating(allNfts, enrichingNFTs, enrichmentProgress);

  // All wallet addresses in walletMap (for switcher)
  const allWalletAddresses = useMemo(() => Object.values(walletMap).map(w => w.address), [walletMap]);

  // Connected wallets (lowercased) — for self-transfer vs gift classification
  const connectedWallets = useMemo(() => {
    const set = new Set<string>();
    if (primaryWallet?.address) set.add(primaryWallet.address.toLowerCase());
    for (const pa of portfolioAddresses) set.add(pa.address.toLowerCase());
    return Array.from(set);
  }, [primaryWallet?.address, portfolioAddresses]);

  // Manual refresh — clears localStorage cache and re-fetches from chain
  const handleRefresh = useCallback(() => {
    if (!activeWalletData?.address) return;
    invalidateListingPrices(activeWalletData.address);
    setLoadedFromCache(false);
    handleWalletSubmit(activeWalletData.address, 'avalanche');
  }, [activeWalletData?.address]); // eslint-disable-line react-hooks/exhaustive-deps

  const contextValue: PortfolioContextValue = useMemo(() => ({
    walletData: activeWalletData,
    address: activeWalletData?.address ?? null,
    gunPrice,
    networkInfo: NETWORK_INFO,
    walletType: 'unknown',
    portfolioResult,
    enrichmentProgress,
    isEnriching: enrichingNFTs,
    allNfts,
    connectedWallets,
    isLoading: loading,
    isInitializing: isPortfolioInitializing,
    error,
    // Wallet identity state + actions (eliminates 14-prop drilling)
    portfolioAddresses,
    activeWalletAddress,
    allWalletAddresses: allWalletAddresses,
    primaryWalletAddress: primaryWallet?.address ?? null,
    isAuthenticated,
    isInWatchlist,
    isInPortfolio: addressInPortfolio,
    isAtPortfolioLimit,
    isAddingWatchlist,
    isAddingPortfolio,
    onSwitchWallet: handleWalletSwitch,
    onBackToOwnWallet: handleBackToOwnWallet,
    onAddToWatchlist: handleAddToWatchlist,
    onAddToPortfolio: handleAddToPortfolio,
  }), [
    activeWalletData,
    gunPrice,
    portfolioResult,
    enrichmentProgress,
    enrichingNFTs,
    allNfts,
    connectedWallets,
    loading,
    isPortfolioInitializing,
    error,
    portfolioAddresses,
    activeWalletAddress,
    allWalletAddresses,
    primaryWallet?.address,
    isAuthenticated,
    isInWatchlist,
    addressInPortfolio,
    isAtPortfolioLimit,
    isAddingWatchlist,
    isAddingPortfolio,
    handleWalletSwitch,
    handleBackToOwnWallet,
    handleAddToWatchlist,
    handleAddToPortfolio,
  ]);

  return (
    <PortfolioProvider value={contextValue}>
    <SlidePanelProvider>
    <SlidePanelLayout className="min-h-screen bg-gunzscope">
      {/* Skip to main content link — visible only on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-[var(--gs-lime)] focus:text-black focus:font-mono focus:text-sm focus:font-semibold"
      >
        Skip to content
      </a>
      <Navbar onSwitchWallet={handleTrackedAddressSelect} />

      {/* Slide-down UnlockBanner — replaces inline banner when gated */}
      {isGated && (
        <div
          className="fixed top-16 left-0 right-0 z-40 overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: showUnlockBanner ? '400px' : '0px',
            opacity: showUnlockBanner ? 1 : 0,
          }}
        >
          <div ref={unlockBannerRef} className="px-4 sm:px-6 lg:px-8 pt-4 pb-2 max-w-4xl mx-auto">
            <UnlockBanner onConnect={() => { setShowAuthFlow(true); setShowUnlockBanner(false); }} />
          </div>
        </div>
      )}

      {/* Account Panel */}
      <AccountPanel
        isOpen={isAccountPanelOpen}
        onClose={() => setIsAccountPanelOpen(false)}
        onAddressSelect={handleTrackedAddressSelect}
      />

      {/* Transient state — waiting for wallet SDK or showing entry CTA */}
      {!activeWalletData && !loading && (
        noWalletDetected ? (
          <div className="max-w-lg mx-auto py-20 px-4">
            <div
              className="relative bg-[var(--gs-dark-2)] border border-white/[0.06] p-6 overflow-hidden"
              style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />
              <h2 className="font-display text-xl font-bold text-[var(--gs-white)] mb-1">Analyze a Wallet</h2>
              <p className="font-mono text-caption text-[var(--gs-gray-3)] mb-5">
                Enter a wallet address or connect your wallet to get started.
              </p>
              <form onSubmit={handleCtaSearch} className="flex gap-2 mb-4">
                <div className="flex-1">
                  <WalletAddressInput
                    value={searchAddress}
                    onChange={setSearchAddress}
                    className="px-3 py-2.5 text-sm bg-[var(--gs-dark-1)] placeholder:text-[var(--gs-gray-2)]"
                    badgeRight="right-3"
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                    showHint={false}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!searchAddress.trim() || !detectedChain}
                  className="px-4 py-2.5 bg-[var(--gs-lime)] text-black font-mono text-sm font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 transition-all cursor-pointer"
                  style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                >
                  Analyze
                </button>
              </form>
              {searchAddress.trim() && !detectedChain && (
                <p className="font-mono text-[10px] text-[var(--gs-gray-4)] -mt-2 mb-4">
                  Enter a valid GunzChain (0x...) or Solana address
                </p>
              )}
              <div className="flex items-center gap-3">
                <span className="font-mono text-micro text-[var(--gs-gray-2)] uppercase tracking-wider">or</span>
                <button
                  onClick={() => setShowAuthFlow(true)}
                  className="font-mono text-sm text-[var(--gs-lime)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
                >
                  Connect Wallet &rarr;
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gs-lime)]" />
            <p className="text-[var(--gs-gray-4)] font-mono text-sm">
              {sdkInitText}
            </p>
          </div>
        )
      )}

      {/* Error state */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-[var(--gs-dark-2)] border border-[var(--gs-loss)] rounded-lg">
          <p className="text-[var(--gs-loss)]">{error}</p>
        </div>
      )}

      {/* Loading state — spinner + scramble text */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--gs-lime)]" />
          <p className="font-mono text-sm tracking-wide text-[var(--gs-gray-4)]">
            {loadingText}
          </p>
        </div>
      )}

      {/* Portfolio View - shown when wallet is connected */}
      {activeWalletData && !loading && (
        <div id="main-content" className="max-w-7xl mx-auto py-8 px-4">
          {/* Search / Unlock section */}
          {isGated ? (
            <div className="mb-6">
              <button
                onClick={() => setShowUnlockBanner(prev => !prev)}
                className="group flex items-center gap-2.5 px-4 py-2.5 bg-[var(--gs-dark-2)] border border-white/[0.06] hover:border-[var(--gs-lime)]/30 transition-all duration-200 clip-corner-sm cursor-pointer"
              >
                <svg
                  className="size-4 text-[var(--gs-lime)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
                <span className="font-mono text-caption uppercase tracking-widest text-[var(--gs-gray-3)] group-hover:text-[var(--gs-lime)] transition-colors">
                  {showUnlockBanner ? 'Hide' : 'Create Account to Unlock Full Access'}
                </span>
                <svg
                  className={`w-3 h-3 text-[var(--gs-gray-3)] transition-transform duration-200 ${showUnlockBanner ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4 mb-6">
              <form onSubmit={handleSearch} className="flex-1 max-w-md">
                <WalletAddressInput
                  value={searchAddress}
                  onChange={setSearchAddress}
                  placeholder="Search another wallet..."
                  className={`pl-9 py-2 text-sm bg-[var(--gs-dark-2)] rounded-lg placeholder-[var(--gs-gray-3)] ${detectedChain ? 'pr-40' : 'pr-14'}`}
                  badgeRight="right-14"
                  badgePadding=""
                >
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gs-gray-3)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <button
                    type="submit"
                    disabled={!searchAddress.trim() || !detectedChain}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] text-xs font-medium rounded hover:bg-[var(--gs-lime)]/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Go
                  </button>
                </WalletAddressInput>
              </form>
            </div>
          )}

          {/* Portfolio Header - reads from PortfolioContext */}
          <PortfolioHeader />

          {/* Empty wallet state — 0 GUN, 0 NFTs, not still loading */}
          {allNfts.length === 0 && portfolioResult && portfolioResult.totalUsd === 0 && !enrichingNFTs && !loading && !isPortfolioInitializing ? (
            <div className="mt-8 text-center py-20">
              <div className="size-16 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-white/[0.06] flex items-center justify-center">
                <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
              </div>
              <h2 className="text-balance font-display text-2xl font-bold text-[var(--gs-white)] mb-3">
                Nothing Detected
              </h2>
              <p className="text-pretty text-[var(--gs-gray-4)] mb-10 max-w-md mx-auto font-body">
                This wallet has no GUN tokens or game items. Try searching a different wallet to explore a portfolio.
              </p>

              {/* Inline search bar */}
              <form
                onSubmit={handleSearch}
                className="max-w-md mx-auto mb-8"
              >
                <WalletAddressInput
                  value={searchAddress}
                  onChange={setSearchAddress}
                  placeholder="Enter a GunzChain or Solana address..."
                  className={`pl-10 py-3 text-sm bg-[var(--gs-dark-2)] rounded-lg placeholder-[var(--gs-gray-3)] ${detectedChain ? 'pr-40' : 'pr-16'}`}
                  badgeRight="right-16"
                  badgePadding=""
                >
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gs-gray-3)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <button
                    type="submit"
                    disabled={!searchAddress.trim() || !detectedChain}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] text-xs font-medium rounded hover:bg-[var(--gs-lime)]/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Search
                  </button>
                </WalletAddressInput>
              </form>

              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/leaderboard"
                  className="inline-block font-display font-semibold text-sm uppercase px-6 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner"
                >
                  View Leaderboard
                </Link>
                <Link
                  href="/market"
                  className="inline-block font-display font-semibold text-sm uppercase px-6 py-3 border border-white/[0.06] text-[var(--gs-gray-3)] hover:border-white/20 hover:text-[var(--gs-white)] transition-colors"
                >
                  Browse Market
                </Link>
              </div>
            </div>
          ) : (
          <div className="space-y-6 mt-4">
            {/* Portfolio Summary Bar */}
            <PortfolioSummaryBar
              portfolioResult={portfolioResult}
              gunPrice={gunPrice}
              gunPriceSparkline={gunPriceSparkline}
              nfts={allNfts}
              chartNfts={chartNfts}
              isInitializing={isPortfolioInitializing}
              enrichmentProgress={enrichmentProgress}
              onRetryEnrichment={retryEnrichment}
              walletAddress={activeWalletData.address}
              cachedAt={cachedAt}
              onRefresh={handleRefresh}
              isRefreshing={enrichingNFTs}
            />

            {/* Cross-sell: leaderboard */}
            {searchAddress && (
              <div className="flex items-center px-4 py-2 border border-white/[0.06] bg-[var(--gs-dark-2)]">
                <Link
                  href={`/leaderboard?address=${searchAddress}`}
                  className="font-mono text-[10px] tracking-wide text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
                >
                  See your rank on the Leaderboard {'\u2192'}
                </Link>
              </div>
            )}

            {/* Wallet hint — shown to connected users with < 2 portfolio wallets */}
            {isConnected && portfolioAddresses.length < 2 && !walletHintDismissed && (
              <div className="flex items-center justify-between px-4 py-2.5 border border-white/[0.06] bg-[var(--gs-dark-2)]">
                <p className="font-mono text-[10px] tracking-wide text-[var(--gs-gray-3)]">
                  Save up to 5 wallets for instant switching{' \u2192 '}
                  <Link href="/account" className="text-[var(--gs-lime)] hover:underline">
                    Manage Wallets
                  </Link>
                </p>
                <button
                  onClick={() => { setWalletHintDismissed(true); localStorage.setItem('gs_wallet_hint_dismissed', '1'); }}
                  className="text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer ml-4"
                  aria-label="Dismiss"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            <NFTGallery
              nfts={allNfts}
              chain="avalanche"
              walletAddress={activeWalletData.address}
              paginationInfo={nftPagination}
              onLoadMore={handleLoadMoreNFTs}
              isEnriching={enrichingNFTs}
              stickyOffset={64} // 64px navbar height
              currentGunPrice={gunPrice}
              isOwnPortfolio={connectedWallets.includes(activeWalletData.address.toLowerCase())}
            />
          </div>
          )}

          {/* Portfolio Footer */}
          <Footer />

          {/* Scroll to Top Button */}
          <ScrollToTopButton threshold={500} />
        </div>
      )}

      {/* Debug Panel - visible when ?debug=1 */}
      <DebugPanel
        portfolioResult={portfolioResult}
        walletAddress={activeWalletData?.address ?? null}
        gunPrice={gunPrice}
        isVisible={debugMode}
      />
    </SlidePanelLayout>
    </SlidePanelProvider>
    </PortfolioProvider>
  );
}
