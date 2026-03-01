'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface AttestationEvent {
  wallet: string;
  attestationId: number;
  merkleRoot: string;
  totalValueGun: string;
  itemCount: number;
  blockNumber: number;
  metadataURI: string;
  txHash: string;
  timestamp: number;
}

export interface ExplorerStats {
  totalAttestations: number;
  uniqueWallets: number;
  totalGunAttested: string;
}

interface UseExplorerResult {
  events: AttestationEvent[];
  stats: ExplorerStats | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refetch: () => void;
}

export function useExplorer(): UseExplorerResult {
  const [events, setEvents] = useState<AttestationEvent[]>([]);
  const [stats, setStats] = useState<ExplorerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/attestation/events');
      if (!res.ok) throw new Error('Failed to fetch attestation events');
      const data = await res.json();
      setEvents(data.events ?? []);
      setStats(data.stats ?? null);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { events, stats, isLoading, error, lastUpdated, refetch: fetchData };
}
