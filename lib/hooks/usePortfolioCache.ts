'use client';

import { useState, useCallback, useRef } from 'react';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';
import { WalletData } from '@/lib/types';

interface CachedPortfolio {
  walletData: WalletData;
  gunPrice: number | null;
  savedAt: Date;
}

const SAVE_DEBOUNCE_MS = 30_000; // Don't save more than once per 30s

/**
 * Server-side portfolio cache for instant portfolio hydration on page reload.
 * Only works for authenticated users — anonymous users get null from loadCache.
 */
export function usePortfolioCache() {
  const [cachedAt, setCachedAt] = useState<Date | null>(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);
  const lastSaveRef = useRef<number>(0);

  const loadCache = useCallback(async (address: string): Promise<CachedPortfolio | null> => {
    const token = getAuthToken();
    if (!token) return null;

    try {
      const res = await fetch(
        `/api/portfolio/cache?address=${encodeURIComponent(address.toLowerCase())}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) return null;

      const data = await res.json();
      const walletData: WalletData = JSON.parse(data.walletBlob);

      // Restore Date objects lost in JSON serialization
      walletData.lastUpdated = new Date(walletData.lastUpdated);

      const savedAt = new Date(data.savedAt);
      setCachedAt(savedAt);

      return {
        walletData,
        gunPrice: data.gunPrice ?? null,
        savedAt,
      };
    } catch {
      return null;
    }
  }, []);

  const saveCache = useCallback(async (
    address: string,
    walletData: WalletData,
    gunPrice?: number,
  ): Promise<void> => {
    const token = getAuthToken();
    if (!token) return;

    // Debounce: skip if last save was too recent
    const now = Date.now();
    if (now - lastSaveRef.current < SAVE_DEBOUNCE_MS) return;
    lastSaveRef.current = now;

    const nftCount =
      walletData.avalanche.nfts.length + walletData.solana.nfts.length;

    try {
      await fetch('/api/portfolio/cache', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address: address.toLowerCase(),
          walletBlob: JSON.stringify(walletData),
          gunPrice: gunPrice ?? null,
          nftCount,
        }),
      });
    } catch {
      // Fire-and-forget — don't surface save errors
    }
  }, []);

  return {
    loadCache,
    saveCache,
    cachedAt,
    loadedFromCache,
    setLoadedFromCache,
  };
}
