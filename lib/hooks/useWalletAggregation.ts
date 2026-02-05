'use client';

import { useMemo } from 'react';
import { WalletData } from '@/lib/types';

// =============================================================================
// Types
// =============================================================================

export interface UseWalletAggregationOptions {
  /** Whether to include portfolio wallets in aggregation */
  includePortfolio: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for aggregating multiple wallet data objects into a single view.
 *
 * Merging logic:
 * - GUN Balance: Sum all gunBalance values across wallets
 * - NFT List: Concatenate all NFT arrays from all wallets
 * - Address: Uses the primary (first) address for display
 * - Token Metadata: Uses first wallet's token metadata as template
 *
 * @param primaryWallet - The main wallet data (may be null during loading)
 * @param portfolioWallets - Additional wallets to aggregate
 * @param options - Aggregation options
 * @returns Aggregated wallet data or null if no primary wallet
 */
export function useWalletAggregation(
  primaryWallet: WalletData | null,
  portfolioWallets: WalletData[],
  options: UseWalletAggregationOptions
): WalletData | null {
  return useMemo(() => {
    if (!primaryWallet) return null;

    // If not including portfolio or no portfolio wallets, return primary as-is
    if (!options.includePortfolio || portfolioWallets.length === 0) {
      return primaryWallet;
    }

    // Combine all wallets for aggregation
    const allWallets = [primaryWallet, ...portfolioWallets];

    // Sum GUN balances across chains
    const avalancheGunBalance = allWallets.reduce((sum, w) => {
      return sum + (w.avalanche.gunToken?.balance ?? 0);
    }, 0);

    const solanaGunBalance = allWallets.reduce((sum, w) => {
      return sum + (w.solana.gunToken?.balance ?? 0);
    }, 0);

    // Concatenate all NFTs (no deduplication - each wallet may have different NFTs)
    const allAvalancheNFTs = allWallets.flatMap(w => w.avalanche.nfts);
    const allSolanaNFTs = allWallets.flatMap(w => w.solana.nfts);

    // Use first wallet's token metadata as template
    const firstAvalancheToken = allWallets.find(w => w.avalanche.gunToken)?.avalanche.gunToken;
    const firstSolanaToken = allWallets.find(w => w.solana.gunToken)?.solana.gunToken;

    // Sum total values across all wallets
    const totalValue = allWallets.reduce((sum, w) => sum + (w.totalValue ?? 0), 0);

    return {
      address: primaryWallet.address, // Primary address for display
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
      totalValue,
      lastUpdated: new Date(),
    };
  }, [primaryWallet, portfolioWallets, options.includePortfolio]);
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Pure function to merge wallet data arrays.
 * Useful for non-hook contexts or testing.
 *
 * @param wallets - Array of WalletData to merge
 * @returns Merged WalletData
 * @throws Error if wallets array is empty
 */
export function mergeWalletData(wallets: WalletData[]): WalletData {
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

  // Sum total values across all wallets
  const totalValue = wallets.reduce((sum, w) => sum + (w.totalValue ?? 0), 0);

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
    totalValue,
    lastUpdated: new Date(),
  };
}
