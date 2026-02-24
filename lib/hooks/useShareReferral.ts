'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuthToken } from '@dynamic-labs/sdk-react-core';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

export interface HandleData {
  walletAddress: string;
  slug: string;
  slugType: 'auto' | 'custom';
  customSlug: string | null;
  shareUrl: string;
}

export interface ShareSlot {
  method: 'link' | 'discord' | 'x';
  active: boolean;
  code: string | null;
  viewCount: number;
  createdAt: string | null;
}

export interface UnifiedStats {
  activeLinks: number;
  totalViews: number;
  totalConnected: number;
  totalConversions: number;
  cvrRate: number;
}

export interface RecentReferral {
  walletPrefix: string;
  status: string;
  convertedAt: string;
}

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'reserved' | 'invalid';

export interface SlugValidation {
  status: SlugStatus;
  message?: string;
}

export interface UseShareReferralReturn {
  // Handle state
  handle: HandleData | null;
  isHandleClaimed: boolean;
  handleMode: 'auto' | 'custom';
  setHandleMode: (mode: 'auto' | 'custom') => void;
  slugInput: string;
  setSlugInput: (v: string) => void;
  slugValidation: SlugValidation;
  claimHandle: () => Promise<void>;
  switchMode: () => Promise<void>;
  isClaimingHandle: boolean;

  // Share slots (always 3 entries)
  slots: ShareSlot[];
  generateLink: (method: 'link' | 'discord' | 'x') => Promise<void>;
  isGenerating: Record<string, boolean>;

  // Stats
  stats: UnifiedStats;
  recentReferrals: RecentReferral[];

  // Actions
  copyLink: (method: 'link' | 'discord' | 'x') => Promise<void>;
  copiedMethod: string | null;

