'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { LeaderboardEntry } from '@/lib/types';

export type SortField =
  | 'totalPortfolioUsd'
  | 'gunBalance'
  | 'nftCount'
  | 'unrealizedPnlUsd'
  | 'pnlPercentage';

type SortOrder = 'asc' | 'desc';

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  gunPriceUsd: number | null;
  totalWallets: number;
  isLoading: boolean;
  error: string | null;
  sortField: SortField;
  sortOrder: SortOrder;
  handleSort: (field: SortField) => void;
  sortedEntries: LeaderboardEntry[];
  refetch: () => void;
}

export function useLeaderboard(): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [gunPriceUsd, setGunPriceUsd] = useState<number | null>(null);
  const [totalWallets, setTotalWallets] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalPortfolioUsd');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const fetchLeaderboard = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      const data = await res.json();
      setEntries(data.entries);
      setGunPriceUsd(data.gunPriceUsd);
      setTotalWallets(data.totalWallets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleSort = useCallback(
    (field: SortField) => {
      if (field === sortField) {
        setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    },
    [sortField]
  );

  const sortedEntries = useMemo(() => {
    const sorted = [...entries].sort((a, b) => {
      const aVal = a[sortField] ?? -Infinity;
      const bVal = b[sortField] ?? -Infinity;
      return sortOrder === 'desc'
        ? (bVal as number) - (aVal as number)
        : (aVal as number) - (bVal as number);
    });
    return sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
  }, [entries, sortField, sortOrder]);

  return {
    entries,
    gunPriceUsd,
    totalWallets,
    isLoading,
    error,
    sortField,
    sortOrder,
    handleSort,
    sortedEntries,
    refetch: fetchLeaderboard,
  };
}
