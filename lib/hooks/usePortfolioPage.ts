'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { WalletData, NFT, EnrichmentProgress } from '@/lib/types';
import { NetworkInfo } from '@/lib/utils/networkDetector';
import { PortfolioCalcResult, calcPortfolio } from '@/lib/portfolio/calcPortfolio';
import { AvalancheService } from '@/lib/blockchain/avalanche';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { useWalletDataFetcher, WalletFetchResult } from './useWalletDataFetcher';
import { useNFTEnrichmentOrchestrator } from './useNFTEnrichmentOrchestrator';
import { useWalletAggregation, mergeWalletData } from './useWalletAggregation';

// =============================================================================
// Types
// =============================================================================

export interface UsePortfolioPageOptions {
  /** Initial wallet address to load */
  initialAddress?: string;
  /** Additional addresses to aggregate into portfolio */
  portfolioAddresses?: string[];
  /** Enable debug logging */
  debug?: boolean;
}

export interface UsePortfolioPageResult {
  // Wallet data
  walletData: WalletData | null;
  address: string | null;

  // Price data
  gunPrice: number | undefined;
  gunPriceChange24h: number | undefined;
  gunPriceChangePercent24h: number | undefined;

  // Network info
  networkInfo: NetworkInfo | null;
  walletType: 'in-game' | 'external' | 'unknown';

  // Portfolio calculation
  portfolioResult: PortfolioCalcResult | null;

  // Enrichment
  enrichmentProgress: EnrichmentProgress | null;
  isEnriching: boolean;

  // NFTs (convenience accessor)
  allNfts: NFT[];

  // Pagination
  nftPagination: {
    totalCount: number;
    fetchedCount: number;
    hasMore: boolean;
  };

  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Actions
  fetchWallet: (address: string) => Promise<void>;
  updateNFTs: (nfts: NFT[]) => void;
  refreshData: () => void;
}

// =============================================================================
// Service Instances (singleton pattern)
// =============================================================================

let avalancheServiceInstance: AvalancheService | null = null;
let marketplaceServiceInstance: GameMarketplaceService | null = null;

function getAvalancheService(): AvalancheService {
  if (!avalancheServiceInstance) {
    avalancheServiceInstance = new AvalancheService();
  }
  return avalancheServiceInstance;
}

