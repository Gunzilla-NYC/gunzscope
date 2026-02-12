'use client';

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PortfolioHeader } from '@/components/header';
import NFTGallery from '@/components/NFTGallery';
import DebugPanel from '@/components/DebugPanel';
import { WalletData, NFTPaginationInfo } from '@/lib/types';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { OpenSeaService } from '@/lib/api/opensea';
import { NFT } from '@/lib/types';
import { NetworkDetector, NetworkInfo } from '@/lib/utils/networkDetector';
import { groupNFTsByMetadata, mergeIntoGroups } from '@/lib/utils/nftGrouping';
import Navbar from '@/components/Navbar';
import AccountPanel from '@/components/AccountPanel';
import { calcPortfolio, PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { PortfolioProvider, PortfolioContextValue } from '@/lib/contexts/PortfolioContext';
import PortfolioSummaryBar, { PortfolioViewMode } from '@/components/PortfolioSummaryBar';
import Footer from '@/components/Footer';
import ScrollToTopButton from '@/components/ui/ScrollToTopButton';
import Link from 'next/link';
import { toast } from 'sonner';
import WalletSearchDropdown from '@/components/WalletSearchDropdown';
import { useUserProfile } from '@/lib/hooks/useUserProfile';
import { mergeWalletData, useWalletAggregation } from '@/lib/hooks/useWalletAggregation';
import { useNFTEnrichmentOrchestrator } from '@/lib/hooks/useNFTEnrichmentOrchestrator';
import { useWalletDataFetcher } from '@/lib/hooks/useWalletDataFetcher';
import { useAccountGate } from '@/lib/hooks/useAccountGate';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import UnlockBanner from '@/components/UnlockBanner';
import { createEnrichmentUpdater } from '@/lib/utils/mergeEnrichedNFTs';
import { usePortfolioAutoLoad } from '@/lib/hooks/usePortfolioAutoLoad';

function PortfolioContent() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === '1';
  const addressParam = searchParams.get('address');

  return <PortfolioInner debugMode={debugMode} initialAddress={addressParam} />;
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PortfolioContent />
    </Suspense>
  );
}

