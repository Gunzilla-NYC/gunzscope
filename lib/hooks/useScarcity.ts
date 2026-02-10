'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { ScarcityTraitStats, MarketplaceListing, ScarcityPageData } from '@/lib/types';

export type ScarcitySortField = 'listingCount' | 'floorPriceGun' | 'recentSales' | 'itemName';

type SortOrder = 'asc' | 'desc';

export interface TraitFilter {
  type: 'weapon' | 'quality';
  value: string;
}

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
  traitFilter: TraitFilter | null;
  setTraitFilter: (filter: TraitFilter | null) => void;
  resultCount: number;
  totalCount: number;
}

/** Returns "2m ago", "1h ago", "3d ago" etc. */
export function getRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function useScarcity(): UseScarcityResult {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [traitStats, setTraitStats] = useState<ScarcityTraitStats | null>(null);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Initialize from URL params
  const [sortField, setSortField] = useState<ScarcitySortField>(
    (searchParams.get('sort') as ScarcitySortField) || 'listingCount'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('order') as SortOrder) || 'asc'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [traitFilter, setTraitFilter] = useState<TraitFilter | null>(null);

  // Persist state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (sortField !== 'listingCount') params.set('sort', sortField);
    if (sortOrder !== 'asc') params.set('order', sortOrder);
    if (searchQuery) params.set('q', searchQuery);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '/scarcity', { scroll: false });
  }, [sortField, sortOrder, searchQuery, router]);

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
      filtered = filtered.filter((l) => l.itemName.toLowerCase().includes(q));
    }

    // Apply trait filter (name-based matching — listings don't carry structured trait fields)
    if (traitFilter) {
      const val = traitFilter.value.toLowerCase();
      filtered = filtered.filter((l) => l.itemName.toLowerCase().includes(val));
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
  }, [listings, sortField, sortOrder, searchQuery, traitFilter]);

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
    traitFilter,
    setTraitFilter,
    resultCount: sortedListings.length,
    totalCount: listings.length,
  };
}
