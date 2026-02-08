'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ScarcityTraitStats, MarketplaceListing, ScarcityPageData } from '@/lib/types';

export type ScarcitySortField = 'listingCount' | 'floorPriceGun' | 'recentSales' | 'itemName';

type SortOrder = 'asc' | 'desc';

export interface UseScarcityResult {
  traitStats: ScarcityTraitStats | null;
  listings: MarketplaceListing[];
  sortedListings: MarketplaceListing[];
  isLoading: boolean;
  error: string | null;
  sortField: ScarcitySortField;
  sortOrder: SortOrder;
  handleSort: (field: ScarcitySortField) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  lastUpdated: string | null;
  refetch: () => void;
}

export function useScarcity(): UseScarcityResult {
  const [traitStats, setTraitStats] = useState<ScarcityTraitStats | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<ScarcitySortField>('listingCount');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchScarcity = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/scarcity');
      if (!res.ok) throw new Error('Failed to fetch scarcity data');
      const data: ScarcityPageData = await res.json();
      setTraitStats(data.traitStats);
      setListings(data.listings);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScarcity();
  }, [fetchScarcity]);

  const handleSort = useCallback(
    (field: ScarcitySortField) => {
      if (field === sortField) {
        setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortField(field);
        // Default to ascending for listing count (rarest first), descending for others
        setSortOrder(field === 'listingCount' ? 'asc' : 'desc');
      }
    },
    [sortField]
  );

  const sortedListings = useMemo(() => {
    let filtered = listings;

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = listings.filter((l) => l.itemName.toLowerCase().includes(q));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'itemName') {
        const cmp = a.itemName.localeCompare(b.itemName);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      const aVal = a[sortField] ?? -Infinity;
      const bVal = b[sortField] ?? -Infinity;
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return sorted;
  }, [listings, sortField, sortOrder, searchQuery]);

  return {
    traitStats,
    listings,
    sortedListings,
    isLoading,
    error,
    sortField,
    sortOrder,
    handleSort,
    searchQuery,
    setSearchQuery,
    lastUpdated,
    refetch: fetchScarcity,
  };
}
