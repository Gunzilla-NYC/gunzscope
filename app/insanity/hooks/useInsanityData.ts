'use client';

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { WalletData, NFT, NFTPaginationInfo } from '@/lib/types';
import { OpenSeaService } from '@/lib/api/opensea';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { groupNFTsByMetadata, mergeIntoGroups } from '@/lib/utils/nftGrouping';
import { calcPortfolio, PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { useNFTEnrichmentOrchestrator } from '@/lib/hooks/useNFTEnrichmentOrchestrator';
import { useWalletDataFetcher } from '@/lib/hooks/useWalletDataFetcher';
import { createEnrichmentUpdater } from '@/lib/utils/mergeEnrichedNFTs';
import { bootstrapPortfolioHistory } from '@/lib/utils/portfolioHistory';
import { usePortfolioSummaryData } from '@/components/portfolio-summary/usePortfolioSummaryData';
import useCountUp from '@/hooks/useCountUp';
import { EnrichmentProgress } from '@/lib/types';

// Re-export the return type of usePortfolioSummaryData for component props
export type InsanitySummaryData = ReturnType<typeof usePortfolioSummaryData>;

export interface InsanityData {
  // Status
  loading: boolean;
  error: string | null;
  isInitializing: boolean;
  // Core data
  walletData: WalletData | null;
  gunPrice: number | undefined;
  portfolioResult: PortfolioCalcResult | null;
  nfts: NFT[];
  // Summary data (from usePortfolioSummaryData)
  data: InsanitySummaryData;
  // Enrichment
  enrichmentProgress: EnrichmentProgress | null;
  retryEnrichment: () => void;
  // Display
  animatedTotal: string;
  gunSparklineValues: number[];
  truncatedAddress: string;
  // Pagination
  nftPagination: NFTPaginationInfo;
}

export function useInsanityData(address: string): InsanityData {
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
          if (price) {
            const gunBal = (wd.avalanche.gunToken?.balance ?? 0) + (wd.solana.gunToken?.balance ?? 0);
            const estValue = gunBal * price;
            if (estValue > 0) {
              bootstrapPortfolioHistory(address, estValue, priceData.sparkline7d, price);
            }
          }
        }
        setLoading(false);

        // Start background enrichment
        const mc = marketplaceRef.current;
        startEnrichment(
          wd.avalanche.nfts, address, avalancheService,
          mc.isConfigured() ? mc : null,
          (enrichedNFTs) => setWalletData(createEnrichmentUpdater(enrichedNFTs, address)),
        );

        // Fetch collection floor + rarity floors + comparable sales in parallel
        const nftContract = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
        const floorP = openSeaRef.current.getNFTFloorPrice(nftContract, 'avalanche').catch(() => null);
        const rarityP = fetch('/api/opensea/rarity-floors')
          .then(r => r.ok ? r.json() : null)
          .catch(() => null) as Promise<{ floors: Record<string, number> } | null>;
        const comparableP = fetch('/api/opensea/comparable-sales')
          .then(r => r.ok ? r.json() : null)
          .catch(() => null) as Promise<{ items: Record<string, { medianGun: number }> } | null>;

        Promise.all([floorP, rarityP, comparableP]).then(([collectionFloor, rarityData, comparableData]) => {
          if (cancelled) return;
          const hasFloor = collectionFloor !== null && collectionFloor > 0;
          const rarityFloors = rarityData?.floors && Object.keys(rarityData.floors).length > 0
            ? rarityData.floors : null;
          const comparableItems = comparableData?.items && Object.keys(comparableData.items).length > 0
            ? comparableData.items : null;
          if (!hasFloor && !rarityFloors && !comparableItems) return;

          setWalletData(prev => {
            if (!prev) return prev;
            const updatedNfts = prev.avalanche.nfts.map(nft => {
              if (nft.currentLowestListing && nft.currentLowestListing > 0) {
                return hasFloor ? { ...nft, floorPrice: nft.floorPrice ?? collectionFloor } : nft;
              }
              if (comparableItems) {
                const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'];
                const name = nft.name?.trim();
                if (name && rarity) {
                  const comp = comparableItems[`${name}::${rarity}`];
                  if (comp && comp.medianGun > 0) return { ...nft, floorPrice: comp.medianGun };
                }
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
            return { ...prev, avalanche: { ...prev.avalanche, nfts: updatedNfts } };
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

  return {
    loading,
    error,
    isInitializing,
    walletData,
    gunPrice,
    portfolioResult,
    nfts,
    data,
    enrichmentProgress,
    retryEnrichment,
    animatedTotal,
    gunSparklineValues,
    truncatedAddress,
    nftPagination,
  };
}
