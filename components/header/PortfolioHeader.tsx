'use client';

import { useEffect, useMemo } from 'react';
import { WalletData } from '@/lib/types';
import { NetworkInfo } from '@/lib/utils/networkDetector';
import WalletIdentity from './WalletIdentity';
import PortfolioGlanceCard from './PortfolioGlanceCard';
import { addPortfolioSnapshot } from '@/lib/utils/portfolioHistory';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import { usePortfolioPnL } from '@/lib/hooks/usePortfolioPnL';

interface PortfolioHeaderProps {
  walletData: WalletData;
  gunPrice?: number;
  gunPriceChange24h?: number;
  gunPriceChangePercent24h?: number;
  networkInfo?: NetworkInfo | null;
  walletType?: 'in-game' | 'external' | 'unknown';
  totalOwnedCount?: number;
  portfolioResult?: PortfolioCalcResult | null;
}

export default function PortfolioHeader({
  walletData,
  gunPrice = 0,
  gunPriceChange24h = 0,
  gunPriceChangePercent24h = 0,
  networkInfo,
  walletType = 'unknown',
  totalOwnedCount,
  portfolioResult,
}: PortfolioHeaderProps) {
  // Derive display values from portfolioResult (single source of truth)
  // Falls back to legacy calculation if portfolioResult not provided
  const { totalTokenValue, breakdown, totalBalance } = useMemo(() => {
    if (portfolioResult) {
      // Use calcPortfolio result as single source of truth
      return {
        totalTokenValue: portfolioResult.totalUsd,
        totalBalance: portfolioResult.totalGunBalance,
        breakdown: {
          gunValue: portfolioResult.tokensUsd,
          nftValue: portfolioResult.nftsUsd,
          otherValue: 0,
          nftCount: portfolioResult.nftCount,
          totalGunSpent: portfolioResult.totalGunSpent,
        },
      };
    }

    // Legacy fallback (should not be reached when portfolioResult is provided)
    const avalancheBalance = walletData.avalanche.gunToken?.balance || 0;
    const solanaBalance = walletData.solana.gunToken?.balance || 0;
    const totalBal = avalancheBalance + solanaBalance;
    const gunValue = totalBal * gunPrice;

    // Calculate NFT value and total spent (from NFTs with purchase prices if available)
    let nftValue = 0;
    let totalGunSpent = 0;
    const allNFTs = [...walletData.avalanche.nfts, ...walletData.solana.nfts];
    allNFTs.forEach(nft => {
      if (nft.purchasePriceGun) {
        totalGunSpent += nft.purchasePriceGun * (nft.quantity || 1);
        if (gunPrice) {
          nftValue += nft.purchasePriceGun * gunPrice * (nft.quantity || 1);
        }
      }
    });

    // NFT count
    const avalancheNFTCount = totalOwnedCount ?? walletData.avalanche.nfts.reduce(
      (sum, nft) => sum + (nft.quantity || 1),
      0
    );
    const solanaNFTCount = walletData.solana.nfts.reduce(
      (sum, nft) => sum + (nft.quantity || 1),
      0
    );
    const totalNFTCount = avalancheNFTCount + solanaNFTCount;

    return {
      totalTokenValue: gunValue + nftValue,
      totalBalance: totalBal,
      breakdown: {
        gunValue,
        nftValue,
        otherValue: 0,
        nftCount: totalNFTCount,
        totalGunSpent,
      },
    };
  }, [walletData, gunPrice, totalOwnedCount, portfolioResult]);

  // Fetch P&L data (runs in background, doesn't block initial render)
  const { costBasis, isLoading: pnlLoading, coverage: pnlCoverage } = usePortfolioPnL(walletData.address, {
    enabled: !!walletData.address && totalTokenValue > 0,
  });

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
        <div className="lg:col-span-5 bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-4">
          <WalletIdentity
            address={walletData.address}
            networkInfo={networkInfo}
            walletType={walletType}
            lastUpdated={walletData.lastUpdated}
            gunBalance={totalBalance}
            gunValueUsd={breakdown.gunValue}
            gunPrice={gunPrice}
            gunPriceChange24h={gunPriceChange24h}
            gunPriceChangePercent24h={gunPriceChangePercent24h}
          />
        </div>

        {/* Zone B: Portfolio Glance (right) */}
        <div className="lg:col-span-7">
          <PortfolioGlanceCard
            address={walletData.address}
            totalValue={totalTokenValue}
            breakdown={breakdown}
            costBasis={costBasis ?? undefined}
            pnlLoading={pnlLoading}
          />
        </div>
      </div>
    </div>
  );
}
