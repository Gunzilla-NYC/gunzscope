import { useRef, useEffect } from 'react';
import type { WalletData } from '@/lib/types';
import type { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';

/**
 * Records a portfolio snapshot for site-wide NFT tracking.
 * Fires once per wallet address when portfolio data is stable
 * (not loading, not enriching).
 */
export function usePortfolioSnapshot(
  walletData: WalletData | null,
  portfolioResult: PortfolioCalcResult | null,
  loading: boolean,
  isEnriching: boolean,
  gunPrice: number | undefined,
): void {
  const lastSnapshotAddressRef = useRef<string | null>(null);

  useEffect(() => {
    if (!walletData || !portfolioResult) return;
    if (loading || isEnriching) return; // Wait for data to stabilize
    if (lastSnapshotAddressRef.current === walletData.address) return; // Already recorded
    if (portfolioResult.nftCount === 0) return;

    lastSnapshotAddressRef.current = walletData.address;

    // Calculate current NFT value based on floor prices
    const allNFTs = [...walletData.avalanche.nfts, ...walletData.solana.nfts];
    const nftValueGun = allNFTs.reduce((sum, nft) => {
      const quantity = nft.quantity ?? 1;
      const floorPrice = nft.floorPrice ?? 0;
      return sum + (floorPrice * quantity);
    }, 0);

    // Fire and forget - don't block UI
    fetch('/api/portfolio/snapshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: walletData.address,
        chain: 'avalanche',
        nftCount: portfolioResult.nftCount,
        nftsWithPrice: portfolioResult.nftsWithPrice,
        gunBalance: portfolioResult.totalGunBalance,
        totalGunSpent: portfolioResult.totalGunSpent,
        gunPriceUsd: gunPrice || 0,
        nftValueGun,
      }),
    }).catch((err) => {
      console.warn('[Snapshot] Failed to record portfolio snapshot:', err);
    });
  }, [walletData, portfolioResult, loading, isEnriching, gunPrice]);
}
