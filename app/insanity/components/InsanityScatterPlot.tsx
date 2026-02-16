'use client';

import dynamic from 'next/dynamic';
import { NFT } from '@/lib/types';

const PnLScatterPlot = dynamic(() => import('@/components/charts/PnLScatterPlot'), { ssr: false });
import type { NftPnL } from '@/components/portfolio-summary/types';

interface InsanityScatterPlotProps {
  nfts: NFT[];
  gunPrice: number | undefined;
  nftPnL: NftPnL;
  isInitializing: boolean;
}

export function InsanityScatterPlot({ nfts, gunPrice, nftPnL, isInitializing }: InsanityScatterPlotProps) {
  if (isInitializing || nftPnL.nftsWithCost <= 0) return null;

  return <PnLScatterPlot nfts={nfts} gunPrice={gunPrice} />;
}
