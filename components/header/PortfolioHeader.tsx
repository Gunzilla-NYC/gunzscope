'use client';

import { useEffect, useMemo } from 'react';
import { WalletData } from '@/lib/types';
import { NetworkInfo } from '@/lib/utils/networkDetector';
import WalletIdentity from './WalletIdentity';
import PortfolioGlanceCard from './PortfolioGlanceCard';
import GunCard from './GunCard';
import { addPortfolioSnapshot } from '@/lib/utils/portfolioHistory';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';

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
        },
      };
    }

    // Legacy fallback (should not be reached when portfolioResult is provided)
    const avalancheBalance = walletData.avalanche.gunToken?.balance || 0;
    const solanaBalance = walletData.solana.gunToken?.balance || 0;
    const totalBal = avalancheBalance + solanaBalance;
    const gunValue = totalBal * gunPrice;

    // Calculate NFT value (from NFTs with purchase prices if available)
    let nftValue = 0;
    const allNFTs = [...walletData.avalanche.nfts, ...walletData.solana.nfts];
    allNFTs.forEach(nft => {
      if (nft.purchasePriceGun && gunPrice) {
        nftValue += nft.purchasePriceGun * gunPrice * (nft.quantity || 1);
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
      },
    };
  }, [walletData, gunPrice, totalOwnedCount, portfolioResult]);

  // Add portfolio snapshot for history tracking
  useEffect(() => {
    if (walletData.address && totalTokenValue > 0) {
      addPortfolioSnapshot(walletData.address, totalTokenValue);
    }
  }, [walletData.address, totalTokenValue]);

  return (
    <div className="space-y-4">
      {/* Main Header Grid: 3 zones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Zone A: Wallet Identity (left) */}
        <div className="lg:col-span-4 bg-white/[0.03] backdrop-blur-sm border border-white/10 rounded-2xl p-4">
          <WalletIdentity
            address={walletData.address}
            networkInfo={networkInfo}
            walletType={walletType}
            lastUpdated={walletData.lastUpdated}
            gunBalance={totalBalance}
            gunValueUsd={breakdown.gunValue}
            gunPrice={gunPrice}
          />
        </div>

        {/* Zone B: Portfolio Glance (center/main) */}
        <div className="lg:col-span-5">
          <PortfolioGlanceCard
            address={walletData.address}
            totalValue={totalTokenValue}
            breakdown={breakdown}
          />
        </div>

        {/* Zone C: GUN Module (right) */}
        <div className="lg:col-span-3">
          <GunCard
            price={gunPrice}
            priceChange24h={gunPriceChange24h}
            priceChangePercent24h={gunPriceChangePercent24h}
            balance={totalBalance}
          />
        </div>
      </div>

      {/* NFT Holdings strip - upgraded layout */}
      {breakdown.nftCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] border border-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            {/* NFT icon */}
            <div className="w-8 h-8 rounded-lg bg-[#96aaff]/10 border border-[#96aaff]/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#96aaff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            {/* Two-line mini summary */}
            <div>
              <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium block">
                NFT Holdings
              </span>
              <span className="text-[14px] font-semibold text-white/85">
                {breakdown.nftCount} {breakdown.nftCount === 1 ? 'Item' : 'Items'}
              </span>
            </div>
          </div>
          {/* Right side - unpriced notice or value */}
          <div className="text-right">
            {breakdown.nftValue > 0 ? (
              <>
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/50 font-medium block">
                  Est. Value
                </span>
                <span className="text-[14px] font-semibold text-[#96aaff]">
                  ${breakdown.nftValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </>
            ) : (
              <span className="text-[12px] text-white/40 italic">
                Unpriced
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
