'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { MarketItemGroup, MarketListingsResponse } from '@/lib/types';

export type MarketSortField = 'listingCount' | 'floorPriceGun' | 'recentSales' | 'itemName';

type SortOrder = 'asc' | 'desc';

export interface UseMarketResult {
  items: MarketItemGroup[];
  filteredItems: MarketItemGroup[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortField: MarketSortField;
  sortOrder: SortOrder;
  handleSort: (field: MarketSortField) => void;
  selectedItem: MarketItemGroup | null;
  setSelectedItemName: (name: string | null) => void;
  gunPrice: number | null;
  refetch: () => void;
  totalListingCount: number;
  uniqueItemCount: number;
  suggestions: string[];
}

export function useMarket(): UseMarketResult {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<MarketItemGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalListingCount, setTotalListingCount] = useState(0);
  const [uniqueItemCount, setUniqueItemCount] = useState(0);
  const [gunPrice, setGunPrice] = useState<number | null>(null);

  // Initialize from URL params
  const [sortField, setSortField] = useState<MarketSortField>(
    (searchParams.get('sort') as MarketSortField) || 'floorPriceGun'
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    (searchParams.get('order') as SortOrder) || 'asc'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedItemName, setSelectedItemName] = useState<string | null>(
    searchParams.get('item') || null
  );

  // Persist state to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (sortField !== 'floorPriceGun') params.set('sort', sortField);
    if (sortOrder !== 'asc') params.set('order', sortOrder);
    if (searchQuery) params.set('q', searchQuery);
    if (selectedItemName) params.set('item', selectedItemName);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : '/market', { scroll: false });
  }, [sortField, sortOrder, searchQuery, selectedItemName, router]);

  // Fetch market data
  const fetchMarket = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/market/listings');
      if (!res.ok) throw new Error('Failed to fetch market data');
      const data: MarketListingsResponse = await res.json();
      setItems(data.items);
      setTotalListingCount(data.totalListingCount);
      setUniqueItemCount(data.uniqueItemCount);
      setLastUpdated(data.lastUpdated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch GUN price for USD conversion
  useEffect(() => {
    fetch('/api/price/gun')
      .then((res) => res.json())
      .then((data) => {
        if (data.price) setGunPrice(data.price);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchMarket();
  }, [fetchMarket]);

  const handleSort = useCallback(
    (field: MarketSortField) => {
      if (field === sortField) {
        setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      } else {
        setSortField(field);
        // Default: cheapest first for price, fewest first for listings, most for sales
        setSortOrder(field === 'floorPriceGun' || field === 'listingCount' ? 'asc' : 'desc');
      }
    },
    [sortField]
  );

  // Autocomplete suggestions
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    return items
      .filter((i) => i.itemName.toLowerCase().includes(q) && !i.itemName.startsWith('Token #'))
      .slice(0, 8)
      .map((i) => i.itemName);
  }, [items, searchQuery]);

  // Filter + sort
  const filteredItems = useMemo(() => {
    let filtered = items;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((i) => i.itemName.toLowerCase().includes(q));
    }

    // Only show items with active listings
    filtered = filtered.filter((i) => i.listingCount > 0);

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
  }, [items, sortField, sortOrder, searchQuery]);

  const selectedItem = useMemo(() => {
    if (!selectedItemName) return null;
    return items.find((i) => i.itemName === selectedItemName) ?? null;
  }, [items, selectedItemName]);

  return {
    items,
    filteredItems,
    isLoading,
    error,
    lastUpdated,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSort,
    selectedItem,
    setSelectedItemName,
    gunPrice,
    refetch: fetchMarket,
    totalListingCount,
    uniqueItemCount,
    suggestions,
  };
}
