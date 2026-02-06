'use client';

import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useState, useCallback, useEffect } from 'react';

const SEARCH_COUNT_KEY = 'gs_search_count';
const LAST_SEARCH_KEY = 'gs_last_search';

/**
 * Manages search gating for anonymous users.
 * First search is free; subsequent searches require wallet connection.
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
    canSearch: isConnected || searchCount < 1,
    isGated: !isConnected && searchCount >= 1,
    incrementSearch,
    getLastSearchedAddress,
  };
}
