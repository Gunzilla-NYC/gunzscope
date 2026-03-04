'use client';

import { createContext, useContext, ReactNode } from 'react';
import { WalletData, NFT, EnrichmentProgress } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { NetworkInfo } from '@/lib/utils/networkDetector';
import type { PortfolioAddress } from '@/lib/hooks/useUserProfile';

// =============================================================================
// Context Types
// =============================================================================

/**
 * Portfolio state + actions provided by PortfolioContext.
 * Components consume this via selective hooks to minimize re-renders.
 */
export interface PortfolioContextValue {
  // Wallet data
  walletData: WalletData | null;
  address: string | null;

  // Price data
  gunPrice: number | undefined;

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

  // Connected wallets (for self-transfer vs gift classification)
  connectedWallets: string[];

  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;

  // Wallet identity state (previously prop-drilled)
  portfolioAddresses: PortfolioAddress[];
  activeWalletAddress: string | null;
  allWalletAddresses: string[];
  primaryWalletAddress: string | null;
  isAuthenticated: boolean;
  isInWatchlist: boolean;
  isInPortfolio: boolean;
  isAtPortfolioLimit: boolean;
  isAddingWatchlist: boolean;
  isAddingPortfolio: boolean;

  // Wallet identity actions (previously prop-drilled)
  onSwitchWallet: (address: string) => void;
  onBackToOwnWallet: () => void;
  onAddToWatchlist: (address: string) => Promise<boolean>;
  onAddToPortfolio: (address: string) => Promise<boolean>;
}

// =============================================================================
// Default Value
// =============================================================================

const noop = () => {};
const noopAsync = async () => false;

const defaultValue: PortfolioContextValue = {
  walletData: null,
  address: null,
  gunPrice: undefined,
  networkInfo: null,
  walletType: 'unknown',
  portfolioResult: null,
  enrichmentProgress: null,
  isEnriching: false,
  allNfts: [],
  connectedWallets: [],
  isLoading: false,
  isInitializing: true,
  error: null,
  portfolioAddresses: [],
  activeWalletAddress: null,
  allWalletAddresses: [],
  primaryWalletAddress: null,
  isAuthenticated: false,
  isInWatchlist: false,
  isInPortfolio: false,
  isAtPortfolioLimit: false,
  isAddingWatchlist: false,
  isAddingPortfolio: false,
  onSwitchWallet: noop,
  onBackToOwnWallet: noop,
  onAddToWatchlist: noopAsync,
  onAddToPortfolio: noopAsync,
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
  const { gunPrice } = usePortfolioContext();
  return { gunPrice };
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
 * Access connected wallets for transfer classification.
 * Re-renders when connected wallets change.
 */
export function usePortfolioConnectedWallets() {
  const { connectedWallets } = usePortfolioContext();
  return connectedWallets;
}

/**
 * Access loading and error states.
 * Re-renders when loading states change.
 */
export function usePortfolioLoading() {
  const { isLoading, isInitializing, error } = usePortfolioContext();
  return { isLoading, isInitializing, error };
}

/**
 * Access wallet identity state and actions.
 * Used by PortfolioHeader and WalletIdentity instead of prop drilling.
 */
export function usePortfolioIdentity() {
  const ctx = usePortfolioContext();
  return {
    portfolioAddresses: ctx.portfolioAddresses,
    activeWalletAddress: ctx.activeWalletAddress,
    allWalletAddresses: ctx.allWalletAddresses,
    primaryWalletAddress: ctx.primaryWalletAddress,
    isAuthenticated: ctx.isAuthenticated,
    isInWatchlist: ctx.isInWatchlist,
    isInPortfolio: ctx.isInPortfolio,
    isAtPortfolioLimit: ctx.isAtPortfolioLimit,
    isAddingWatchlist: ctx.isAddingWatchlist,
    isAddingPortfolio: ctx.isAddingPortfolio,
    onSwitchWallet: ctx.onSwitchWallet,
    onBackToOwnWallet: ctx.onBackToOwnWallet,
    onAddToWatchlist: ctx.onAddToWatchlist,
    onAddToPortfolio: ctx.onAddToPortfolio,
  };
}

// =============================================================================
// Export Context (for advanced use cases)
// =============================================================================

export { PortfolioContext };
