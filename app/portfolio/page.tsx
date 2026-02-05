'use client';

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PortfolioHeader } from '@/components/header';
import NFTGallery from '@/components/NFTGallery';
import DebugPanel from '@/components/DebugPanel';
import { WalletData, NFTPaginationInfo, EnrichmentProgress } from '@/lib/types';
import { AvalancheService } from '@/lib/blockchain/avalanche';
import { SolanaService } from '@/lib/blockchain/solana';
import { CoinGeckoService } from '@/lib/api/coingecko';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { OpenSeaService } from '@/lib/api/opensea';
import { NFT } from '@/lib/types';
import { NetworkDetector, NetworkInfo } from '@/lib/utils/networkDetector';
import { groupNFTsByMetadata } from '@/lib/utils/nftGrouping';
import { getCachedNFT, setCachedNFT, needsReEnrichment, buildTokenKey } from '@/lib/utils/nftCache';
import Navbar from '@/components/Navbar';
import AccountPanel from '@/components/AccountPanel';
import { calcPortfolio, PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { PortfolioProvider, PortfolioContextValue } from '@/lib/contexts/PortfolioContext';
import PortfolioSummaryBar from '@/components/PortfolioSummaryBar';
import Footer from '@/components/Footer';
import ScrollToTopButton from '@/components/ui/ScrollToTopButton';
import Link from 'next/link';
import { toast } from 'sonner';
import WalletSearchDropdown from '@/components/WalletSearchDropdown';
import { useUserProfile } from '@/lib/hooks/useUserProfile';

// Wrapper component to provide Suspense boundary for useSearchParams
function PortfolioContent() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === '1';

  return <PortfolioInner debugMode={debugMode} />;
}

// Main export wrapped in Suspense
export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <PortfolioContent />
    </Suspense>
  );
}

// Batch size for parallel NFT enrichment
// Reduced to 3 to avoid RPC rate limiting (429 errors)
const ENRICHMENT_BATCH_SIZE = 3;
// Delay between batches in ms to avoid rate limiting
const ENRICHMENT_BATCH_DELAY_MS = 1500;
// Number of NFTs to prioritize for above-the-fold display
const PRIORITY_ABOVE_FOLD_COUNT = 12;

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Merge multiple WalletData objects into a single aggregated view.
 * Used when user has portfolio addresses configured.
 *
 * - GUN Balance: Sum all gunBalance values across wallets
 * - NFT List: Concatenate all NFT arrays from all wallets
 * - Address: Uses the primary (first) address for display
 */
const mergeWalletData = (wallets: WalletData[]): WalletData => {
  if (wallets.length === 0) {
    throw new Error('No wallet data to merge');
  }
  if (wallets.length === 1) {
    return wallets[0];
  }

  // Sum GUN balances across chains
  const avalancheGunBalance = wallets.reduce((sum, w) => {
    return sum + (w.avalanche.gunToken?.balance ?? 0);
  }, 0);

  const solanaGunBalance = wallets.reduce((sum, w) => {
    return sum + (w.solana.gunToken?.balance ?? 0);
  }, 0);

  // Concatenate all NFTs (no deduplication - each wallet may have different NFTs)
  const allAvalancheNFTs = wallets.flatMap(w => w.avalanche.nfts);
  const allSolanaNFTs = wallets.flatMap(w => w.solana.nfts);

  // Use first wallet's token metadata as template
  const firstAvalancheToken = wallets.find(w => w.avalanche.gunToken)?.avalanche.gunToken;
  const firstSolanaToken = wallets.find(w => w.solana.gunToken)?.solana.gunToken;

  return {
    address: wallets[0].address, // Primary address for display
    avalanche: {
      gunToken: firstAvalancheToken ? {
        ...firstAvalancheToken,
        balance: avalancheGunBalance,
      } : null,
      nfts: allAvalancheNFTs,
    },
    solana: {
      gunToken: firstSolanaToken ? {
        ...firstSolanaToken,
        balance: solanaGunBalance,
      } : null,
      nfts: allSolanaNFTs,
    },
    totalValue: 0, // Calculated via calcPortfolio
    lastUpdated: new Date(),
  };
};

