import { useMemo } from 'react';
import { NFT } from '@/lib/types';
import { PortfolioCalcResult } from '@/lib/portfolio/calcPortfolio';
import {
  calculatePortfolioChanges,
  getSparklineValues,
  getSparklineCostBasis,
  getSparklineNftCounts,
  getSparklineSpanDays,
  PortfolioChanges,
} from '@/lib/utils/portfolioHistory';
import { formatChangeDisplay } from '../utils';
import { ChangeDisplay } from '../types';

interface PortfolioPerformanceResult {
  change7d: ChangeDisplay;
  changePercent7d: ChangeDisplay;
  sparklineValues: number[];
  costBasisSparkline: (number | null)[];
  sparklineSpanDays: number;
  nftCountHistory: (number | null)[];
}

export function usePortfolioPerformance(
  portfolioResult: PortfolioCalcResult | null,
  gunPrice: number | undefined,
  walletAddress: string | undefined,
  nfts: NFT[],
  gunPriceSparkline?: number[],
): PortfolioPerformanceResult {
  // Use market value (same as header display) — NOT cost basis (totalUsd)
  const totalValue = portfolioResult?.totalMarketValueUsd ?? portfolioResult?.totalUsd ?? 0;

  const portfolioChanges = useMemo<PortfolioChanges>(() => {
    if (!walletAddress) return { change24h: null, changePercent24h: null, change7d: null, changePercent7d: null, hasEnoughData: false };
    const real = calculatePortfolioChanges(walletAddress, totalValue);
    if (real.hasEnoughData) return real;

    if (gunPriceSparkline && gunPriceSparkline.length >= 24 && gunPrice && gunPrice > 0 && totalValue > 0) {
      const holdingsMultiplier = totalValue / gunPrice;
      const len = gunPriceSparkline.length;
      const idx24h = Math.max(0, Math.round(len - len / 7));
      const val24hAgo = gunPriceSparkline[idx24h] * holdingsMultiplier;
      const val7dAgo = gunPriceSparkline[0] * holdingsMultiplier;

      return {
        change24h: val24hAgo > 0 ? totalValue - val24hAgo : null,
        changePercent24h: val24hAgo > 0 ? ((totalValue - val24hAgo) / val24hAgo) * 100 : null,
        change7d: val7dAgo > 0 ? totalValue - val7dAgo : null,
        changePercent7d: val7dAgo > 0 ? ((totalValue - val7dAgo) / val7dAgo) * 100 : null,
        hasEnoughData: val24hAgo > 0,
      };
    }

    return real;
  }, [walletAddress, totalValue, gunPriceSparkline, gunPrice]);

  const historySparkline = useMemo(() => {
    if (!walletAddress) return [];
    return getSparklineValues(walletAddress, 90);
  }, [walletAddress]);

  const sparklineValues = useMemo(() => {
    if (historySparkline.length >= 2) {
      // Always pin the final point to the current live value so the
      // sparkline ends at the same number the header displays.
      if (totalValue > 0) {
        const pinned = [...historySparkline];
        pinned[pinned.length - 1] = totalValue;
        return pinned;
      }
      return historySparkline;
    }
    if (gunPriceSparkline && gunPriceSparkline.length >= 2 && gunPrice && gunPrice > 0 && totalValue > 0) {
      const holdingsMultiplier = totalValue / gunPrice;
      const src = gunPriceSparkline;
      const count = Math.min(90, src.length);
      const result: number[] = [];
      for (let i = 0; i < count; i++) {
        const srcIdx = Math.round((i / (count - 1)) * (src.length - 1));
        result.push(src[srcIdx] * holdingsMultiplier);
      }
      return result;
    }
    return historySparkline;
  }, [historySparkline, gunPriceSparkline, gunPrice, totalValue]);

  const costBasis = portfolioResult?.totalUsd ?? 0;

  const costBasisSparkline = useMemo((): (number | null)[] => {
    if (!walletAddress) return [];
    const history = getSparklineCostBasis(walletAddress, 90);
    // If we have history with cb data, pin the final point to current cost basis
    if (history.length >= 2 && history.some(v => v !== null)) {
      if (costBasis > 0) {
        const pinned = [...history];
        pinned[pinned.length - 1] = costBasis;
        return pinned;
      }
      return history;
    }
    // Fallback: derive from GUN sparkline
    if (gunPriceSparkline && gunPriceSparkline.length >= 2 && gunPrice && gunPrice > 0 && costBasis > 0) {
      const cbMultiplier = costBasis / gunPrice;
      const src = gunPriceSparkline;
      const count = Math.min(90, src.length);
      const result: (number | null)[] = [];
      for (let i = 0; i < count; i++) {
        const srcIdx = Math.round((i / (count - 1)) * (src.length - 1));
        result.push(src[srcIdx] * cbMultiplier);
      }
      return result;
    }
    return history;
  }, [walletAddress, gunPriceSparkline, gunPrice, costBasis]);

  const nftCountHistory = useMemo(() => {
    if (!walletAddress) return [];
    const history = getSparklineNftCounts(walletAddress, 90);
    if (history.length < 2 && sparklineValues.length >= 2) {
      const nftC = portfolioResult?.nftCount ?? nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0);
      return sparklineValues.map(() => nftC);
    }
    return history;
  }, [walletAddress, sparklineValues, portfolioResult?.nftCount, nfts]);

  const sparklineSpanDays = useMemo(() => {
    if (!walletAddress) return 0;
    const historyDays = getSparklineSpanDays(walletAddress);
    if (historyDays === 0 && sparklineValues.length >= 2) return 14;
    return historyDays;
  }, [walletAddress, sparklineValues]);

  const change7d = formatChangeDisplay(portfolioChanges.change7d);
  const changePercent7d = formatChangeDisplay(portfolioChanges.changePercent7d, true);

  return { change7d, changePercent7d, sparklineValues, costBasisSparkline, sparklineSpanDays, nftCountHistory };
}
