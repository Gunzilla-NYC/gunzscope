'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';
import type { AlertType, AlertPreferenceData, AlertLogData } from '@/lib/services/alertPreferenceService';

// Re-export types for consumers
export type { AlertType, AlertPreferenceData, AlertLogData };

interface UseAlertPreferencesReturn {
  preferences: AlertPreferenceData[];
  recentAlerts: AlertLogData[];
  isLoading: boolean;
  error: string | null;
  updatePreference: (type: AlertType, enabled: boolean, config?: Record<string, unknown>) => Promise<boolean>;
  deleteAlert: (type: AlertType) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useAlertPreferences(): UseAlertPreferencesReturn {
  const { user } = useDynamicContext();
  const isAuthenticated = !!user;

  const [preferences, setPreferences] = useState<AlertPreferenceData[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<AlertLogData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchPreferences = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setPreferences([]);
      setRecentAlerts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/alerts', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setPreferences(data.preferences);
        setRecentAlerts(data.recentAlerts);
      } else {
        setError(data.error || 'Failed to load alert preferences');
      }
    } catch {
      setError('Failed to load alert preferences');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!isAuthenticated) {
      setPreferences([]);
      setRecentAlerts([]);
      setIsLoading(false);
      fetchedRef.current = false;
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchPreferences();
  }, [isAuthenticated, fetchPreferences]);

  const updatePreference = useCallback(
    async (type: AlertType, enabled: boolean, config?: Record<string, unknown>): Promise<boolean> => {
      const token = getAuthToken();
      if (!token) return false;

      setError(null);

      try {
        const res = await fetch('/api/alerts', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type, enabled, config }),
        });

        const data = await res.json();
        if (!data.success) {
          setError(data.error || 'Failed to update alert');
          return false;
        }

        // Update local state
        setPreferences((prev) => {
          const existing = prev.findIndex((p) => p.type === type);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data.preference;
            return updated;
          }
          return [...prev, data.preference];
        });

        return true;
      } catch {
        setError('Failed to update alert preference');
        return false;
      }
    },
    []
  );

  const deleteAlert = useCallback(async (type: AlertType): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    try {
      const res = await fetch(`/api/alerts/${type}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (data.success) {
        setPreferences((prev) => prev.filter((p) => p.type !== type));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  return {
    preferences,
    recentAlerts,
    isLoading,
    error,
    updatePreference,
    deleteAlert,
    refetch: fetchPreferences,
  };
}

export default useAlertPreferences;
