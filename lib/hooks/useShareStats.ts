'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';

export interface ShareStatEntry {
  code: string;
  address: string;
  platform: string;
  viewCount: number;
  createdAt: string;
}

export interface ShareStats {
  totalShares: number;
  totalViews: number;
  shares: ShareStatEntry[];
}

export function useShareStats() {
  const { user } = useDynamicContext();
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setStats(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/shares/stats', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setStats({
          totalShares: data.totalShares,
          totalViews: data.totalViews,
          shares: data.shares,
        });
      }
    } catch {
      // Silently fail — share stats are non-critical
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchStats();
  }, [user, fetchStats]);

  return { stats, isLoading, refreshStats: fetchStats };
}