function PortfolioInner({ debugMode }: { debugMode: boolean }) {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [gunPrice, setGunPrice] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [walletType, setWalletType] = useState<'in-game' | 'external' | 'unknown'>('unknown');
  const [searchAddress, setSearchAddress] = useState('');
  const [enrichingNFTs, setEnrichingNFTs] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress | null>(null);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);

  // Portfolio aggregation state
  const [aggregatedAddresses, setAggregatedAddresses] = useState<string[]>([]);

  // Wallet search dropdown state
  const [isAddingWatchlist, setIsAddingWatchlist] = useState(false);
  const [isAddingPortfolio, setIsAddingPortfolio] = useState(false);

  // Get user profile for portfolio addresses (authenticated users only)
  const { profile, isConnected, addTrackedAddress, addPortfolioAddress, isInPortfolio } = useUserProfile();
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

  // Ref to track if enrichment should be cancelled
  const enrichmentCancelledRef = useRef(false);

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

  // Helper to add timeout to promises
  const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T | null> => {
    return Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
    ]);
  };

  // Enrich a single NFT with caching
  // IMPORTANT: Only caches when acquisition data is meaningful to prevent blocking future enrichment
  const enrichSingleNFT = async (
    nft: NFT,
    walletAddress: string,
    nftContractAddress: string,
    avalancheService: AvalancheService,
    marketplaceService: GameMarketplaceService | null
  ): Promise<NFT> => {
    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;

    // Check cache - but only use it if acquisition is complete
    const cached = getCachedNFT(walletAddress, primaryTokenId);
    if (cached && cached.hasAcquisition === true) {
      // Complete cache entry - use it
      // For grouped NFTs, prefer tokenIds.length over cache if cache has 1 but NFT is grouped
      const groupedQuantity = nft.tokenIds && nft.tokenIds.length > 1 ? nft.tokenIds.length : undefined;
      return {
        ...nft,
        quantity: groupedQuantity ?? cached.quantity ?? nft.quantity ?? 1,
        purchasePriceGun: cached.purchasePriceGun,
        purchaseDate: cached.purchaseDate ? new Date(cached.purchaseDate) : undefined,
        transferredFrom: cached.transferredFrom,
        isFreeTransfer: cached.isFreeTransfer,
        acquisitionVenue: cached.acquisitionVenue,
        acquisitionTxHash: cached.acquisitionTxHash,
      };
    }

    // If cache exists but is incomplete, we still have quantity - use it as baseline
    const cachedQuantity = cached?.quantity;

    try {
      // Fetch quantity and acquisition details in parallel
      const [quantity, acquisition] = await Promise.all([
        // For non-grouped NFTs, fetch quantity (ERC-1155 check)
        // Skip if we already have cached quantity
        cachedQuantity !== undefined
          ? Promise.resolve(cachedQuantity)
          : nft.tokenIds && nft.tokenIds.length > 1
            ? Promise.resolve(nft.quantity || nft.tokenIds.length)
            : withTimeout(
                avalancheService.detectNFTQuantity(nftContractAddress, nft.tokenId, walletAddress),
                3000
              ),
        // Fetch acquisition details (current holding)
        // Timeout increased to 45s because blockchain RPC scans 13M+ blocks and can be very slow
        withTimeout(
          avalancheService.getNFTHoldingAcquisition(nftContractAddress, primaryTokenId, walletAddress),
          45000
        ),
      ]);

      // =========================================================================
      // MARKETPLACE PRICE LOOKUP
      // If acquisition shows a marketplace venue, query for the purchase price
      // =========================================================================
      let marketplacePriceGun: number | undefined;
      let marketplacePurchaseDate: Date | undefined;

      const isMarketplaceVenue = acquisition?.venue && [
        'opensea',
        'in_game_marketplace',
        'otg_marketplace',
      ].includes(acquisition.venue);

      if (marketplaceService && isMarketplaceVenue && acquisition?.acquiredAtIso) {
        try {
          const acquiredAt = new Date(acquisition.acquiredAtIso);
          // Query purchases within ±24 hours of blockchain acquisition
          const purchases = await withTimeout(
            marketplaceService.getPurchasesForWallet(walletAddress, {
              fromDate: new Date(acquiredAt.getTime() - 24 * 60 * 60 * 1000),
              toDate: new Date(acquiredAt.getTime() + 24 * 60 * 60 * 1000),
              limit: 20,
            }),
            5000 // 5 second timeout
          );

          if (purchases && purchases.length > 0) {
            // Find purchase matching this NFT's tokenId
            const tokenId = nft.tokenIds?.[0] || nft.tokenId;
            const matchingPurchases = purchases.filter(p => {
              // tokenKey format: chain:contract:tokenId
              const parts = p.tokenKey.split(':');
              return parts[2] === tokenId;
            });

            if (matchingPurchases.length > 0) {
              // Find closest timestamp match
              const matchedPurchase = matchingPurchases.reduce((closest, p) => {
                const closestDiff = Math.abs(new Date(closest.purchaseDateIso).getTime() - acquiredAt.getTime());
                const pDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                return pDiff < closestDiff ? p : closest;
              });

              marketplacePriceGun = matchedPurchase.priceGun;
              marketplacePurchaseDate = new Date(matchedPurchase.purchaseDateIso);

              if (process.env.NODE_ENV === 'development') {
                console.log(`[NFT Enrichment] Marketplace match for ${tokenId}: ${marketplacePriceGun} GUN`);
              }
            }
          }
        } catch (marketplaceError) {
          // Non-blocking - continue with blockchain data only
          if (process.env.NODE_ENV === 'development') {
            console.warn(`[NFT Enrichment] Marketplace lookup failed for ${nft.tokenId}:`, marketplaceError);
          }
        }
      }

      // =========================================================================
      // OPENSEA FALLBACK: If venue is OpenSea and we don't have a price yet,
      // query OpenSea's sale events API directly
      // =========================================================================
      if (acquisition?.venue === 'opensea' && marketplacePriceGun === undefined) {
        try {
          const openSeaService = new OpenSeaService();
          const tokenId = nft.tokenIds?.[0] || nft.tokenId;
          if (process.env.NODE_ENV === 'development') {
            console.log(`[NFT Enrichment] OpenSea fallback for token ${tokenId} (venue: opensea, no marketplace price)`);
          }

          const saleEvents = await withTimeout(
            openSeaService.getSaleEvents(nftContractAddress, tokenId, 'avalanche'),
            8000 // 8 second timeout for OpenSea API
          );

          if (saleEvents && saleEvents.length > 0) {
            // Find the sale where the buyer matches the wallet address
            const walletLower = walletAddress.toLowerCase();
            const matchingSale = saleEvents.find(sale =>
              sale.buyerAddress?.toLowerCase() === walletLower
            );

            if (matchingSale && matchingSale.priceGUN > 0) {
              marketplacePriceGun = matchingSale.priceGUN;
              marketplacePurchaseDate = matchingSale.eventTimestamp ? new Date(matchingSale.eventTimestamp) : undefined;
              console.log(`[NFT Enrichment] OpenSea sale found for ${tokenId}: ${marketplacePriceGun} GUN`);
            } else {
              console.log(`[NFT Enrichment] No matching OpenSea sale for ${tokenId} (buyer: ${walletLower})`);
            }
          } else {
            console.log(`[NFT Enrichment] No OpenSea sale events for token ${tokenId}`);
          }
        } catch (openSeaError) {
          console.warn(`[NFT Enrichment] OpenSea sale lookup failed for ${nft.tokenId}:`, openSeaError);
        }
      }

      // Determine if acquisition data is meaningful (not null/timeout result)
      const hasAcquisitionData = acquisition !== null && (
        acquisition.txHash !== undefined ||
        (typeof acquisition.costGun === 'number' && Number.isFinite(acquisition.costGun)) ||
        acquisition.acquiredAtIso !== undefined
      );

      // Map acquisition data to NFT fields
      // Prefer marketplace price over blockchain cost (blockchain only has mint costs)
      const isFreeTransfer = acquisition?.costGun === 0 && !acquisition?.isMint;
      // For grouped NFTs, tokenIds.length is the authoritative quantity
      const finalQuantity = (nft.tokenIds && nft.tokenIds.length > 1) ? nft.tokenIds.length : (quantity ?? nft.quantity ?? 1);
      const enrichedData = {
        quantity: finalQuantity,
        purchasePriceGun: marketplacePriceGun ?? acquisition?.costGun,
        purchaseDate: marketplacePurchaseDate ?? (acquisition?.acquiredAtIso ? new Date(acquisition.acquiredAtIso) : undefined),
        transferredFrom: isFreeTransfer ? acquisition?.fromAddress : undefined,
        isFreeTransfer,
        acquisitionVenue: acquisition?.venue,
        acquisitionTxHash: acquisition?.txHash ?? undefined,
      };

      // Only cache if acquisition is meaningful OR we're caching quantity-only for ERC-1155
      if (hasAcquisitionData) {
        // Full cache with acquisition data
        const priceSource = marketplacePriceGun !== undefined ? 'marketplace' : (acquisition?.costGun !== undefined ? 'blockchain' : undefined);
        setCachedNFT(walletAddress, primaryTokenId, {
          quantity: enrichedData.quantity,
          purchasePriceGun: enrichedData.purchasePriceGun,
          purchaseDate: enrichedData.purchaseDate?.toISOString(),
          transferredFrom: enrichedData.transferredFrom,
          isFreeTransfer: enrichedData.isFreeTransfer,
          acquisitionVenue: enrichedData.acquisitionVenue,
          acquisitionTxHash: enrichedData.acquisitionTxHash,
          hasAcquisition: true,
          hasMarketplacePrice: marketplacePriceGun !== undefined,
          priceSource,
          cachedAtIso: new Date().toISOString(),
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(`[NFT Cache] Cached complete: ${primaryTokenId} (txHash: ${acquisition?.txHash?.slice(0, 10)}...)`);
        }
      } else if (quantity !== null && quantity !== undefined) {
        // Quantity-only cache (incomplete) - allows retry for acquisition
        setCachedNFT(walletAddress, primaryTokenId, {
          quantity: enrichedData.quantity,
          hasAcquisition: false,
          cachedAtIso: new Date().toISOString(),
        });
        if (process.env.NODE_ENV === 'development') {
          console.log(`[NFT Cache] Skipped acquisition cache (incomplete): ${primaryTokenId} - acquisition was ${acquisition === null ? 'null/timeout' : 'missing data'}`);
        }
      } else {
        // Nothing meaningful to cache
        if (process.env.NODE_ENV === 'development') {
          console.log(`[NFT Cache] Skipped cache entirely: ${primaryTokenId} - no acquisition or quantity`);
        }
      }

      return {
        ...nft,
        ...enrichedData,
      };
    } catch (error) {
      console.error(`Error enriching NFT ${nft.tokenId}:`, error);
      return nft;
    }
  };

  // Background enrichment function - updates NFTs progressively
  const enrichNFTsInBackground = useCallback(async (
    nfts: NFT[],
    walletAddress: string,
    avalancheService: AvalancheService,
    marketplaceService: GameMarketplaceService | null,
    updateCallback: (enrichedNFTs: NFT[]) => void,
    onProgress?: (progress: EnrichmentProgress) => void,
    priorityTokenIds?: string[]
  ) => {
    console.log(`[NFT Enrichment] START - ${nfts.length} NFTs to process, marketplace: ${marketplaceService ? 'configured' : 'null'}`);
    try {
    // NFT_COLLECTION_AVALANCHE is server-side only; hardcoded fallback for production
    const nftContractAddress = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
    console.log(`[NFT Enrichment] Contract: ${nftContractAddress}`);
    if (!nftContractAddress || nfts.length === 0) {
      console.log(`[NFT Enrichment] SKIP - contract: ${nftContractAddress}, nfts: ${nfts.length}`);
      return;
    }

    setEnrichingNFTs(true);
    enrichmentCancelledRef.current = false;
    console.log(`[NFT Enrichment] Step 1: Checking cache for ${nfts.length} NFTs`);

    // Start with cached data applied immediately (even incomplete cache has quantity)
    const nftsWithCache = nfts.map(nft => {
      const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
      const cached = getCachedNFT(walletAddress, primaryTokenId);
      if (cached) {
        // For grouped NFTs, tokenIds.length is the authoritative quantity
        const groupedQuantity = nft.tokenIds && nft.tokenIds.length > 1 ? nft.tokenIds.length : undefined;
        return {
          ...nft,
          quantity: groupedQuantity ?? cached.quantity ?? nft.quantity ?? 1,
          purchasePriceGun: cached.purchasePriceGun,
          purchaseDate: cached.purchaseDate ? new Date(cached.purchaseDate) : undefined,
          transferredFrom: cached.transferredFrom,
          isFreeTransfer: cached.isFreeTransfer,
          acquisitionVenue: cached.acquisitionVenue,
          acquisitionTxHash: cached.acquisitionTxHash,
        };
      }
      return nft;
    });

    // Update immediately with cached data
    console.log(`[NFT Enrichment] Step 2: Cache mapped, calling updateCallback`);
    updateCallback(nftsWithCache);
    console.log(`[NFT Enrichment] Step 3: Filtering NFTs that need enrichment`);

    // Find NFTs that need enrichment:
    // - No cache at all
    // - Cache exists but hasAcquisition is false/undefined (incomplete)
    // - Cache is incomplete AND older than INCOMPLETE_CACHE_STALE_MS
    const nftsNeedingEnrichment = nftsWithCache.filter(nft => {
      const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
      const tokenKey = buildTokenKey('avalanche', nftContractAddress, primaryTokenId);
      const { needsRetry, reason } = needsReEnrichment(walletAddress, tokenKey);

      if (needsRetry && process.env.NODE_ENV === 'development' && reason !== 'no_cache') {
        console.log(`[NFT Enrichment] Retrying ${primaryTokenId}: ${reason}`);
      }

      return needsRetry;
    });

    if (nftsNeedingEnrichment.length === 0) {
      console.log(`[NFT Enrichment] All ${nfts.length} NFTs loaded from cache`);
      onProgress?.({ completed: 0, total: 0, phase: 'complete' });
      setEnrichingNFTs(false);
      return;
    }

    console.log(`[NFT Enrichment] ${nftsNeedingEnrichment.length}/${nfts.length} NFTs need enrichment`);

    // Sort by priority: above-the-fold NFTs first for faster perceived load
    let orderedNftsToEnrich = nftsNeedingEnrichment;
    if (priorityTokenIds && priorityTokenIds.length > 0) {
      const prioritySet = new Set(priorityTokenIds);
      const priorityNfts = nftsNeedingEnrichment.filter(nft => {
        const tokenId = nft.tokenIds?.[0] || nft.tokenId;
        return prioritySet.has(tokenId);
      });
      const remainingNfts = nftsNeedingEnrichment.filter(nft => {
        const tokenId = nft.tokenIds?.[0] || nft.tokenId;
        return !prioritySet.has(tokenId);
      });
      orderedNftsToEnrich = [...priorityNfts, ...remainingNfts];
      if (priorityNfts.length > 0) {
        console.log(`[NFT Enrichment] Prioritizing ${priorityNfts.length} above-fold NFTs`);
      }
    }

    // Report initial progress
    onProgress?.({ completed: 0, total: orderedNftsToEnrich.length, phase: 'enriching' });

    // Process in batches and update progressively
    const enrichedResults = new Map<string, NFT>();
    nftsWithCache.forEach(nft => {
      const key = nft.tokenIds?.[0] || nft.tokenId;
      enrichedResults.set(key, nft);
    });

    for (let i = 0; i < orderedNftsToEnrich.length; i += ENRICHMENT_BATCH_SIZE) {
      if (enrichmentCancelledRef.current) break;

      const batch = orderedNftsToEnrich.slice(i, i + ENRICHMENT_BATCH_SIZE);
      console.log(`[NFT Enrichment] Processing batch ${i / ENRICHMENT_BATCH_SIZE + 1}: ${batch.map(n => n.tokenId).join(', ')}`);

      const batchResults = await Promise.all(
        batch.map(nft => enrichSingleNFT(nft, walletAddress, nftContractAddress, avalancheService, marketplaceService))
      );

      // Update results map and log enrichment results
      batchResults.forEach(enrichedNFT => {
        const key = enrichedNFT.tokenIds?.[0] || enrichedNFT.tokenId;
        enrichedResults.set(key, enrichedNFT);
        console.log(`[NFT Enrichment] ${key}: purchasePriceGun=${enrichedNFT.purchasePriceGun ?? 'undefined'}`);
      });

      // Reconstruct array in original order and update UI
      if (!enrichmentCancelledRef.current) {
        const updatedNFTs = nfts.map(nft => {
          const key = nft.tokenIds?.[0] || nft.tokenId;
          return enrichedResults.get(key) || nft;
        });
        updateCallback(updatedNFTs);

        // Report progress after each batch
        const completedCount = Math.min(i + ENRICHMENT_BATCH_SIZE, orderedNftsToEnrich.length);
        onProgress?.({ completed: completedCount, total: orderedNftsToEnrich.length, phase: 'enriching' });
      }

      // Add delay between batches to avoid RPC rate limiting (429 errors)
      if (i + ENRICHMENT_BATCH_SIZE < orderedNftsToEnrich.length && !enrichmentCancelledRef.current) {
        await delay(ENRICHMENT_BATCH_DELAY_MS);
      }
    }

    const withPrice = Array.from(enrichedResults.values()).filter(n => n.purchasePriceGun !== undefined).length;
    console.log(`[NFT Enrichment] Complete: ${withPrice}/${nfts.length} NFTs have price data`);
    onProgress?.({ completed: orderedNftsToEnrich.length, total: orderedNftsToEnrich.length, phase: 'complete' });
    setEnrichingNFTs(false);
    } catch (enrichmentError) {
      console.error(`[NFT Enrichment] FATAL ERROR:`, enrichmentError);
      setEnrichingNFTs(false);
    }
  }, []);

  // Load more NFTs (pagination)
  const handleLoadMoreNFTs = useCallback(async () => {
    if (!walletData || nftPagination.isLoadingMore || !nftPagination.hasMore) return;

    setNftPagination(prev => ({ ...prev, isLoadingMore: true }));

    try {
      const avalancheService = new AvalancheService();
      const startIndex = nftPagination.fetchedCount;

      const result = await avalancheService.getNFTsPaginated(
        walletData.address,
        startIndex,
        nftPagination.pageSize
      );

      if (result.nfts.length > 0) {
        // Group new NFTs
        const groupedNewNFTs = groupNFTsByMetadata(result.nfts);

        // Merge with existing NFTs (avoid duplicates by tokenId)
        const existingTokenIds = new Set(
          walletData.avalanche.nfts.flatMap(nft => nft.tokenIds || [nft.tokenId])
        );
        const uniqueNewNFTs = groupedNewNFTs.filter(nft => {
          const tokenIds = nft.tokenIds || [nft.tokenId];
          return !tokenIds.some(id => existingTokenIds.has(id));
        });

        const mergedNFTs = [...walletData.avalanche.nfts, ...uniqueNewNFTs];

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

        // Start background enrichment for new NFTs
        const paginationMarketplaceService = new GameMarketplaceService();
        const paginationMarketplaceConfigured = paginationMarketplaceService.isConfigured();

        enrichNFTsInBackground(
          uniqueNewNFTs,
          walletData.address,
          avalancheService,
          paginationMarketplaceConfigured ? paginationMarketplaceService : null,
          (enrichedNFTs: NFT[]) => {
            setWalletData(prev => {
              if (!prev) return prev;
              // Merge enriched NFTs back, preserving floor prices
              const existingNFTs = prev.avalanche.nfts;
              const enrichedMap = new Map(
                enrichedNFTs.map(nft => [nft.tokenIds?.[0] || nft.tokenId, nft])
              );
              const updatedNFTs = existingNFTs.map(existingNft => {
                const key = existingNft.tokenIds?.[0] || existingNft.tokenId;
                const enriched = enrichedMap.get(key);
                if (!enriched) return existingNft;
                // Spread existing first (preserves floorPrice), then overlay enriched data
                return {
                  ...existingNft,
                  ...enriched,
                  floorPrice: enriched.floorPrice ?? existingNft.floorPrice,
                };
              });
              return {
                ...prev,
                avalanche: {
                  ...prev.avalanche,
                  nfts: updatedNFTs,
                },
              };
            });
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
  }, [walletData, nftPagination, enrichNFTsInBackground]);

  /**
   * Fetch wallet data for a single address.
   * Returns WalletData or null if fetch fails.
   */
  const fetchSingleWallet = async (
    address: string,
    avalancheService: AvalancheService,
    solanaService: SolanaService
  ): Promise<{ walletData: WalletData; nftResult: { totalCount: number; hasMore: boolean; fetchedCount: number } } | null> => {
    try {
      const [
        avalancheToken,
        avalancheNFTsResult,
        solanaToken,
        solanaNFTs,
      ] = await Promise.all([
        avalancheService.getGunTokenBalance(address),
        avalancheService.getNFTsPaginated(address, 0, 50),
        solanaService.getGunTokenBalance(address),
        solanaService.getNFTs(address),
      ]);

      // Group NFTs by metadata to consolidate duplicates
      const groupedAvalancheNFTs = groupNFTsByMetadata(avalancheNFTsResult.nfts);
      const groupedSolanaNFTs = groupNFTsByMetadata(solanaNFTs);

      return {
        walletData: {
          address,
          avalanche: {
            gunToken: avalancheToken,
            nfts: groupedAvalancheNFTs,
          },
          solana: {
            gunToken: solanaToken,
            nfts: groupedSolanaNFTs,
          },
          totalValue: 0,
          lastUpdated: new Date(),
        },
        nftResult: {
          totalCount: avalancheNFTsResult.totalCount,
          hasMore: avalancheNFTsResult.hasMore,
          fetchedCount: avalancheNFTsResult.nfts.length,
        },
      };
    } catch (err) {
      console.error(`Error fetching wallet data for ${address}:`, err);
      return null;
    }
  };

  const handleWalletSubmit = async (address: string, _chain: 'avalanche' | 'solana') => {
    // Cancel any ongoing enrichment
    enrichmentCancelledRef.current = true;

    // Reset portfolio states for new search
    setIsPortfolioInitializing(true);

    setLoading(true);
    setError(null);

    try {
      const avalancheService = new AvalancheService();
      const solanaService = new SolanaService();
      const coinGeckoService = new CoinGeckoService();
      const marketplaceService = new GameMarketplaceService();

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

      // Log aggregation mode
      if (addressesToFetch.length > 1) {
        console.log(`[Portfolio Aggregation] Fetching ${addressesToFetch.length} wallets:`, addressesToFetch);
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
        ...addressesToFetch.map(addr => fetchSingleWallet(addr, avalancheService, solanaService)),
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

      // Clear search input after successful load
      // This prevents the search bar from showing the wallet address and triggering the dropdown
      setSearchAddress('');

      // Start background enrichment for all Avalanche NFTs
      // Reuse existing marketplace service (will gracefully handle unconfigured state)
      const marketplaceConfigured = marketplaceService.isConfigured();

      // Extract priority tokens (above-the-fold NFTs) for faster perceived load
      const priorityTokenIds = mergedData.avalanche.nfts
        .slice(0, PRIORITY_ABOVE_FOLD_COUNT)
        .map(nft => nft.tokenIds?.[0] || nft.tokenId);

      // For merged data, enrich all NFTs but update the merged state
      enrichNFTsInBackground(
        mergedData.avalanche.nfts,
        address, // Use primary address for cache keys
        avalancheService,
        marketplaceConfigured ? marketplaceService : null,
        (enrichedNFTs) => {
          setWalletData(prev => {
            if (!prev || prev.address !== address) return prev;
            // MERGE enriched data with current state to preserve floor prices
            // (floor price fetch runs concurrently and may complete first)
            const enrichedMap = new Map(
              enrichedNFTs.map(nft => [nft.tokenIds?.[0] || nft.tokenId, nft])
            );
            const mergedNFTs = prev.avalanche.nfts.map(existingNft => {
              const key = existingNft.tokenIds?.[0] || existingNft.tokenId;
              const enriched = enrichedMap.get(key);
              if (!enriched) return existingNft;
              // Spread existing first (preserves floorPrice), then overlay enriched data
              return {
                ...existingNft,
                ...enriched,
                // Preserve floorPrice from existing if enriched doesn't have it
                floorPrice: enriched.floorPrice ?? existingNft.floorPrice,
              };
            });
            return {
              ...prev,
              avalanche: {
                ...prev.avalanche,
                nfts: mergedNFTs,
              },
            };
          });
        },
        setEnrichmentProgress,
        priorityTokenIds
      );

      // Fetch collection floor price in background and apply to all NFTs
      // This enables Value/P&L sorting in the gallery
      const nftContractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
      if (nftContractAddress) {
        const openSeaService = new OpenSeaService();
        openSeaService.getNFTFloorPrice(nftContractAddress, 'avalanche')
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

  // Handle wallet search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      handleWalletSubmit(searchAddress.trim(), 'avalanche');
    }
  };

  // Handle wallet connection from Dynamic
  const handleWalletConnect = (address: string) => {
    // Auto-load wallet data when user connects via Dynamic
    handleWalletSubmit(address, 'avalanche');
  };

  // Handle wallet disconnect
  const handleWalletDisconnect = () => {
    enrichmentCancelledRef.current = true;
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

  // Handle selecting a tracked address from account panel
  const handleTrackedAddressSelect = useCallback((address: string) => {
    setSearchAddress(address);
    handleWalletSubmit(address, 'avalanche');
  }, []);

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
  const contextValue: PortfolioContextValue = useMemo(() => ({
    walletData,
    address: walletData?.address ?? null,
    gunPrice,
    gunPriceChange24h: undefined, // TODO: Add when available
    gunPriceChangePercent24h: undefined, // TODO: Add when available
    networkInfo,
    walletType,
    portfolioResult,
    enrichmentProgress,
    isEnriching: enrichingNFTs,
    allNfts: walletData
      ? [...walletData.avalanche.nfts, ...walletData.solana.nfts]
      : [],
    isLoading: loading,
    isInitializing: isPortfolioInitializing,
    error,
  }), [
    walletData,
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
      <Navbar
        onWalletConnect={handleWalletConnect}
        onWalletDisconnect={handleWalletDisconnect}
        onAccountClick={() => setIsAccountPanelOpen(true)}
      />

      {/* Account Panel */}
      <AccountPanel
        isOpen={isAccountPanelOpen}
        onClose={() => setIsAccountPanelOpen(false)}
        onAddressSelect={handleTrackedAddressSelect}
      />

      {/* Landing state - prompt to search or connect */}
      {!walletData && !loading && (
        <div className="max-w-2xl mx-auto py-24 px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--gs-lime)]/10 border border-[var(--gs-lime)]/20 mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--gs-lime)] animate-pulse" />
            <span className="font-mono text-[11px] text-[var(--gs-lime)] tracking-wider uppercase">
              Portfolio Tracker
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--gs-white)] leading-tight mb-4">
            Track Your <span className="text-[var(--gs-lime)]">Arsenal</span>
          </h1>

          <p className="text-[var(--gs-gray-4)] mb-8 max-w-md mx-auto">
            Enter a wallet address or connect your wallet to view your portfolio.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-6">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--gs-lime)]/30 to-[var(--gs-purple)]/30 rounded-lg opacity-0 group-hover:opacity-100 blur transition-opacity" />
              <div className="relative flex">
                <input
                  id="wallet-search-input"
                  type="text"
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  placeholder="Enter wallet address..."
                  className="flex-1 px-5 py-4 text-base bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-l-lg text-white placeholder-[var(--gs-gray-3)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition font-mono"
                />
                <button
                  type="submit"
                  disabled={!searchAddress.trim()}
                  className="px-8 py-4 bg-[var(--gs-lime)] text-black font-display font-bold text-sm rounded-r-lg hover:bg-[var(--gs-lime-bright)] transition-all disabled:opacity-50 disabled:cursor-not-allowed clip-corner-tr"
                >
                  TRACK
                </button>
              </div>
            </div>
          </form>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>
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
          <p className="mt-4 text-[var(--gs-gray-4)]">Loading wallet data...</p>
        </div>
      )}

      {/* Portfolio View - shown when wallet is connected */}
      {walletData && !loading && (
        <div className="max-w-7xl mx-auto py-8 px-4">
          {/* Search another wallet - inline search bar */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => {
                enrichmentCancelledRef.current = true;
                setWalletData(null);
                setNetworkInfo(null);
                setWalletType('unknown');
                setError(null);
                setSearchAddress('');
              }}
              className="text-[var(--gs-lime)] hover:text-[var(--gs-purple)] font-medium transition-colors text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              New Search
            </button>
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
            {/* Aggregation indicator */}
            {aggregatedAddresses.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-[var(--gs-purple)]">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>{aggregatedAddresses.length} wallets combined</span>
              </div>
            )}
          </div>

          {/* Portfolio Header - scrolls normally */}
          <PortfolioHeader
            walletData={walletData}
            gunPrice={gunPrice}
            networkInfo={networkInfo}
            walletType={walletType}
            totalOwnedCount={nftPagination.totalOwnedCount}
            portfolioResult={portfolioResult}
            enrichmentProgress={enrichmentProgress}
          />

          <div className="space-y-6 mt-4">
            {/* Portfolio Summary Bar */}
            <PortfolioSummaryBar
              portfolioResult={portfolioResult}
              gunPrice={gunPrice}
              nfts={walletData.avalanche.nfts}
              isInitializing={isPortfolioInitializing}
            />

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
