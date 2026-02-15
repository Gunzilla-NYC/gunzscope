'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';

// =============================================================================
// Types
// =============================================================================

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  adminNote: string | null;
  showAttribution: boolean;
  screenshotUrl: string | null;
  authorId: string;
  authorName: string | null;
  netVotes: number;
  userVote: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Eligibility {
  eligible: boolean;
  nftCount: number;
}

interface UseFeatureRequestsReturn {
  requests: FeatureRequest[];
  eligibility: Eligibility | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  submitRequest: (title: string, description: string, type?: 'feature' | 'bug', screenshotUrl?: string | null) => Promise<boolean>;
  vote: (id: string, value: 1 | -1) => Promise<boolean>;
  updateRequestStatus: (id: string, status: string, adminNote?: string, showAttribution?: boolean) => Promise<boolean>;
  deleteRequest: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useFeatureRequests(): UseFeatureRequestsReturn {
  const { user } = useDynamicContext();
  const isAuthenticated = !!user;

  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchRequests = useCallback(async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/feature-requests', { headers });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests);
      }
    } catch {
      setError('Failed to load feature requests');
    }
  }, []);

  const fetchEligibility = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setEligibility(null);
      return;
    }

    try {
      const res = await fetch('/api/feature-requests/eligibility', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setEligibility({ eligible: data.eligible, nftCount: data.nftCount });
      }
    } catch {
      // Non-critical — just means eligibility check failed
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchRequests(), fetchEligibility()]);
    setIsLoading(false);
  }, [fetchRequests, fetchEligibility]);

  // Initial fetch
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    refetch();
  }, [refetch]);

  // Re-fetch eligibility when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchEligibility();
    } else {
      setEligibility(null);
    }
  }, [isAuthenticated, fetchEligibility]);

  const submitRequest = useCallback(async (title: string, description: string, type?: 'feature' | 'bug', screenshotUrl?: string | null): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, description, type: type || 'feature', screenshotUrl: screenshotUrl || null }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to submit');
        return false;
      }

      // Prepend to list
      setRequests((prev) => [data.request, ...prev]);
      return true;
    } catch {
      setError('Failed to submit feature request');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const vote = useCallback(async (id: string, value: 1 | -1): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    // Optimistic update
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const wasVoted = r.userVote === value;
        const oldUserVote = r.userVote;
        const newUserVote = wasVoted ? null : value;
        // Adjust net votes
        let delta = 0;
        if (oldUserVote !== null) delta -= oldUserVote; // remove old vote
        if (newUserVote !== null) delta += newUserVote; // add new vote
        return { ...r, userVote: newUserVote, netVotes: r.netVotes + delta };
      })
    );

    try {
      const res = await fetch(`/api/feature-requests/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ value }),
      });

      const data = await res.json();
      if (!data.success) {
        // Revert optimistic update on failure
        await fetchRequests();
        return false;
      }

      // Sync with server truth
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, netVotes: data.netVotes, userVote: data.userVote } : r
        )
      );
      return true;
    } catch {
      await fetchRequests();
      return false;
    }
  }, [fetchRequests]);

  const updateRequestStatus = useCallback(async (id: string, status: string, adminNote?: string, showAttribution?: boolean): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    // Optimistic update
    const noteValue = status === 'open' ? null : (adminNote || null);
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, status, adminNote: noteValue };
        if (showAttribution !== undefined) updated.showAttribution = showAttribution;
        return updated;
      })
    );

    try {
      const res = await fetch(`/api/feature-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, adminNote, showAttribution }),
      });

      const data = await res.json();
      if (!data.success) {
        await fetchRequests();
        return false;
      }
      return true;
    } catch {
      await fetchRequests();
      return false;
    }
  }, [fetchRequests]);

  const deleteRequestFn = useCallback(async (id: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    // Optimistic remove
    setRequests((prev) => prev.filter((r) => r.id !== id));

    try {
      const res = await fetch(`/api/feature-requests/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!data.success) {
        await fetchRequests();
        return false;
      }
      return true;
    } catch {
      await fetchRequests();
      return false;
    }
  }, [fetchRequests]);

  return {
    requests,
    eligibility,
    isLoading,
    isSubmitting,
    error,
    submitRequest,
    vote,
    updateRequestStatus,
    deleteRequest: deleteRequestFn,
    refetch,
  };
}

export default useFeatureRequests;