  // Meta
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

// =============================================================================
// Constants
// =============================================================================

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
const CONSECUTIVE_HYPHENS = /--/;
const DEBOUNCE_MS = 400;

const EMPTY_STATS: UnifiedStats = {
  activeLinks: 0,
  totalViews: 0,
  totalConnected: 0,
  totalConversions: 0,
  cvrRate: 0,
};

const EMPTY_SLOTS: ShareSlot[] = [
  { method: 'link', active: false, code: null, viewCount: 0, createdAt: null },
  { method: 'discord', active: false, code: null, viewCount: 0, createdAt: null },
  { method: 'x', active: false, code: null, viewCount: 0, createdAt: null },
];

// =============================================================================
// Helpers
// =============================================================================

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function validateSlugLocally(slug: string): SlugValidation | null {
  if (slug.length < 3) return { status: 'invalid', message: '3\u201320 chars, lowercase + hyphens' };
  if (slug.length > 20) return { status: 'invalid', message: 'Max 20 characters' };
  if (CONSECUTIVE_HYPHENS.test(slug)) return { status: 'invalid', message: 'No consecutive hyphens' };
  if (!SLUG_REGEX.test(slug)) return { status: 'invalid', message: '3\u201320 chars, lowercase + hyphens' };
  return null; // Pass — needs API check
}

function buildShareUrl(slot: ShareSlot): string {
  return `https://gunzscope.xyz/s/${slot.code}`;
}

// =============================================================================
// Hook
// =============================================================================

export function useShareReferral(walletAddress: string | undefined): UseShareReferralReturn {
  // ── Handle state ───────────────────────────────────────────────────────────
  const [handle, setHandle] = useState<HandleData | null>(null);
  const [handleMode, setHandleMode] = useState<'auto' | 'custom'>('auto');

  // ── Slug input + validation ────────────────────────────────────────────────
  const [slugInput, setSlugInputRaw] = useState('');
  const [slugValidation, setSlugValidation] = useState<SlugValidation>({ status: 'idle' });
  const [isClaimingHandle, setIsClaimingHandle] = useState(false);

  // ── Share slots ────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<ShareSlot[]>(EMPTY_SLOTS);
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});

  // ── Stats ──────────────────────────────────────────────────────────────────
  const [stats, setStats] = useState<UnifiedStats>(EMPTY_STATS);
  const [recentReferrals, setRecentReferrals] = useState<RecentReferral[]>([]);

  // ── Copy feedback ──────────────────────────────────────────────────────────
  const [copiedMethod, setCopiedMethod] = useState<string | null>(null);

  // ── Meta ────────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Guards ──────────────────────────────────────────────────────────────────
  const fetchedRef = useRef(false);
  const lastWalletRef = useRef<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const slugCheckCounterRef = useRef(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // Fetch all data on mount
  // ═══════════════════════════════════════════════════════════════════════════

  const fetchAll = useCallback(async () => {
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

    const headers = { Authorization: `Bearer ${token}` };
    const encodedWallet = encodeURIComponent(walletAddress);

    try {
      const [handleRes, slotsRes, statsRes] = await Promise.all([
        fetch(`/api/share/handle?wallet=${encodedWallet}`, { headers }),
        fetch(`/api/share/slots?address=${encodedWallet}`, { headers }),
        fetch(`/api/share/stats?address=${encodedWallet}`, { headers }),
      ]);

      // Handle
      if (handleRes.ok) {
        const handleData = await handleRes.json();
        if (handleData.success && handleData.handle) {
          setHandle(handleData.handle);
          setHandleMode(handleData.handle.slugType);
        } else {
          setHandle(null);
        }
      }

      // Slots
      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        if (slotsData.success && slotsData.slots) {
          setSlots(slotsData.slots);
        }
      }

      // Stats
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats({
            activeLinks: statsData.activeLinks ?? 0,
            totalViews: statsData.totalViews ?? 0,
            totalConnected: statsData.totalConnected ?? 0,
            totalConversions: statsData.totalConversions ?? 0,
            cvrRate: statsData.cvrRate ?? 0,
          });
          setRecentReferrals(statsData.recentReferrals ?? []);
        }
      }
    } catch (err) {
      console.warn('[ShareReferral] fetch error:', err);
      setError('Failed to load share & referral data');
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
    fetchAll();
  }, [walletAddress, fetchAll]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Slug input + debounced availability check
  // ═══════════════════════════════════════════════════════════════════════════

  const setSlugInput = useCallback((value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlugInputRaw(sanitized);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!sanitized) {
      setSlugValidation({ status: 'idle' });
      return;
    }

    const localResult = validateSlugLocally(sanitized);
    if (localResult) {
      setSlugValidation(localResult);
      return;
    }

    setSlugValidation({ status: 'checking' });
    const counter = ++slugCheckCounterRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/referral/check-slug?slug=${encodeURIComponent(sanitized)}`);
        const data = await res.json();

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

  // ═══════════════════════════════════════════════════════════════════════════
  // Claim Handle (auto or custom)
  // ═══════════════════════════════════════════════════════════════════════════

  const claimHandle = useCallback(async () => {
    if (!walletAddress) return;

    const token = getAuthToken();
    if (!token) return;

    // Custom mode requires validated slug
    if (handleMode === 'custom' && slugValidation.status !== 'available') return;

    setIsClaimingHandle(true);
    setError(null);

    try {
      const body: Record<string, string> = {
        walletAddress,
        slugType: handleMode,
      };
      if (handleMode === 'custom') {
        body.slug = slugInput;
      }

      const res = await fetch('/api/share/handle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success && data.handle) {
        setHandle(data.handle);
        setHandleMode(data.handle.slugType);
        toast.success('Handle created!');
        // Refresh slots + stats
        fetchAll();
      } else if (res.status === 409) {
        setSlugValidation({ status: 'taken', message: 'Already taken' });
      } else {
        setError(data.error ?? 'Failed to create handle');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsClaimingHandle(false);
    }
  }, [walletAddress, handleMode, slugInput, slugValidation.status, fetchAll]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Switch Mode (auto ↔ custom)
  // ═══════════════════════════════════════════════════════════════════════════

  const switchMode = useCallback(async () => {
    if (!walletAddress || !handle) return;

    const token = getAuthToken();
    if (!token) return;

    const newMode = handle.slugType === 'auto' ? 'custom' : 'auto';

    // Can't switch to custom if no custom slug claimed
    if (newMode === 'custom' && !handle.customSlug) {
      toast.error('Claim a custom slug first');
      return;
    }

    try {
      const res = await fetch('/api/share/handle', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress, slugType: newMode }),
      });

      const data = await res.json();

      if (data.success && data.handle) {
        setHandle(data.handle);
        setHandleMode(data.handle.slugType);
        toast.success(`Switched to ${newMode} handle`);
      } else {
        toast.error(data.error ?? 'Failed to switch mode');
      }
    } catch {
      toast.error('Network error');
    }
  }, [walletAddress, handle]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Generate / Regenerate Share Link
  // ═══════════════════════════════════════════════════════════════════════════

  const generateLink = useCallback(async (method: 'link' | 'discord' | 'x') => {
    if (!walletAddress || !handle) return;

    const token = getAuthToken();
    if (!token) return;

    setIsGenerating(prev => ({ ...prev, [method]: true }));

    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: walletAddress,
          platform: method,
        }),
      });

      const data = await res.json();

      if (data.success && data.code) {
        // Refresh slots and stats
        const encodedWallet = encodeURIComponent(walletAddress);
        const headers = { Authorization: `Bearer ${token}` };

        const [slotsRes, statsRes] = await Promise.all([
          fetch(`/api/share/slots?address=${encodedWallet}`, { headers }),
          fetch(`/api/share/stats?address=${encodedWallet}`, { headers }),
        ]);

        if (slotsRes.ok) {
          const slotsData = await slotsRes.json();
          if (slotsData.success) setSlots(slotsData.slots);
        }
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success) {
            setStats({
              activeLinks: statsData.activeLinks ?? 0,
              totalViews: statsData.totalViews ?? 0,
              totalConnected: statsData.totalConnected ?? 0,
              totalConversions: statsData.totalConversions ?? 0,
              cvrRate: statsData.cvrRate ?? 0,
            });
          }
        }

        toast.success(`${method.toUpperCase()} link generated!`);
      } else {
        toast.error(data.error ?? 'Failed to generate link');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setIsGenerating(prev => ({ ...prev, [method]: false }));
    }
  }, [walletAddress, handle]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Copy Link
  // ═══════════════════════════════════════════════════════════════════════════

  const copyLink = useCallback(async (method: 'link' | 'discord' | 'x') => {
    const slot = slots.find(s => s.method === method);
    if (!slot?.code) return;

    const url = buildShareUrl(slot);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedMethod(method);
      toast.success('Link copied!', { duration: 2000 });
      setTimeout(() => setCopiedMethod(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, [slots]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Retry
  // ═══════════════════════════════════════════════════════════════════════════

  const retry = useCallback(() => {
    setError(null);
    fetchedRef.current = false;
    fetchAll();
  }, [fetchAll]);

  // ═══════════════════════════════════════════════════════════════════════════
  // Return
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    handle,
    isHandleClaimed: !!handle,
    handleMode,
    setHandleMode,
    slugInput,
    setSlugInput,
    slugValidation,
    claimHandle,
    switchMode,
    isClaimingHandle,

    slots,
    generateLink,
    isGenerating,

    stats,
    recentReferrals,

    copyLink,
    copiedMethod,

    isLoading,
    error,
    retry,
  };
}
