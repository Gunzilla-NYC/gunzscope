'use client';

import { useEffect, useMemo } from 'react';
import WalletIdentity from './WalletIdentity';
import { addPortfolioSnapshot } from '@/lib/utils/portfolioHistory';
import {
  usePortfolioWallet,
  usePortfolioResult,
  usePortfolioNFTs,
} from '@/lib/contexts/PortfolioContext';
import { PortfolioAddress } from '@/lib/hooks/useUserProfile';

/**
 * PortfolioHeader - Wallet identity bar + portfolio history snapshot tracking.
 * Uses PortfolioContext for data access.
 *
 * Hides entirely when WalletIdentity would render in "hidden" mode
 * (own wallet, no portfolio addresses, authenticated).
 */
interface PortfolioHeaderProps {
  portfolioAddresses?: PortfolioAddress[];
  aggregatedAddresses?: string[];
  primaryWalletAddress?: string | null;
  isAuthenticated?: boolean;
  onSwitchWallet?: (address: string) => void;
  onBackToOwnWallet?: () => void;
}

export default function PortfolioHeader({
  portfolioAddresses = [],
  aggregatedAddresses = [],
  primaryWalletAddress,
  isAuthenticated = false,
  onSwitchWallet,
  onBackToOwnWallet,
}: PortfolioHeaderProps = {}) {
  // Get data from context
  const { walletData } = usePortfolioWallet();
  const portfolioResult = usePortfolioResult();
  const { allNfts, isEnriching, enrichmentProgress } = usePortfolioNFTs();

  // Total value and NFT count for history tracking.
  // Prefer market value (listing > floor > cost) when available, fall back to cost basis.
  const totalTokenValue = portfolioResult?.totalMarketValueUsd ?? portfolioResult?.totalUsd ?? 0;
  const nftCount = portfolioResult?.nftCount ?? allNfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);

  // Only record snapshots once enrichment is complete to avoid storing partial
  // values that make the sparkline jump up and down across page reloads.
  const enrichmentDone = !isEnriching && enrichmentProgress != null && enrichmentProgress.total > 0;

  useEffect(() => {
    if (walletData?.address && totalTokenValue > 0 && enrichmentDone) {
      addPortfolioSnapshot(walletData.address, totalTokenValue, nftCount);
    }
  }, [walletData?.address, totalTokenValue, nftCount, enrichmentDone]);

  // Determine if WalletIdentity would render in "hidden" mode
  const isOwnWallet = useMemo(() => {
    if (!walletData?.address || !primaryWalletAddress) return false;
    const viewed = walletData.address.toLowerCase();
    const primary = primaryWalletAddress.toLowerCase();
    if (viewed === primary) return true;
    return aggregatedAddresses.some(a => a.toLowerCase() === viewed);
  }, [walletData?.address, primaryWalletAddress, aggregatedAddresses]);

  const shouldHide = !walletData || (isOwnWallet && portfolioAddresses.length === 0 && isAuthenticated);

  // Early return if no wallet data or hidden mode
  if (shouldHide) return null;

  return (
    <div
      className="relative bg-[var(--gs-dark-2)] border border-white/[0.06] px-4 py-2.5 overflow-hidden"
      style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />
      <WalletIdentity
        portfolioAddresses={portfolioAddresses}
        aggregatedAddresses={aggregatedAddresses}
        primaryWalletAddress={primaryWalletAddress}
        isAuthenticated={isAuthenticated}
        onSwitchWallet={onSwitchWallet}
        onBackToOwnWallet={onBackToOwnWallet}
      />
    </div>
  );
}
