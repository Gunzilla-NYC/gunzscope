'use client';

import { useEffect, useMemo, useRef } from 'react';
import WalletIdentity from './WalletIdentity';
import { addPortfolioSnapshot } from '@/lib/utils/portfolioHistory';
import {
  usePortfolioWallet,
  usePortfolioResult,
  usePortfolioNFTs,
  usePortfolioIdentity,
} from '@/lib/contexts/PortfolioContext';
import { useSlidePanelContext } from '@/lib/contexts/SlidePanelContext';

/**
 * PortfolioHeader - Wallet identity bar + portfolio history snapshot tracking.
 * Uses PortfolioContext for all data and actions (no props needed).
 *
 * Hides entirely when WalletIdentity would render in "hidden" mode
 * (own wallet, no portfolio addresses, authenticated).
 */
export default function PortfolioHeader() {
  // Get data from context
  const { walletData } = usePortfolioWallet();
  const portfolioResult = usePortfolioResult();
  const { allNfts, isEnriching, enrichmentProgress } = usePortfolioNFTs();
  const {
    portfolioAddresses,
    allWalletAddresses,
    primaryWalletAddress,
    isAuthenticated,
  } = usePortfolioIdentity();

  // Total value and NFT count for history tracking.
  // Prefer market value (listing > floor > cost) when available, fall back to cost basis.
  const totalTokenValue = portfolioResult?.totalMarketValueUsd ?? portfolioResult?.totalUsd ?? 0;
  const costBasis = portfolioResult?.totalUsd ?? 0;
  const nftCount = portfolioResult?.nftCount ?? allNfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);

  // Only record snapshots once enrichment is complete to avoid storing partial
  // values that make the sparkline jump up and down across page reloads.
  const enrichmentDone = !isEnriching && enrichmentProgress != null && enrichmentProgress.total > 0;

  useEffect(() => {
    if (walletData?.address && totalTokenValue > 0 && enrichmentDone) {
      addPortfolioSnapshot(walletData.address, totalTokenValue, nftCount, costBasis > 0 ? costBasis : undefined);
    }
  }, [walletData?.address, totalTokenValue, nftCount, costBasis, enrichmentDone]);

  // Register the panel slot div with SlidePanelContext so child
  // components (WalletIdentity, ShareDropdown) can portal drop-panels into it.
  const panelSlotRef = useRef<HTMLDivElement>(null);
  const panelCtx = useSlidePanelContext();

  useEffect(() => {
    if (panelCtx?.setPanelSlotNode) {
      panelCtx.setPanelSlotNode(panelSlotRef.current);
      return () => panelCtx.setPanelSlotNode(null);
    }
  }, [panelCtx?.setPanelSlotNode]);

  // Determine if WalletIdentity would render in "hidden" mode
  const isOwnWallet = useMemo(() => {
    if (!walletData?.address || !primaryWalletAddress) return false;
    const viewed = walletData.address.toLowerCase();
    const primary = primaryWalletAddress.toLowerCase();
    if (viewed === primary) return true;
    return allWalletAddresses.some(a => a.toLowerCase() === viewed);
  }, [walletData?.address, primaryWalletAddress, allWalletAddresses]);

  const shouldHide = !walletData || (isOwnWallet && portfolioAddresses.length === 0 && isAuthenticated);

  // Early return if no wallet data or hidden mode
  if (shouldHide) return null;

  return (
    <div className="relative z-10">
      {/* Visual header bar */}
      <div
        className="relative bg-[var(--gs-dark-2)] border border-white/[0.06] px-6 py-2.5 overflow-hidden"
        style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
      >
        <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40" aria-hidden="true" />
        <WalletIdentity />
      </div>
      {/* Panel slot: drop-down panels portal into this div */}
      <div ref={panelSlotRef} />
    </div>
  );
}
