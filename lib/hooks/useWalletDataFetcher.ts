'use client';

import { useState, useCallback, useRef } from 'react';
import { WalletData } from '@/lib/types';
import { AvalancheService } from '@/lib/blockchain/avalanche';
import { SolanaService } from '@/lib/blockchain/solana';
import { CoinGeckoService } from '@/lib/api/coingecko';
import { NetworkInfo } from '@/lib/utils/networkDetector';
import { groupNFTsByMetadata } from '@/lib/utils/nftGrouping';

// Known mainnet info — no need for an RPC call to determine this
const GUNZCHAIN_MAINNET_INFO: NetworkInfo = {
  environment: 'mainnet',
  chainId: 43419,
  name: 'GunzChain Mainnet',
  explorerUrl: 'https://gunzscan.io',
};

// =============================================================================
// Types
// =============================================================================

export interface WalletFetchResult {
  walletData: WalletData;
  nftResult: {
    totalCount: number;
    hasMore: boolean;
    fetchedCount: number;
  };
}

export interface WalletDataFetcherState {
  walletData: WalletData | null;
  gunPrice: number | undefined;
  gunPriceSparkline: number[];
  networkInfo: NetworkInfo | null;
  walletType: 'in-game' | 'external' | 'unknown';
  nftPagination: {
    totalCount: number;
    fetchedCount: number;
    hasMore: boolean;
  };
  isLoading: boolean;
  error: string | null;
}

export interface UseWalletDataFetcherOptions {
  onSuccess?: (result: WalletFetchResult) => void;
  onError?: (error: string) => void;
}

// =============================================================================
// Default State
// =============================================================================

const defaultState: WalletDataFetcherState = {
  walletData: null,
  gunPrice: undefined,
  gunPriceSparkline: [],
  networkInfo: null,
  walletType: 'unknown',
  nftPagination: {
    totalCount: 0,
    fetchedCount: 0,
    hasMore: false,
  },
  isLoading: false,
  error: null,
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for fetching wallet data including balances, NFTs, network info, and GUN price.
 * Handles single wallet fetching - for multi-wallet aggregation, use useWalletAggregation.
 */
export function useWalletDataFetcher(options?: UseWalletDataFetcherOptions) {
  const [state, setState] = useState<WalletDataFetcherState>(defaultState);

  // Keep services as refs to avoid recreating on each render
  const servicesRef = useRef<{
    avalanche: AvalancheService;
    solana: SolanaService;
    coinGecko: CoinGeckoService;
  } | null>(null);

  // Initialize services lazily
  const getServices = useCallback(() => {
    if (!servicesRef.current) {
      servicesRef.current = {
        avalanche: new AvalancheService(),
        solana: new SolanaService(),
        coinGecko: new CoinGeckoService(),
      };
    }
    return servicesRef.current;
  }, []);

  /**
   * Fetch wallet data for a single address.
   */
  const fetchSingleWallet = useCallback(async (
    address: string,
    avalancheService: AvalancheService,
    solanaService: SolanaService
  ): Promise<WalletFetchResult | null> => {
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
  }, []);

  /**
   * Main fetch function - fetches wallet data, network info, and GUN price in parallel.
   */
  const fetchWalletData = useCallback(async (address: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const services = getServices();

      // Fetch price and wallet data in parallel
      // Network info is hardcoded (we know it's GunzChain mainnet)
      const [
        priceData,
        walletResult,
      ] = await Promise.all([
        services.coinGecko.getGunTokenPrice(),
        fetchSingleWallet(address, services.avalanche, services.solana),
      ]);

      if (!walletResult) {
        throw new Error('Failed to fetch wallet data');
      }

      const newState: WalletDataFetcherState = {
        walletData: walletResult.walletData,
        gunPrice: priceData?.gunTokenPrice,
        gunPriceSparkline: priceData?.sparkline7d ?? [],
        networkInfo: GUNZCHAIN_MAINNET_INFO,
        walletType: 'unknown',
        nftPagination: {
          totalCount: walletResult.nftResult.totalCount,
          fetchedCount: walletResult.nftResult.fetchedCount,
          hasMore: walletResult.nftResult.hasMore,
        },
        isLoading: false,
        error: null,
      };

      setState(newState);
      options?.onSuccess?.(walletResult);

      return walletResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      options?.onError?.(errorMessage);
      return null;
    }
  }, [getServices, fetchSingleWallet, options]);

  /**
   * Fetch multiple wallets and return results (for aggregation).
   */
  const fetchMultipleWallets = useCallback(async (addresses: string[]) => {
    const services = getServices();

    const results = await Promise.all(
      addresses.map(addr => fetchSingleWallet(addr, services.avalanche, services.solana))
    );

    return results.filter((r): r is WalletFetchResult => r !== null);
  }, [getServices, fetchSingleWallet]);

  /**
   * Update wallet data (used for enrichment updates).
   */
  const updateWalletData = useCallback((updater: (prev: WalletData | null) => WalletData | null) => {
    setState(prev => ({
      ...prev,
      walletData: updater(prev.walletData),
    }));
  }, []);

  /**
   * Reset state to initial values.
   */
  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  // Stable wrapper for fetchSingleWallet — avoids new function on every render
  const fetchSingleWalletPublic = useCallback((address: string) => {
    const services = getServices();
    return fetchSingleWallet(address, services.avalanche, services.solana);
  }, [getServices, fetchSingleWallet]);

  return {
    ...state,
    fetchWalletData,
    fetchMultipleWallets,
    fetchSingleWallet: fetchSingleWalletPublic,
    updateWalletData,
    reset,
    // Expose services for enrichment
    getServices,
  };
}