function getMarketplaceService(): GameMarketplaceService | null {
  if (!marketplaceServiceInstance) {
    try {
      marketplaceServiceInstance = new GameMarketplaceService();
    } catch {
      // Marketplace service not available
      return null;
    }
  }
  return marketplaceServiceInstance;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Orchestration hook for the portfolio page.
 * Composes wallet fetching, NFT enrichment, and wallet aggregation.
 *
 * Flow:
 * 1. Fetch primary wallet data
 * 2. Optionally fetch and aggregate portfolio addresses
 * 3. Start background NFT enrichment
 * 4. Calculate portfolio result with enriched data
 */
export function usePortfolioPage(
  options: UsePortfolioPageOptions = {}
): UsePortfolioPageResult {
  const {
    initialAddress,
    portfolioAddresses = [],
    debug = false,
  } = options;

  // ==========================================================================
  // Composed Hooks
  // ==========================================================================

  const walletFetcher = useWalletDataFetcher();
  const enrichment = useNFTEnrichmentOrchestrator();

  // ==========================================================================
  // Local State
  // ==========================================================================

  const [primaryWallet, setPrimaryWallet] = useState<WalletData | null>(null);
  const [portfolioWallets, setPortfolioWallets] = useState<WalletData[]>([]);
  const [gunPrice, setGunPrice] = useState<number | undefined>(undefined);
  const [gunPriceChange24h, setGunPriceChange24h] = useState<number | undefined>(undefined);
  const [gunPriceChangePercent24h, setGunPriceChangePercent24h] = useState<number | undefined>(undefined);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [walletType, setWalletType] = useState<'in-game' | 'external' | 'unknown'>('unknown');
  const [nftPagination, setNftPagination] = useState({
    totalCount: 0,
    fetchedCount: 0,
    hasMore: false,
  });
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);

  // Track if enrichment has been started
  const enrichmentStartedRef = useRef(false);

  // ==========================================================================
  // Aggregate Wallet Data
  // ==========================================================================

  const aggregatedWallet = useWalletAggregation(
    primaryWallet,
    portfolioWallets,
    { includePortfolio: portfolioAddresses.length > 0 }
  );

  // Use enriched NFTs if available, otherwise fall back to aggregated wallet's NFTs
  const allNfts = useMemo(() => {
    if (enrichment.enrichedNFTs.length > 0) {
      return enrichment.enrichedNFTs;
    }
    return aggregatedWallet?.avalanche.nfts ?? [];
  }, [enrichment.enrichedNFTs, aggregatedWallet]);

  // ==========================================================================
  // Portfolio Calculation
  // ==========================================================================

  const portfolioResult = useMemo(() => {
    if (!aggregatedWallet || gunPrice === undefined) return null;

    try {
      // Build wallet data with enriched NFTs for calculation
      const walletDataForCalc: WalletData = {
        ...aggregatedWallet,
        avalanche: {
          ...aggregatedWallet.avalanche,
          nfts: allNfts,
        },
      };

      return calcPortfolio({
        walletData: walletDataForCalc,
        gunPrice,
        totalOwnedNftCount: nftPagination.totalCount,
      });
    } catch (err) {
      if (debug) {
        console.error('[Portfolio] Calculation error:', err);
      }
      return null;
    }
  }, [aggregatedWallet, allNfts, gunPrice, nftPagination.totalCount, debug]);

  // ==========================================================================
  // Fetch Wallet
  // ==========================================================================

  const fetchWallet = useCallback(async (address: string) => {
    if (!address) return;

    setError(null);
    setCurrentAddress(address);
    enrichmentStartedRef.current = false;

    try {
      // Fetch primary wallet
      const result = await walletFetcher.fetchWalletData(address);
      if (!result) return;

      // Update state from fetch result
      setPrimaryWallet(result.walletData);
      setGunPrice(walletFetcher.gunPrice);
      // Note: 24h price change data not yet available from API
      // gunPriceChange24h and gunPriceChangePercent24h remain undefined
      setNetworkInfo(walletFetcher.networkInfo);
      setWalletType(walletFetcher.walletType);
      setNftPagination({
        totalCount: result.nftResult.totalCount,
        fetchedCount: result.nftResult.fetchedCount,
        hasMore: result.nftResult.hasMore,
      });

      // Fetch portfolio addresses if configured
      if (portfolioAddresses.length > 0) {
        const portfolioResults: WalletData[] = [];
        for (const portfolioAddr of portfolioAddresses) {
          if (portfolioAddr.toLowerCase() !== address.toLowerCase()) {
            const portfolioResult = await walletFetcher.fetchWalletData(portfolioAddr);
            if (portfolioResult) {
              portfolioResults.push(portfolioResult.walletData);
            }
          }
        }
        setPortfolioWallets(portfolioResults);
      }

      setIsInitializing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch wallet';
      setError(message);
      setIsInitializing(false);
    }
  }, [walletFetcher, portfolioAddresses]);

  // ==========================================================================
  // Start Enrichment When Wallet Loaded
  // ==========================================================================

  useEffect(() => {
    if (!aggregatedWallet || !currentAddress || enrichmentStartedRef.current) return;
    if (aggregatedWallet.avalanche.nfts.length === 0) return;

    enrichmentStartedRef.current = true;

    const avalancheService = getAvalancheService();
    const marketplaceService = getMarketplaceService();

    // Update NFTs callback
    const updateCallback = (enrichedNFTs: NFT[]) => {
      // The enrichment hook already updates its own state
      // This callback is for the portfolio page to react to updates
    };

    enrichment.startEnrichment(
      aggregatedWallet.avalanche.nfts,
      currentAddress,
      avalancheService,
      marketplaceService,
      updateCallback
    );
  }, [aggregatedWallet, currentAddress, enrichment]);

  // ==========================================================================
  // Initial Load
  // ==========================================================================

  useEffect(() => {
    if (initialAddress) {
      fetchWallet(initialAddress);
    } else {
      setIsInitializing(false);
    }
  }, [initialAddress]); // Intentionally exclude fetchWallet to prevent loops

  // ==========================================================================
  // Update NFTs (for pagination)
  // ==========================================================================

  const updateNFTs = useCallback((nfts: NFT[]) => {
    if (!primaryWallet) return;

    setPrimaryWallet(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        avalanche: {
          ...prev.avalanche,
          nfts,
        },
      };
    });
  }, [primaryWallet]);

  // ==========================================================================
  // Refresh Data
  // ==========================================================================

  const refreshData = useCallback(() => {
    if (currentAddress) {
      enrichmentStartedRef.current = false;
      fetchWallet(currentAddress);
    }
  }, [currentAddress, fetchWallet]);

  // ==========================================================================
  // Return Value
  // ==========================================================================

  return {
    // Wallet data
    walletData: aggregatedWallet,
    address: currentAddress,

    // Price data
    gunPrice,
    gunPriceChange24h,
    gunPriceChangePercent24h,

    // Network info
    networkInfo,
    walletType,

    // Portfolio calculation
    portfolioResult,

    // Enrichment
    enrichmentProgress: enrichment.progress,
    isEnriching: enrichment.isEnriching,

    // NFTs
    allNfts,

    // Pagination
    nftPagination,

    // Loading states
    isLoading: walletFetcher.isLoading,
    isInitializing,
    error: error || walletFetcher.error,

    // Actions
    fetchWallet,
    updateNFTs,
    refreshData,
  };
}
