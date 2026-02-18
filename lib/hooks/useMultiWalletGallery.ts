import { useState, useMemo, useCallback } from 'react';
import type { WalletData, NFT } from '@/lib/types';

/**
 * Manages per-wallet NFT filtering for the gallery when multiple wallets
 * are aggregated. Provides wallet-specific NFT sets and a gallery switch handler.
 */
export function useMultiWalletGallery(
  primaryWalletData: WalletData | null,
  portfolioWalletsData: WalletData[],
  allNfts: NFT[],
) {
  const [activeGalleryWallet, setActiveGalleryWallet] = useState<string | null>(null);

  // Per-wallet token key sets — used to filter allNfts for gallery view
  const walletNftKeys = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const addWallet = (wd: WalletData) => {
      const keys = new Set(wd.avalanche.nfts.map(n => n.tokenIds?.[0] || n.tokenId));
      map.set(wd.address.toLowerCase(), keys);
    };
    if (primaryWalletData) addWallet(primaryWalletData);
    portfolioWalletsData.forEach(addWallet);
    return map;
  }, [primaryWalletData, portfolioWalletsData]);

  // NFTs for the gallery — filtered to the active wallet when multiple wallets exist
  const galleryNfts = useMemo(() => {
    const target = activeGalleryWallet?.toLowerCase();
    if (!target || walletNftKeys.size <= 1) return allNfts;
    const keys = walletNftKeys.get(target);
    if (!keys) return allNfts;
    return allNfts.filter(nft => keys.has(nft.tokenIds?.[0] || nft.tokenId));
  }, [allNfts, activeGalleryWallet, walletNftKeys]);

  // Lightweight gallery switch — changes which wallet's NFTs are shown
  const handleGallerySwitch = useCallback((address: string) => {
    setActiveGalleryWallet(address);
  }, []);

  return {
    activeGalleryWallet,
    setActiveGalleryWallet,
    walletNftKeys,
    galleryNfts,
    handleGallerySwitch,
  };
}
