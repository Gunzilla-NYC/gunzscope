'use client';

import useSWR from 'swr';

// =============================================================================
// Types
// =============================================================================

export interface UseGunPriceResult {
  gunPrice: number | null;
  timestamp: Date | null;
  source: string | null;
}

// =============================================================================
// Fetcher
// =============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for fetching the current GUN/USD price.
 * Uses SWR for automatic deduplication, caching, and revalidation.
 * Fetches when `enabled` is true.
 */
export function useGunPrice(enabled: boolean): UseGunPriceResult {
  const { data } = useSWR(
    enabled ? '/api/price/gun' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 60s dedup window
    }
  );

  if (data?.gunTokenPrice) {
    return {
      gunPrice: data.gunTokenPrice,
      timestamp: data.timestamp ? new Date(data.timestamp) : null,
      source: data.source ?? null,
    };
  }

  return { gunPrice: null, timestamp: null, source: null };
}
