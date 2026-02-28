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
  isBanned: boolean;
  data: WaitlistData | null;
  error: string | null;
  refresh: () => void;
}

const POLL_INTERVAL_MS = 30_000; // Check every 30s for promotion

/**
 * Poll waitlist status for a wallet address or email.
 * @param identifier - wallet address or email
 * @param type - 'wallet' (default) or 'email'
 */
export function useWaitlist(
  identifier: string | undefined,
  type: 'wallet' | 'email' = 'wallet'
): UseWaitlistReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isPromoted, setIsPromoted] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [data, setData] = useState<WaitlistData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!identifier) return;

    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      // Use ?address= for wallets, ?email= for email users
      const param = type === 'email'
        ? `email=${encodeURIComponent(identifier)}`
        : `address=${encodeURIComponent(identifier)}`;

      const res = await fetch(`/api/waitlist/status?${param}`, { headers });
      const json = await res.json();

      if (json.success && json.banned) {
        setIsBanned(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

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
  }, [identifier, type]);

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

  return { isLoading, isPromoted, isBanned, data, error, refresh };
}
