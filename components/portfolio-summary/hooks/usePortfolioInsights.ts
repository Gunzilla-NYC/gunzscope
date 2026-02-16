import { useMemo } from 'react';
import { NFT } from '@/lib/types';
import { generateInsights, PortfolioInsight } from '@/lib/portfolio/portfolioInsights';

export function usePortfolioInsights(
  nfts: NFT[],
  gunPrice: number | undefined,
  nftsWithCost: number,
  totalItems: number,
): PortfolioInsight[] {
  return useMemo(() => {
    const coverageRatio = totalItems > 0 ? nftsWithCost / totalItems : 0;
    if (coverageRatio < 0.3) return [];
    return generateInsights(nfts, gunPrice);
  }, [nfts, gunPrice, nftsWithCost, totalItems]);
}
