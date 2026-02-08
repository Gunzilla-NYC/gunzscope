'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useState, useCallback, useEffect } from 'react';

const SEARCH_COUNT_KEY = 'gs_search_count';
const LAST_SEARCH_KEY = 'gs_last_search';
const FREE_SEARCH_LIMIT = 3;

/**
 * Manages search gating for anonymous users.
 * Users get 3 free searches per session; after that, wallet connection is required.
 * Uses sessionStorage so the count resets each browser session.
 */
export function useAccountGate() {
  const { primaryWallet } = useDynamicContext();
  const isConnected = !!primaryWallet;

  const [searchCount, setSearchCount] = useState(0);

  // Load persisted count on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(SEARCH_COUNT_KEY);
    if (stored) setSearchCount(parseInt(stored, 10));
  }, []);

  const incrementSearch = useCallback((address: string) => {
    setSearchCount(prev => {
      const next = prev + 1;
      sessionStorage.setItem(SEARCH_COUNT_KEY, String(next));
      return next;
    });
    sessionStorage.setItem(LAST_SEARCH_KEY, address);
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
