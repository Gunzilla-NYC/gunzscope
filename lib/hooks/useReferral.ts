'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';
import { toast } from 'sonner';
import { validateSlugLocally, type SlugValidation } from '@/lib/utils/slug';

// Re-export for consumers that imported from here
export { timeAgo } from '@/lib/utils/timeAgo';

// =============================================================================
// Types
// =============================================================================

interface ReferralStats {
  slug: string;
  shareUrl: string;
  totalClicks: number;
  totalWalletsConnected: number;
  totalConversions: number;
  conversionRate: number;
  recentReferrals: Array<{
    walletPrefix: string;
    status: string;
    convertedAt: string;
  }>;
}

export interface UseReferralReturn {
  isLoading: boolean;
  isRegistered: boolean;
  stats: ReferralStats | null;
  error: string | null;

  // Registration form
  slugInput: string;
  setSlugInput: (v: string) => void;
  slugValidation: SlugValidation;
  isRegistering: boolean;
  register: () => Promise<void>;

  // Post-registration actions
  shareUrl: string | null;
  copied: boolean;
  copyShareUrl: () => Promise<void>;
  shareOnX: () => void;

  retry: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const DEBOUNCE_MS = 400;

// =============================================================================
// Hook
// =============================================================================

export function useReferral(walletAddress: string | undefined): UseReferralReturn {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Registration form
  const [slugInput, setSlugInputRaw] = useState('');
  const [slugValidation, setSlugValidation] = useState<SlugValidation>({ status: 'idle' });
  const [isRegistering, setIsRegistering] = useState(false);

  // Copy feedback
  const [copied, setCopied] = useState(false);

  // Guards
  const fetchedRef = useRef(false);
  const lastWalletRef = useRef<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const slugCheckCounterRef = useRef(0);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch registration status + stats
  // ───────────────────────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async () => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if wallet is already registered
      const regRes = await fetch(`/api/referral/register?wallet=${encodeURIComponent(walletAddress)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!regRes.ok) {
        const text = await regRes.text();
        console.warn('[Referral] register check failed:', regRes.status, text);
        setError(`Failed to load referral data (${regRes.status})`);
        return;
      }

      const regData = await regRes.json();

      if (regData.success && regData.registered) {
        setIsRegistered(true);
        setShareUrl(regData.referrer.shareUrl);

        // Fetch stats
        const statsRes = await fetch(`/api/referral/stats?wallet=${encodeURIComponent(walletAddress)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
        }
      } else {
        setIsRegistered(false);
      }
    } catch (err) {
      console.warn('[Referral] fetch error:', err);
      setError('Failed to load referral data');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Initial fetch — once per wallet
  useEffect(() => {
    if (!walletAddress) {
      setIsLoading(false);
      return;
    }
    if (fetchedRef.current && lastWalletRef.current === walletAddress) return;
    fetchedRef.current = true;
    lastWalletRef.current = walletAddress;
    fetchStatus();
  }, [walletAddress, fetchStatus]);

  // ───────────────────────────────────────────────────────────────────────────
  // Slug input + debounced availability check
  // ───────────────────────────────────────────────────────────────────────────

  const setSlugInput = useCallback((value: string) => {
    // Sanitize: lowercase, strip invalid chars
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugInputRaw(sanitized);

    // Clear debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Empty → idle
    if (!sanitized) {
      setSlugValidation({ status: 'idle' });
      return;
    }

    // Client-side pre-validation
    const localResult = validateSlugLocally(sanitized);
    if (localResult) {
      setSlugValidation(localResult);
      return;
    }

    // Debounce API check
    setSlugValidation({ status: 'checking' });
    const counter = ++slugCheckCounterRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/referral/check-slug?slug=${encodeURIComponent(sanitized)}`);
        const data = await res.json();

        // Stale response guard
        if (slugCheckCounterRef.current !== counter) return;

        if (data.success && data.available) {
          setSlugValidation({ status: 'available' });
        } else {
          const reason = data.reason as string | undefined;
          if (reason === 'taken') setSlugValidation({ status: 'taken', message: 'Already taken' });
          else if (reason === 'reserved') setSlugValidation({ status: 'reserved', message: 'Reserved' });
          else setSlugValidation({ status: 'invalid', message: '3\u201320 chars, lowercase + hyphens' });
        }
      } catch {
        if (slugCheckCounterRef.current !== counter) return;
        setSlugValidation({ status: 'idle' });
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Register
  // ───────────────────────────────────────────────────────────────────────────

  const register = useCallback(async () => {
    if (!walletAddress || slugValidation.status !== 'available') return;

    const token = getAuthToken();
    if (!token) return;

    setIsRegistering(true);
    try {
      const res = await fetch('/api/referral/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress, slug: slugInput }),
      });
      const data = await res.json();

      if (data.success) {
        // Success or recovery (wallet already exists)
        setIsRegistered(true);
        setShareUrl(data.referrer.shareUrl);
        // Fetch stats for the dashboard
        await fetchStatus();
      } else if (res.status === 409) {
        setSlugValidation({ status: 'taken', message: 'Already taken' });
      } else {
        setError(data.error ?? 'Registration failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsRegistering(false);
    }
  }, [walletAddress, slugInput, slugValidation.status, fetchStatus]);

  // ───────────────────────────────────────────────────────────────────────────
  // Copy + Share actions
  // ───────────────────────────────────────────────────────────────────────────

  const copyShareUrl = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Referral link copied!', { duration: 3000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  }, [shareUrl]);

  const shareOnX = useCallback(() => {
    if (!shareUrl) return;
    const text = 'Track your OTG NFT arsenal with GUNZscope \uD83C\uDFAF\uD83D\uDCCA';
    const intentUrl = `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
  }, [shareUrl]);

  // ───────────────────────────────────────────────────────────────────────────
  // Retry
  // ───────────────────────────────────────────────────────────────────────────

  const retry = useCallback(() => {
    setError(null);
    fetchedRef.current = false;
    fetchStatus();
  }, [fetchStatus]);

  return {
    isLoading,
    isRegistered,
    stats,
    error,
    slugInput,
    setSlugInput,
    slugValidation,
    isRegistering,
    register,
    shareUrl,
    copied,
    copyShareUrl,
    shareOnX,
    retry,
  };
}
