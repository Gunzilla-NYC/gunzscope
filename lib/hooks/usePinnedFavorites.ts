/**
 * Cross-Wallet Pinned Favorites Hook
 *
 * Resolves pinned favorite NFTs from all loaded wallets in walletMap,
 * not just the active wallet. Returns fully renderable NFT objects
 * with source wallet metadata.
 */

'use client';

import { useMemo, useRef } from 'react';
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
  // Cache previously resolved full NFTs so we don't downgrade to stubs
  // when walletMap temporarily loses a wallet during re-fetch
  const resolvedCacheRef = useRef<Map<string, { nft: NFT; walletAddress: string }>>(new Map());

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

    // Resolve pinned favorites — full data from walletMap, or stub from metadata
    const pinnedItems: PinnedNFT[] = [];
    let crossWalletCount = 0;

    for (const fav of pinnedFavorites) {
      const match = nftLookup.get(fav.refId);

      if (match) {
        // Full NFT data available from a loaded wallet — cache it
        resolvedCacheRef.current.set(fav.refId, match);
        const isCrossWallet = match.walletAddress.toLowerCase() !== activeKey;
        if (isCrossWallet) crossWalletCount++;

        pinnedItems.push({
          nft: match.nft,
          sourceWallet: match.walletAddress,
          isCrossWallet,
          favoriteId: fav.id,
        });
      } else if (resolvedCacheRef.current.has(fav.refId)) {
        // WalletMap temporarily lost this wallet — use previously resolved data
        const cached = resolvedCacheRef.current.get(fav.refId)!;
        const isCrossWallet = cached.walletAddress.toLowerCase() !== activeKey;
        if (isCrossWallet) crossWalletCount++;

        pinnedItems.push({
          nft: cached.nft,
          sourceWallet: cached.walletAddress,
          isCrossWallet,
          favoriteId: fav.id,
        });
      } else if (fav.metadata) {
        // Wallet not loaded yet — build stub from stored metadata for instant display.
        // Will upgrade to full data when walletMap updates (portfolio merge).
        const [contract, tokenId] = fav.refId.split(':');
        if (!contract || !tokenId) continue;

        const stubNft: NFT = {
          tokenId,
          name: (fav.metadata.name as string) || 'Loading...',
          image: (fav.metadata.image as string) || '',
          collection: (fav.metadata.collection as string) || 'Off The Grid',
          contractAddress: contract,
          chain: 'avalanche',
          ...(fav.metadata.quantity ? { quantity: fav.metadata.quantity as number } : {}),
          ...(fav.metadata.mintNumber ? { mintNumber: fav.metadata.mintNumber as string } : {}),
          ...(fav.metadata.mintNumbers ? { mintNumbers: fav.metadata.mintNumbers as string[] } : {}),
          ...(fav.metadata.groupedRarities ? { groupedRarities: fav.metadata.groupedRarities as string[] } : {}),
          ...(fav.metadata.traits ? { traits: fav.metadata.traits as Record<string, string> } : {}),
        };

        // Use stored wallet address from metadata if available
        const storedWallet = (fav.metadata.walletAddress as string) || 'unknown';
        const isCross = storedWallet === 'unknown' || storedWallet.toLowerCase() !== activeKey;
        if (isCross) crossWalletCount++;

        pinnedItems.push({
          nft: stubNft,
          sourceWallet: storedWallet,
          isCrossWallet: isCross,
          favoriteId: fav.id,
        });
      }
    }

    // Sort: active wallet items first, then cross-wallet
    pinnedItems.sort((a, b) => {
      if (a.isCrossWallet !== b.isCrossWallet) return a.isCrossWallet ? 1 : -1;
      return 0;
    });

    return { pinnedItems, crossWalletCount };
  }, [favorites, activeWalletAddress, walletMap]);
}
