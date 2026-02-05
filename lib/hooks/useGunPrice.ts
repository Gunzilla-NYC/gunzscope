'use client';

import { useState, useEffect, useRef } from 'react';
import { CoinGeckoService } from '@/lib/api/coingecko';

// =============================================================================
// Types
// =============================================================================

export interface UseGunPriceResult {
  gunPrice: number | null;
  timestamp: Date | null;
  source: string | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for fetching the current GUN/USD price.
 * Fetches when `enabled` transitions to true and caches the result.
 */
export function useGunPrice(enabled: boolean): UseGunPriceResult {
  const [gunPrice, setGunPrice] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState<Date | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const serviceRef = useRef<CoinGeckoService | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchPrice = async () => {
      try {
        if (!serviceRef.current) {
          serviceRef.current = new CoinGeckoService();
        }
        const priceData = await serviceRef.current.getGunTokenPrice();
        if (priceData?.gunTokenPrice) {
          setGunPrice(priceData.gunTokenPrice);
          setTimestamp(priceData.timestamp ?? null);
          setSource(priceData.source ?? null);
        }
      } catch (error) {
        console.error('Error fetching GUN price:', error);
      }
    };

    fetchPrice();
  }, [enabled]);

  return { gunPrice, timestamp, source };
}
