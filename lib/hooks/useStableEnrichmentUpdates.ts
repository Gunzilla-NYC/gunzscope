import { useCallback, useEffect, useRef } from 'react';
import { NFT, WalletData } from '@/lib/types';
import { createEnrichmentUpdater } from '@/lib/utils/mergeEnrichedNFTs';

interface UseStableEnrichmentUpdatesOptions {
  setWalletData: React.Dispatch<React.SetStateAction<WalletData | null>>;
  /** Trailing-edge debounce interval in ms (default 800) */
  debounceMs?: number;
}

interface UseStableEnrichmentUpdatesResult {
  /** Returns a stable callback for startEnrichment's updateCallback parameter */
  createUpdateCallback: (address: string) => (enrichedNFTs: NFT[]) => void;
  /** Immediately flush any pending debounced update + clear timer */
  flushPendingUpdates: () => void;
}

/**
 * Debounces enrichment → walletData updates to prevent UI flicker.
 *
 * Without this, every enrichment batch (~6 NFTs) calls setWalletData with a new
 * reference, cascading through portfolioResult → allNfts → charts, causing values
 * to flicker and charts to restart.
 *
 * First callback per address bypasses debounce for instant cache-hydration paint.
 * Subsequent callbacks accumulate in a ref and flush after debounceMs.
 */
export function useStableEnrichmentUpdates({
  setWalletData,
  debounceMs = 800,
}: UseStableEnrichmentUpdatesOptions): UseStableEnrichmentUpdatesResult {
  const pendingRef = useRef<{ enrichedNFTs: NFT[]; address: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRef = useRef(true);

  const flushPendingUpdates = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      setWalletData(createEnrichmentUpdater(pending.enrichedNFTs, pending.address));
    }
  }, [setWalletData]);

  const createUpdateCallback = useCallback((address: string) => {
    isFirstRef.current = true;

    return (enrichedNFTs: NFT[]) => {
      // First callback (cache hydration) bypasses debounce for instant first paint
      if (isFirstRef.current) {
        isFirstRef.current = false;
        setWalletData(createEnrichmentUpdater(enrichedNFTs, address));
        return;
      }

      // Subsequent batch callbacks: accumulate and debounce
      pendingRef.current = { enrichedNFTs, address };

      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          const pending = pendingRef.current;
          if (pending) {
            pendingRef.current = null;
            setWalletData(createEnrichmentUpdater(pending.enrichedNFTs, pending.address));
          }
        }, debounceMs);
      }
    };
  }, [setWalletData, debounceMs]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { createUpdateCallback, flushPendingUpdates };
}