function PortfolioInner({ debugMode, initialAddress }: { debugMode: boolean; initialAddress: string | null }) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [gunPrice, setGunPrice] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [walletType, setWalletType] = useState<'in-game' | 'external' | 'unknown'>('unknown');
  const [searchAddress, setSearchAddress] = useState('');
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<PortfolioViewMode>('simple');
  // noWalletDetected, sdkInitPhase, showFoundMessage — owned by usePortfolioAutoLoad below

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

  // Wallet data fetcher hook - provides fetchSingleWallet and services
  const walletFetcher = useWalletDataFetcher();

  // Shared service instances (avoid re-creating per call)
  const marketplaceServiceRef = useRef(new GameMarketplaceService());
  const openSeaServiceRef = useRef(new OpenSeaService());

  // Portfolio aggregation state
  const [aggregatedAddresses, setAggregatedAddresses] = useState<string[]>([]);

  // Separate storage for primary and portfolio wallets (for useWalletAggregation hook)
  const [primaryWalletData, setPrimaryWalletData] = useState<WalletData | null>(null);
  const [portfolioWalletsData, setPortfolioWalletsData] = useState<WalletData[]>([]);

  // Compute aggregated wallet using hook (will replace inline mergeWalletData)
  const aggregatedWalletFromHook = useWalletAggregation(
    primaryWalletData,
    portfolioWalletsData,
    { includePortfolio: portfolioWalletsData.length > 0 }
  );

  // Wallet search dropdown state
  const [isAddingWatchlist, setIsAddingWatchlist] = useState(false);
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);

  // Wallet hint dismissal
  const [walletHintDismissed, setWalletHintDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem('gs_wallet_hint_dismissed') === '1';
  });

  // Account gate — first search free, then require wallet connection
  const { canSearch, isGated, incrementSearch, getLastSearchedAddress } = useAccountGate();
  const { setShowAuthFlow, primaryWallet } = useDynamicContext();

  // Get user profile for portfolio addresses (authenticated users only)
  const { profile, isConnected, isAuthenticated, addTrackedAddress, addPortfolioAddress, isInPortfolio } = useUserProfile();
  const portfolioAddresses = profile?.portfolioAddresses ?? [];

  // Computed values for dropdown
  const isInWatchlist = profile?.trackedAddresses.some(
    t => t.address.toLowerCase() === searchAddress.toLowerCase()
  ) ?? false;
  const addressInPortfolio = isInPortfolio(searchAddress);
  const isAtPortfolioLimit = (profile?.portfolioAddresses?.length ?? 0) >= 5;

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
    if (!walletData) return null;
    return calcPortfolio({
      walletData,
      gunPrice,
      totalOwnedNftCount: nftPagination.totalOwnedCount,
    });
  }, [walletData, gunPrice, nftPagination.totalOwnedCount]);

  // Phased loading messages — auto-advance while loading
  const LOADING_MESSAGES = ['Connecting to GunzChain\u2026', 'Fetching wallet data\u2026', 'Loading NFT collection\u2026'];
  useEffect(() => {
    if (!loading) { setLoadingPhase(0); return; }
    const t1 = setTimeout(() => setLoadingPhase(1), 1500);
    const t2 = setTimeout(() => setLoadingPhase(2), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [loading]);

  // SDK init loading messages — displayed while waiting for wallet SDK to resolve
  const SDK_INIT_MESSAGES = [
    'I swear if this takes one more second to load...',
    'I will lose my fucking mind...',
  ];

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

  // Track last snapshotted address to avoid duplicate API calls
  const lastSnapshotAddressRef = useRef<string | null>(null);

  // Record portfolio snapshot for site-wide NFT tracking
  // Fires once per wallet address when portfolio data is stable
  useEffect(() => {
    if (!walletData || !portfolioResult) return;
    if (loading || enrichingNFTs) return; // Wait for data to stabilize
    if (lastSnapshotAddressRef.current === walletData.address) return; // Already recorded

    // Only record if we have some NFTs to track
    if (portfolioResult.nftCount === 0) return;

    lastSnapshotAddressRef.current = walletData.address;

    // Calculate current NFT value based on floor prices
    const allNFTs = [...walletData.avalanche.nfts, ...walletData.solana.nfts];
    const nftValueGun = allNFTs.reduce((sum, nft) => {
      const quantity = nft.quantity ?? 1;
      const floorPrice = nft.floorPrice ?? 0;
      return sum + (floorPrice * quantity);
    }, 0);

    // Fire and forget - don't block UI
    fetch('/api/portfolio/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletData.address,
        chain: 'avalanche', // Primary chain for this portfolio
        nftCount: portfolioResult.nftCount,
        nftsWithPrice: portfolioResult.nftsWithPrice,
        gunBalance: portfolioResult.totalGunBalance,
        totalGunSpent: portfolioResult.totalGunSpent,
        gunPriceUsd: gunPrice || 0,
        nftValueGun,
      }),
    }).catch((err) => {
      // Non-critical - just log
      console.warn('[Snapshot] Failed to record portfolio snapshot:', err);
    });
  }, [walletData, portfolioResult, loading, enrichingNFTs, gunPrice]);

  // Load more NFTs (pagination)
  const handleLoadMoreNFTs = useCallback(async () => {
    if (!walletData || nftPagination.isLoadingMore || !nftPagination.hasMore) return;

    setNftPagination(prev => ({ ...prev, isLoadingMore: true }));

    try {
      // Get avalanche service from hook (reuses existing instance)
      const { avalanche: avalancheService } = walletFetcher.getServices();
      const startIndex = nftPagination.fetchedCount;

      const result = await avalancheService.getNFTsPaginated(
        walletData.address,
        startIndex,
        nftPagination.pageSize
      );

      if (result.nfts.length > 0) {
        // Merge new NFTs into existing groups (preserves enrichment data on existing groups,
        // absorbs matching NFTs into their group, groups unmatched among themselves)
        const mergedNFTs = mergeIntoGroups(walletData.avalanche.nfts, result.nfts);

        // Update wallet data with merged NFTs
        setWalletData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            avalanche: {
              ...prev.avalanche,
              nfts: mergedNFTs,
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

        // Start background enrichment for new NFTs using hook
        const marketplaceConfigured = marketplaceServiceRef.current.isConfigured();
        const groupedNewNFTs = groupNFTsByMetadata(result.nfts);

        startEnrichment(
          groupedNewNFTs,
          walletData.address,
          avalancheService,
          marketplaceConfigured ? marketplaceServiceRef.current : null,
          (enrichedNFTs: NFT[]) => {
            setWalletData(createEnrichmentUpdater(enrichedNFTs));
          }
        );
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
  }, [walletData, nftPagination, startEnrichment, walletFetcher]);

  // Auto-load all remaining NFT pages in the background for complete portfolio data
  useEffect(() => {
    if (nftPagination.hasMore && !nftPagination.isLoadingMore && walletData) {
      handleLoadMoreNFTs();
    }
  }, [nftPagination.hasMore, nftPagination.isLoadingMore, walletData, handleLoadMoreNFTs]);

  const handleWalletSubmit = async (address: string, _chain: 'avalanche' | 'solana') => {
    // Cancel any ongoing enrichment
    cancelEnrichment();

    // Reset portfolio states for new search
    setIsPortfolioInitializing(true);

    setLoading(true);
    setError(null);

    try {
      // Get services from hook (reuses existing instances)
      const { avalanche: avalancheService, coinGecko: coinGeckoService } = walletFetcher.getServices();
      const marketplaceService = marketplaceServiceRef.current;

      // Detect network and wallet type
      // Note: RPC URL is server-side only, client uses hardcoded fallback
      const rpcUrl = 'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';
      const networkDetector = new NetworkDetector(rpcUrl);

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

      // Fetch shared data (prices, network) plus all wallet data in parallel
      const [
        priceData,
        detectedNetworkInfo,
        detectedWalletType,
        ...walletResults
      ] = await Promise.all([
        coinGeckoService.getGunTokenPrice(),
        networkDetector.getNetworkInfo(),
        networkDetector.detectWalletType(address),
        ...addressesToFetch.map(addr => walletFetcher.fetchSingleWallet(addr)),
      ]);

      // Filter out failed fetches
      const successfulResults = walletResults.filter(
        (r): r is NonNullable<typeof r> => r !== null
      );

      if (successfulResults.length === 0) {
        throw new Error('Failed to fetch any wallet data');
      }

      // Merge wallet data if multiple addresses
      const walletDataArray = successfulResults.map(r => r.walletData);
      const mergedData = mergeWalletData(walletDataArray);

      // Populate separate state for hook-based aggregation
      // Primary wallet is the first result (the searched address)
      // Portfolio wallets are the rest
      setPrimaryWalletData(walletDataArray[0]);
      setPortfolioWalletsData(walletDataArray.slice(1));

      // Track which addresses were aggregated
      setAggregatedAddresses(successfulResults.map(r => r.walletData.address));

      // Calculate aggregated pagination info
      // For merged portfolios, sum up totals across all wallets
      const aggregatedTotalCount = successfulResults.reduce((sum, r) => sum + r.nftResult.totalCount, 0);
      const aggregatedFetchedCount = successfulResults.reduce((sum, r) => sum + r.nftResult.fetchedCount, 0);
      const anyHasMore = successfulResults.some(r => r.nftResult.hasMore);

      // Update pagination state with aggregated counts
      setNftPagination({
        totalOwnedCount: aggregatedTotalCount,
        fetchedCount: aggregatedFetchedCount,
        pageSize: 50,
        pagesLoaded: 1,
        hasMore: anyHasMore,
        isLoadingMore: false,
      });

      const price = priceData?.gunTokenPrice;
      if (price) {
        setGunPrice(price);
      }

      // Set network info and wallet type (from primary address)
      setNetworkInfo(detectedNetworkInfo);
      setWalletType(detectedWalletType);

      setWalletData(mergedData);
      setLoading(false);

      // Track search for account gate (anonymous users only)
      // Shared link loads (arriving via ?address= URL param) don't count against the limit
      if (!isConnected && !isSharedLinkLoad.current) {
        incrementSearch(address);
      }
      isSharedLinkLoad.current = false;

      // Clear search input after successful load
      // This prevents the search bar from showing the wallet address and triggering the dropdown
      setSearchAddress('');

      // Start background enrichment for all Avalanche NFTs using hook
      // Reuse existing marketplace service (will gracefully handle unconfigured state)
      const marketplaceConfigured = marketplaceService.isConfigured();

      // For merged data, enrich all NFTs but update the merged state
      // Note: priority ordering and progress tracking are handled internally by the hook
      startEnrichment(
        mergedData.avalanche.nfts,
        address, // Use primary address for cache keys
        avalancheService,
        marketplaceConfigured ? marketplaceService : null,
        (enrichedNFTs) => {
          setWalletData(createEnrichmentUpdater(enrichedNFTs, address));
        }
      );

      // Fetch collection floor price in background and apply to all NFTs
      // This enables Value/P&L sorting in the gallery
      const nftContractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
      if (nftContractAddress) {
        openSeaServiceRef.current.getNFTFloorPrice(nftContractAddress, 'avalanche')
          .then(floorPrice => {
            if (floorPrice !== null && floorPrice > 0) {
              setWalletData(prev => {
                if (!prev || prev.address !== address) return prev;
                // Apply collection floor price to all NFTs that don't already have one
                const nftsWithFloor = prev.avalanche.nfts.map(nft => ({
                  ...nft,
                  floorPrice: nft.floorPrice ?? floorPrice,
                }));
                return {
                  ...prev,
                  avalanche: {
                    ...prev.avalanche,
                    nfts: nftsWithFloor,
                  },
                };
              });
              if (process.env.NODE_ENV === 'development') {
                console.log(`[Floor Price] Applied collection floor: ${floorPrice} GUN`);
              }
            }
          })
          .catch(err => {
            // Non-critical - portfolio still works without floor price
            console.warn('[Floor Price] Failed to fetch from OpenSea:', err);
          });
      }

    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError('Failed to fetch wallet data. Please check the address and try again.');
      setLoading(false);
    }
  };

  // Handle wallet search (gated after first free search)
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchAddress.trim()) return;
    if (!canSearch) return;
    setNoWalletDetected(false);
    handleWalletSubmit(searchAddress.trim(), 'avalanche');
  };

  // Detect wallet address chain type
  const detectChain = (addr: string): 'gunzchain' | 'solana' | null => {
    const trimmed = addr.trim();
    if (/^0x[a-fA-F0-9]{40}$/.test(trimmed)) return 'gunzchain';
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return 'solana';
    return null;
  };

  const detectedChain = searchAddress.trim() ? detectChain(searchAddress) : null;

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
    cancelEnrichment();
    setWalletData(null);
    setNetworkInfo(null);
    setWalletType('unknown');
    setGunPrice(undefined);
    setError(null);
    setSearchAddress('');
    setAggregatedAddresses([]);
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

  // Auto-load, disconnect detection, SDK init, and "found it" message — consolidated hook
  const {
    noWalletDetected, setNoWalletDetected,
    showFoundMessage, sdkInitPhase, isSharedLinkLoad,
  } = usePortfolioAutoLoad({
    initialAddress,
    primaryWalletAddress: primaryWallet?.address,
    isAuthenticated,
    portfolioAddresses,
    walletData,
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
      handleWalletSubmit(primaryWallet.address, 'avalanche');
    }
  }, [primaryWallet?.address]);

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

  // Wallet search dropdown handlers
  const handleAddToWatchlist = async (address: string) => {
    setIsAddingWatchlist(true);
    try {
      const result = await addTrackedAddress(address);
      if (result) {
        toast.success('Added to watchlist');
        return true;
      } else {
        toast.error('Failed to add to watchlist');
        return false;
      }
    } catch {
      toast.error('Failed to add to watchlist');
      return false;
    } finally {
      setIsAddingWatchlist(false);
    }
  };

  const handleAddToPortfolio = async (address: string) => {
    setIsAddingPortfolio(true);
    try {
      const result = await addPortfolioAddress(address);
      if (result) {
        toast.success('Added to portfolio');
        return true;
      } else {
        toast.error('Failed to add to portfolio');
        return false;
      }
    } catch {
      toast.error('Failed to add to portfolio');
      return false;
    } finally {
      setIsAddingPortfolio(false);
    }
  };

  const handleDropdownNavigate = (address: string) => {
    handleWalletSubmit(address, 'avalanche');
  };

  // Build context value for PortfolioProvider
  // Use aggregatedWalletFromHook (computed by useWalletAggregation) with fallback to walletData
  const effectiveWalletData = aggregatedWalletFromHook ?? walletData;
  const contextValue: PortfolioContextValue = useMemo(() => ({
    walletData: effectiveWalletData,
    address: effectiveWalletData?.address ?? null,
    gunPrice,
    gunPriceChange24h: undefined, // TODO: Add when available
    gunPriceChangePercent24h: undefined, // TODO: Add when available
    networkInfo,
    walletType,
    portfolioResult,
    enrichmentProgress,
    isEnriching: enrichingNFTs,
    allNfts: effectiveWalletData
      ? [...effectiveWalletData.avalanche.nfts, ...effectiveWalletData.solana.nfts]
      : [],
    isLoading: loading,
    isInitializing: isPortfolioInitializing,
    error,
  }), [
    effectiveWalletData,
    gunPrice,
    networkInfo,
    walletType,
    portfolioResult,
    enrichmentProgress,
    enrichingNFTs,
    loading,
    isPortfolioInitializing,
    error,
  ]);

  return (
    <PortfolioProvider value={contextValue}>
    <div className="min-h-screen bg-gunzscope">
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
      {!walletData && !loading && (
        showFoundMessage ? (
          <div className="text-center py-24">
            <p className="text-[var(--gs-lime)] font-mono text-sm animate-pulse">
              thank my fucking limbs i found it
            </p>
          </div>
        ) : noWalletDetected ? (
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
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="0x... or Solana address"
                    className={`w-full bg-[var(--gs-dark-1)] border border-white/[0.08] px-3 py-2.5 font-mono text-sm text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/30 transition-colors ${detectedChain ? 'pr-24' : ''}`}
                    style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
                  />
                  {searchAddress.trim() && detectedChain && (
                    <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-mono text-caption uppercase tracking-wider px-2 py-0.5 rounded-sm ${
                      detectedChain === 'gunzchain'
                        ? 'bg-[var(--gs-profit)]/15 text-[var(--gs-profit)]'
                        : 'bg-[var(--gs-purple)]/15 text-[var(--gs-purple-bright)]'
                    }`}>
                      {detectedChain === 'gunzchain' ? 'GunzChain' : 'Solana'}
                    </span>
                  )}
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
          <div className="text-center py-24">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--gs-lime)]" />
            <p className="mt-4 text-[var(--gs-gray-4)] font-mono text-sm">
              {SDK_INIT_MESSAGES[sdkInitPhase]}
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

      {/* Loading state */}
      {loading && (
        <div className="text-center py-24">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gs-lime)]"></div>
          <p className="mt-4 text-[var(--gs-gray-4)]">{LOADING_MESSAGES[loadingPhase]}</p>
        </div>
      )}

      {/* Portfolio View - shown when wallet is connected */}
      {walletData && !loading && (
        <div className="max-w-7xl mx-auto py-8 px-4">
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
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gs-gray-3)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchAddress}
                    onChange={(e) => setSearchAddress(e.target.value)}
                    placeholder="Search another wallet..."
                    className="w-full pl-9 pr-20 py-2 text-sm bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg text-white placeholder-[var(--gs-gray-3)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!searchAddress.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] text-xs font-medium rounded hover:bg-[var(--gs-lime)]/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Go
                  </button>
                  {/* Wallet Search Dropdown */}
                  <WalletSearchDropdown
                    searchValue={searchAddress}
                    onNavigate={handleDropdownNavigate}
                    onAddToWatchlist={handleAddToWatchlist}
                    onAddToPortfolio={handleAddToPortfolio}
                    isInWatchlist={isInWatchlist}
                    isInPortfolio={addressInPortfolio}
                    isAddingWatchlist={isAddingWatchlist}
                    isAddingPortfolio={isAddingPortfolio}
                    isAtPortfolioLimit={isAtPortfolioLimit}
                  />
                </div>
              </form>
              {enrichingNFTs && (
                <div className="flex items-center gap-2 text-xs text-[var(--gs-gray-3)]">
                  <div className="w-3 h-3 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin"></div>
                  <span>Loading details...</span>
                </div>
              )}
            </div>
          )}

          {/* Portfolio Header - uses PortfolioContext */}
          <PortfolioHeader
            portfolioAddresses={portfolioAddresses}
            aggregatedAddresses={aggregatedAddresses}
            primaryWalletAddress={primaryWallet?.address ?? null}
            isAuthenticated={isAuthenticated}
            onSwitchWallet={handleTrackedAddressSelect}
            onBackToOwnWallet={handleBackToOwnWallet}
          />

          <div className="space-y-6 mt-4">
            {/* Portfolio Summary Bar */}
            <PortfolioSummaryBar
              portfolioResult={portfolioResult}
              gunPrice={gunPrice}
              nfts={walletData.avalanche.nfts}
              isInitializing={isPortfolioInitializing}
              enrichmentProgress={enrichmentProgress}
              onRetryEnrichment={retryEnrichment}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              walletAddress={walletData.address}
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
                  Track up to 5 wallets in one view{' \u2192 '}
                  <Link href="/account" className="text-[var(--gs-lime)] hover:underline">
                    Manage Wallets
                  </Link>
                </p>
                <button
                  onClick={() => { setWalletHintDismissed(true); sessionStorage.setItem('gs_wallet_hint_dismissed', '1'); }}
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
              nfts={walletData.avalanche.nfts}
              chain="avalanche"
              walletAddress={walletData.address}
              paginationInfo={nftPagination}
              onLoadMore={handleLoadMoreNFTs}
              isEnriching={enrichingNFTs}
              stickyOffset={64} // 64px navbar height
            />
          </div>

          {/* Portfolio Footer */}
          <Footer />

          {/* Scroll to Top Button */}
          <ScrollToTopButton threshold={500} />
        </div>
      )}

      {/* Debug Panel - visible when ?debug=1 */}
      <DebugPanel
        portfolioResult={portfolioResult}
        walletAddress={walletData?.address ?? null}
        gunPrice={gunPrice}
        isVisible={debugMode}
      />
    </div>
    </PortfolioProvider>
  );
}
