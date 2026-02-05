'use client';

import { useEffect, useMemo } from 'react';
import WalletIdentity from './WalletIdentity';
import PortfolioGlanceCard from './PortfolioGlanceCard';
import { addPortfolioSnapshot } from '@/lib/utils/portfolioHistory';
import {
  usePortfolioWallet,
  usePortfolioGunPrice,
  usePortfolioResult,
  usePortfolioNFTs,
} from '@/lib/contexts/PortfolioContext';

/**
 * PortfolioHeader - Main header component for portfolio view.
 * Uses PortfolioContext for data access. P&L data is owned by PortfolioGlanceCard.
 */
export default function PortfolioHeader() {
  // Get data from context
  const { walletData } = usePortfolioWallet();
  const { gunPrice = 0 } = usePortfolioGunPrice();
  const portfolioResult = usePortfolioResult();
  const { allNfts } = usePortfolioNFTs();

  // Early return if no wallet data
  if (!walletData) return null;

  // Calculate total value for history tracking
  const totalTokenValue = useMemo(() => {
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
  useEffect(() => {
    if (walletData.address && totalTokenValue > 0) {
      addPortfolioSnapshot(walletData.address, totalTokenValue);
    }
  }, [walletData.address, totalTokenValue]);

  return (
    <div className="space-y-4">
      {/* Main Header Grid: 2 zones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Zone A: Wallet Identity with GUN balance (left) */}
        <div
          className="lg:col-span-5 relative bg-[var(--gs-dark-2)] border border-white/[0.06] p-4 overflow-hidden"
          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />
          <WalletIdentity />
        </div>

        {/* Zone B: Portfolio Glance (right) - uses context directly */}
        <div
          className="lg:col-span-7 relative bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden"
          style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />
          <PortfolioGlanceCard />
        </div>
      </div>
    </div>
  );
}
