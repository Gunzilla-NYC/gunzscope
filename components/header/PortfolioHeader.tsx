'use client';

import { useEffect, useMemo } from 'react';
import WalletIdentity from './WalletIdentity';
import { addPortfolioSnapshot } from '@/lib/utils/portfolioHistory';
import {
  usePortfolioWallet,
  usePortfolioGunPrice,
  usePortfolioResult,
  usePortfolioNFTs,
} from '@/lib/contexts/PortfolioContext';

/**
 * PortfolioHeader - Wallet identity bar + portfolio history snapshot tracking.
 * Uses PortfolioContext for data access.
 */
export default function PortfolioHeader() {
  // Get data from context
  const { walletData } = usePortfolioWallet();
  const { gunPrice = 0 } = usePortfolioGunPrice();
  const portfolioResult = usePortfolioResult();
  const { allNfts } = usePortfolioNFTs();

  // Calculate total value for history tracking
  // Must be called unconditionally (React hooks rules)
  const totalTokenValue = useMemo(() => {
    if (!walletData) return 0;

    if (portfolioResult) {
      return portfolioResult.totalUsd;
    }

    // Legacy fallback
    const avalancheBalance = walletData.avalanche.gunToken?.balance || 0;
    const solanaBalance = walletData.solana.gunToken?.balance || 0;
    const totalBal = avalancheBalance + solanaBalance;
    const gunVal = totalBal * (gunPrice || 0);

    // Calculate NFT value for total
    let nftValue = 0;
    allNfts.forEach(nft => {
      if (nft.purchasePriceGun && gunPrice) {
        nftValue += nft.purchasePriceGun * gunPrice * (nft.quantity || 1);
      }
    });

    return gunVal + nftValue;
  }, [walletData, gunPrice, portfolioResult, allNfts]);

  // Add portfolio snapshot for history tracking
  // Must be called unconditionally (React hooks rules)
  useEffect(() => {
    if (walletData?.address && totalTokenValue > 0) {
      addPortfolioSnapshot(walletData.address, totalTokenValue);
    }
  }, [walletData?.address, totalTokenValue]);

  // Early return if no wallet data (after all hooks)
  if (!walletData) return null;

  return (
    <div
      className="relative bg-[var(--gs-dark-2)] border border-white/[0.06] px-4 py-2.5 overflow-hidden"
      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />
      <WalletIdentity />
    </div>
  );
}
