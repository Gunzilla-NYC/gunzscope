/**
 * Cross-Wallet Pinned Favorites Hook
 *
 * Resolves pinned favorite NFTs from all loaded wallets in walletMap,
 * not just the active wallet. Returns fully renderable NFT objects
 * with source wallet metadata.
 */

'use client';

import { useMemo } from 'react';
import type { NFT, WalletData } from '@/lib/types';
import type { FavoriteItem } from '@/lib/hooks/useUserProfile';

/** An NFT resolved from a pinned favorite, with cross-wallet metadata */
export interface PinnedNFT {
  nft: NFT;
  sourceWallet: string;
  isCrossWallet: boolean;
  favoriteId: string;
}

interface UsePinnedFavoritesResult {
  pinnedItems: PinnedNFT[];
  crossWalletCount: number;
}

/**
 * Resolves pinned favorites against all wallets in walletMap.
 *
 * Resolution strategy:
 * 1. Check active wallet's NFTs first (isCrossWallet = false)
 * 2. Check all other wallets in walletMap (isCrossWallet = true)
 * 3. Skip favorites that can't be resolved from loaded data
 *
 * No API calls — works entirely from already-loaded walletMap data.
 */
export function usePinnedFavorites(
  favorites: FavoriteItem[] | undefined,
  activeWalletAddress: string | null,
  walletMap: Record<string, WalletData>,
): UsePinnedFavoritesResult {
  return useMemo(() => {
    if (!favorites || !activeWalletAddress) {
      return { pinnedItems: [], crossWalletCount: 0 };
    }

    // All NFT favorites are treated as pinned — no separate pin toggle needed
    const pinnedFavorites = favorites.filter(f => f.type === 'nft');
    if (pinnedFavorites.length === 0) {
      return { pinnedItems: [], crossWalletCount: 0 };
    }

    // Build a lookup: refId → NFT + wallet address, across all loaded wallets
    // Active wallet gets priority (checked first)
    const nftLookup = new Map<string, { nft: NFT; walletAddress: string }>();

    const activeKey = activeWalletAddress.toLowerCase();
    const walletEntries = Object.entries(walletMap);

    // Sort: active wallet first, then others
    walletEntries.sort(([a], [b]) => {
      if (a.toLowerCase() === activeKey) return -1;
      if (b.toLowerCase() === activeKey) return 1;
      return 0;
    });

    for (const [, walletData] of walletEntries) {
      const allNfts = [...walletData.avalanche.nfts, ...walletData.solana.nfts];
      for (const nft of allNfts) {
        if (!nft.contractAddress) continue;
        const refId = `${nft.contractAddress}:${nft.tokenId}`;
        // First match wins (active wallet has priority due to sort)
        if (!nftLookup.has(refId)) {
          nftLookup.set(refId, { nft, walletAddress: walletData.address });
        }
      }
    }

    // Resolve pinned favorites
    const pinnedItems: PinnedNFT[] = [];
    let crossWalletCount = 0;

    for (const fav of pinnedFavorites) {
      const match = nftLookup.get(fav.refId);
      if (!match) continue; // NFT not in any loaded wallet — skip silently

      const isCrossWallet = match.walletAddress.toLowerCase() !== activeKey;
      if (isCrossWallet) crossWalletCount++;

      pinnedItems.push({
        nft: match.nft,
        sourceWallet: match.walletAddress,
        isCrossWallet,
        favoriteId: fav.id,
      });
    }

    // Sort: active wallet items first, then cross-wallet
    pinnedItems.sort((a, b) => {
      if (a.isCrossWallet !== b.isCrossWallet) return a.isCrossWallet ? 1 : -1;
      return 0;
    });

    return { pinnedItems, crossWalletCount };
  }, [favorites, activeWalletAddress, walletMap]);
}
