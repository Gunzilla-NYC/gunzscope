'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CostBasis {
  tokens: number | null;
  nfts: number | null;
  total: number | null;
}

export interface UsePortfolioPnLResult {
  costBasis: CostBasis | null;
  isLoading: boolean;
  error: string | null;
  coverage: number;
  refetch: () => void;
}

interface UsePortfolioPnLOptions {
  enabled?: boolean;
}

export function usePortfolioPnL(
  address: string,
  options: UsePortfolioPnLOptions = {}
): UsePortfolioPnLResult {
  const { enabled = true } = options;

  const [costBasis, setCostBasis] = useState<CostBasis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coverage, setCoverage] = useState(0);

  const fetchPnL = useCallback(async () => {
    if (!address || !enabled) {
      setCostBasis(null);
      setIsLoading(false);
      setError(null);
      setCoverage(0);
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('Invalid wallet address format');
      setCostBasis(null);
      setIsLoading(false);
      setCoverage(0);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/portfolio/${address}/pnl`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Unknown API error');
      }

      const nftCostBasis = data.data.totalCostBasisUSD || 0;

      setCostBasis({
        tokens: null,
        nfts: nftCostBasis > 0 ? nftCostBasis : null,
        total: nftCostBasis > 0 ? nftCostBasis : null,
      });

      const { nftsWithCostBasis = 0, totalNFTs = 0 } = data.data;
      setCoverage(totalNFTs > 0 ? nftsWithCostBasis / totalNFTs : 0);

    } catch (err) {
      console.error('[usePortfolioPnL] Error fetching P&L:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch P&L data');
      setCostBasis(null);
      setCoverage(0);
    } finally {
      setIsLoading(false);
    }
  }, [address, enabled]);

  useEffect(() => {
    fetchPnL();
  }, [fetchPnL]);

  return {
    costBasis,
    isLoading,
    error,
    coverage,
    refetch: fetchPnL,
  };
}
