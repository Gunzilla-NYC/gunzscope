'use client';

import { useCallback, useRef, useState } from 'react';
import { getGsHandle, getCChainProvider } from '@/lib/attestation/contract';

interface UseHandleResolverReturn {
  resolveAddresses: (addresses: string[]) => Promise<void>;
  getHandle: (address: string) => string | null;
  isResolving: boolean;
}

const CONCURRENCY = 5;

export function useHandleResolver(): UseHandleResolverReturn {
  const cacheRef = useRef<Map<string, string | null>>(new Map());
  const [isResolving, setIsResolving] = useState(false);

  const resolveAddresses = useCallback(async (addresses: string[]) => {
    // Deduplicate and filter already-cached
    const unique = [...new Set(addresses.map((a) => a.toLowerCase()))];
    const uncached = unique.filter((a) => !cacheRef.current.has(a));
    if (uncached.length === 0) return;

    setIsResolving(true);
    const provider = getCChainProvider();

    // Process in chunks of CONCURRENCY
    for (let i = 0; i < uncached.length; i += CONCURRENCY) {
      const chunk = uncached.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        chunk.map((addr) => getGsHandle(provider, addr)),
      );
      for (let j = 0; j < chunk.length; j++) {
        const result = results[j];
        cacheRef.current.set(
          chunk[j],
          result.status === 'fulfilled' ? result.value : null,
        );
      }
    }

    setIsResolving(false);
  }, []);

  const getHandle = useCallback((address: string): string | null => {
    return cacheRef.current.get(address.toLowerCase()) ?? null;
  }, []);

  return { resolveAddresses, getHandle, isResolving };
}
