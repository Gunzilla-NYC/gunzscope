'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';

export interface WaitlistData {
  position: number;
  referralCount: number;
  promotionThreshold: number;
  referralLink: string | null;
  slug: string | null;
}

export interface UseWaitlistReturn {
  isLoading: boolean;
  isPromoted: boolean;
  data: WaitlistData | null;
  error: string | null;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 30_000; // Check every 30s for promotion

export function useWaitlist(walletAddress: string | undefined): UseWaitlistReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isPromoted, setIsPromoted] = useState(false);
  const [data, setData] = useState<WaitlistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!walletAddress) return;

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(
        `/api/waitlist/status?address=${encodeURIComponent(walletAddress)}`,
        { headers }
      );
      const json = await res.json();

      if (json.success && json.promoted) {
        setIsPromoted(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      if (json.success && json.waitlisted) {
        setData({
          position: json.position,
          referralCount: json.referralCount,
          promotionThreshold: json.promotionThreshold,
          referralLink: json.referralLink,
          slug: json.slug,
        });
      }
    } catch {
      setError('Failed to load waitlist status');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Initial fetch + polling
  useEffect(() => {
    fetchStatus();
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchStatus]);

  const refresh = useCallback(() => {
    setError(null);
    fetchStatus();
  }, [fetchStatus]);

  return { isLoading, isPromoted, data, error, refresh };
}
