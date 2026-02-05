'use client';

import { createContext, useContext, ReactNode } from 'react';
import { WalletData, NFT, EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { NetworkInfo } from '@/lib/utils/networkDetector';

// =============================================================================
// Context Types
// =============================================================================

/**
 * Read-only portfolio state provided by PortfolioContext.
 * Components consume this via selective hooks to minimize re-renders.
 */
export interface PortfolioContextValue {
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

  // Enrichment state
  enrichmentProgress: EnrichmentProgress | null;
  isEnriching: boolean;

  // NFTs (convenience accessor)
  allNfts: NFT[];

  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
}

// =============================================================================
// Default Value
// =============================================================================

const defaultValue: PortfolioContextValue = {
  walletData: null,
  address: null,
  gunPrice: undefined,
  gunPriceChange24h: undefined,
  gunPriceChangePercent24h: undefined,
  networkInfo: null,
  walletType: 'unknown',
  portfolioResult: null,
  enrichmentProgress: null,
  isEnriching: false,
  allNfts: [],
  isLoading: false,
  isInitializing: true,
  error: null,
};

// =============================================================================
// Context Creation
// =============================================================================

const PortfolioContext = createContext<PortfolioContextValue>(defaultValue);

// =============================================================================
// Provider Component
// =============================================================================

interface PortfolioProviderProps {
  children: ReactNode;
  value: PortfolioContextValue;
}

export function PortfolioProvider({ children, value }: PortfolioProviderProps) {
  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

// =============================================================================
// Main Hook
// =============================================================================

/**
 * Access the full portfolio context.
 * Prefer selective hooks below to minimize re-renders.
 */
export function usePortfolioContext() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolioContext must be used within PortfolioProvider');
  }
  return context;
}

// =============================================================================
// Selective Hooks (prevent unnecessary re-renders)
// =============================================================================

/**
 * Access GUN price data only.
 * Re-renders only when price values change.
 */
export function usePortfolioGunPrice() {
  const { gunPrice, gunPriceChange24h, gunPriceChangePercent24h } = usePortfolioContext();
  return { gunPrice, gunPriceChange24h, gunPriceChangePercent24h };
}

/**
 * Access portfolio calculation result only.
 * Re-renders only when portfolioResult changes.
 */
export function usePortfolioResult() {
  const { portfolioResult } = usePortfolioContext();
  return portfolioResult;
}

/**
 * Access NFT data and enrichment state.
 * Re-renders when NFTs or enrichment progress changes.
 */
export function usePortfolioNFTs() {
  const { allNfts, isEnriching, enrichmentProgress } = usePortfolioContext();
  return { allNfts, isEnriching, enrichmentProgress };
}

/**
 * Access wallet and network information.
 * Re-renders when wallet data or network info changes.
 */
export function usePortfolioWallet() {
  const { walletData, address, networkInfo, walletType } = usePortfolioContext();
  return { walletData, address, networkInfo, walletType };
}

/**
 * Access loading and error states.
 * Re-renders when loading states change.
 */
export function usePortfolioLoading() {
  const { isLoading, isInitializing, error } = usePortfolioContext();
  return { isLoading, isInitializing, error };
}

// =============================================================================
// Export Context (for advanced use cases)
// =============================================================================

export { PortfolioContext };
