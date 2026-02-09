'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useState, useCallback, useEffect } from 'react';

const SEARCH_COUNT_KEY = 'gs_search_count';
const SEARCHED_ADDRS_KEY = 'gs_searched_addrs';
const LAST_SEARCH_KEY = 'gs_last_search';
const FREE_SEARCH_LIMIT = 3;

/**
 * Manages search gating for anonymous users.
 * Users get 3 free unique-address searches per session; revisiting the same
 * address does not consume a search. Uses sessionStorage so counts reset
 * each browser session.
 */
export function useAccountGate() {
  const { primaryWallet, user } = useDynamicContext();
  const isConnected = !!primaryWallet || !!user;

  const [searchCount, setSearchCount] = useState(0);

  // Load persisted count on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(SEARCH_COUNT_KEY);
    if (stored) setSearchCount(parseInt(stored, 10));
  }, []);

  const incrementSearch = useCallback((address: string) => {
    const normalised = address.toLowerCase();

    // Load previously searched addresses
    let searched: string[] = [];
    try {
      const raw = sessionStorage.getItem(SEARCHED_ADDRS_KEY);
      if (raw) searched = JSON.parse(raw);
    } catch { /* ignore */ }

    // Don't count revisits to the same address
    if (searched.includes(normalised)) {
      sessionStorage.setItem(LAST_SEARCH_KEY, address);
      return;
    }

    // New unique address — increment count
    searched.push(normalised);
    sessionStorage.setItem(SEARCHED_ADDRS_KEY, JSON.stringify(searched));
    sessionStorage.setItem(LAST_SEARCH_KEY, address);

    setSearchCount(prev => {
      const next = prev + 1;
      sessionStorage.setItem(SEARCH_COUNT_KEY, String(next));
      return next;
    });
  }, []);

  const getLastSearchedAddress = useCallback((): string | null => {
    return sessionStorage.getItem(LAST_SEARCH_KEY);
  }, []);

  return {
    isConnected,
    searchCount,
    canSearch: isConnected || searchCount < FREE_SEARCH_LIMIT,
    isGated: !isConnected && searchCount >= FREE_SEARCH_LIMIT,
    isSoftNudge: !isConnected && searchCount >= 1 && searchCount < FREE_SEARCH_LIMIT,
    remainingSearches: Math.max(0, FREE_SEARCH_LIMIT - searchCount),
    incrementSearch,
    getLastSearchedAddress,
  };
}
