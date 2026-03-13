/**
 * User Profile Hook
 *
 * Client-side hook for managing user profile state and API interactions.
 * Works with Dynamic auth to persist user data across sessions.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDynamicContext, getAuthToken } from '@dynamic-labs/sdk-react-core';

// =============================================================================
// Types
// =============================================================================

export interface Wallet {
  id: string;
  address: string;
  chain: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface TrackedAddress {
  id: string;
  address: string;
  chain: string | null;
  label: string | null;
  createdAt: string;
}

export type WalletClaimStatus = 'PRIMARY' | 'VERIFIED' | 'SELF_REPORTED';

export interface PortfolioAddress {
  id: string;
  address: string;
  label: string | null;
  verified: boolean;
  verifiedAt: string | null;
  status: WalletClaimStatus;
  addedAt: string;
}

export interface FavoriteItem {
  id: string;
  type: 'weapon' | 'nft' | 'attachment' | 'skin' | 'collection' | 'wishlist';
  refId: string;
  metadata: Record<string, unknown> | null;
  pinned: boolean;
  externalContract?: string | null;
  externalTokenId?: string | null;
  externalChain?: string | null;
  lastKnownValue?: number | null;
  lastValueAt?: string | null;
  createdAt: string;
}

export interface UserSettings {
  defaultAddress?: string;
  defaultChain?: string;
  theme?: 'dark' | 'light' | 'system';
  compactView?: boolean;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  dynamicUserId: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
  wallets: Wallet[];
  trackedAddresses: TrackedAddress[];
  portfolioAddresses: PortfolioAddress[];
  favorites: FavoriteItem[];
  settings: UserSettings | null;
}

interface UseUserProfileReturn {
  // State
  profile: UserProfile | null;
  isLoading: boolean;
  isConnected: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  refreshProfile: () => Promise<void>;
  updateEmail: (email: string | null) => Promise<boolean>;
  updateDisplayName: (displayName: string | null) => Promise<boolean>;

  // Tracked addresses
  addTrackedAddress: (address: string, label?: string, chain?: string) => Promise<TrackedAddress | null>;
  removeTrackedAddress: (id: string) => Promise<boolean>;

  // Portfolio addresses
  addPortfolioAddress: (address: string, label?: string) => Promise<PortfolioAddress | null>;
  removePortfolioAddress: (id: string) => Promise<boolean>;
  verifyPortfolioAddress: (id: string, message: string, signature: string) => Promise<boolean>;
  isInPortfolio: (address: string) => boolean;

  // Favorites
  addFavorite: (
    type: FavoriteItem['type'],
    refId: string,
    metadata?: Record<string, unknown>
  ) => Promise<FavoriteItem | null>;
  removeFavorite: (id: string) => Promise<boolean>;
  isFavorited: (type: FavoriteItem['type'], refId: string) => boolean;
  togglePin: (favoriteId: string) => Promise<boolean>;

  // Wallets
  setPrimaryWallet: (address: string) => Promise<boolean>;

  // Settings
  updateSettings: (updates: Partial<UserSettings>) => Promise<UserSettings | null>;

  // Auth helpers
  getAuthHeaders: () => Promise<HeadersInit | null>;
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {},
  authToken: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Request failed' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('API request failed:', error);
    return { success: false, error: 'Network error' };
  }
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useUserProfile(): UseUserProfileReturn {
  const { primaryWallet, user } = useDynamicContext();
  const isAuthenticated = !!user;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if we've fetched for the current session
  const fetchedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Get auth headers for API calls
  const getAuthHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const token = getAuthToken();
    if (!token) return null;
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  // Fetch user profile from API
  const refreshProfile = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setProfile(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchWithAuth<{ profile: UserProfile }>(
        '/api/me',
        { method: 'GET' },
        token
      );

      if (result.success && result.data) {
        setProfile(result.data.profile);
      } else {
        setError(result.error || 'Failed to load profile');
        setProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch profile when wallet connects
  useEffect(() => {
    const token = getAuthToken();
    const currentUserId = primaryWallet?.address || user?.userId || null;

    // Skip if not authenticated
    if (!isAuthenticated || !token) {
      setProfile(null);
      fetchedRef.current = false;
      lastUserIdRef.current = null;
      return;
    }

    // Skip if already fetched for this user
    if (fetchedRef.current && lastUserIdRef.current === currentUserId) {
      return;
    }

    // Fetch profile
    fetchedRef.current = true;
    lastUserIdRef.current = currentUserId;
    refreshProfile();
  }, [isAuthenticated, primaryWallet?.address, user?.userId, refreshProfile]);

  // Sync profile across hook instances — when any instance updates favorites,
  // all other instances receive the updated profile via custom event.
  useEffect(() => {
    const handler = (e: Event) => {
      const profile = (e as CustomEvent).detail?.profile;
      if (profile) setProfile(profile);
    };
    window.addEventListener('gs:profile-updated', handler);
    return () => window.removeEventListener('gs:profile-updated', handler);
  }, []);

  // Update email
  const updateEmail = useCallback(async (email: string | null): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    const result = await fetchWithAuth(
      '/api/me/email',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
      token
    );

    if (result.success) {
      setProfile((prev) => (prev ? { ...prev, email } : null));
      return true;
    }
    return false;
  }, []);

  // Update display name
  const updateDisplayName = useCallback(async (displayName: string | null): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    const result = await fetchWithAuth(
      '/api/me/display-name',
      {
        method: 'PATCH',
        body: JSON.stringify({ displayName }),
      },
      token
    );

    if (result.success) {
      setProfile((prev) => (prev ? { ...prev, displayName } : null));
      return true;
    }
    return false;
  }, []);

  // Add tracked address
  const addTrackedAddress = useCallback(
    async (
      address: string,
      label?: string,
      chain?: string
    ): Promise<TrackedAddress | null> => {
      const token = getAuthToken();
      if (!token) return null;

      const result = await fetchWithAuth<{ trackedAddress: TrackedAddress }>(
        '/api/tracked-addresses',
        {
          method: 'POST',
          body: JSON.stringify({ address, label, chain }),
        },
        token
      );

      if (result.success && result.data) {
        const tracked = result.data.trackedAddress;
        setProfile((prev) => {
          if (!prev) return null;
          // Remove if already exists (upsert behavior)
          const filtered = prev.trackedAddresses.filter(
            (t) => t.address.toLowerCase() !== address.toLowerCase()
          );
          return {
            ...prev,
            trackedAddresses: [tracked, ...filtered],
          };
        });
        return tracked;
      }
      return null;
    },
    []
  );

  // Remove tracked address
  const removeTrackedAddress = useCallback(async (id: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    const result = await fetchWithAuth(
      `/api/tracked-addresses/${id}`,
      { method: 'DELETE' },
      token
    );

    if (result.success) {
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          trackedAddresses: prev.trackedAddresses.filter((t) => t.id !== id),
        };
      });
      return true;
    }
    return false;
  }, []);

  // Add portfolio address (returns { address, error } to support 409 conflict messaging)
  const addPortfolioAddress = useCallback(
    async (address: string, label?: string): Promise<PortfolioAddress | null> => {
      const token = getAuthToken();
      if (!token) return null;

      const response = await fetch('/api/portfolio-addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ address, label }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // Address already claimed by another user — throw so UI can toast
        throw new Error(data.error || 'This address is already claimed by another user');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add portfolio address');
      }

      const portfolioAddr = data.portfolioAddress as PortfolioAddress;
      setProfile((prev) => {
        if (!prev) return null;
        const filtered = prev.portfolioAddresses.filter(
          (p) => p.address.toLowerCase() !== address.toLowerCase()
        );
        return {
          ...prev,
          portfolioAddresses: [portfolioAddr, ...filtered],
        };
      });
      return portfolioAddr;
    },
    []
  );

  // Remove portfolio address
  const removePortfolioAddress = useCallback(async (id: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    const result = await fetchWithAuth(
      `/api/portfolio-addresses/${id}`,
      { method: 'DELETE' },
      token
    );

    if (result.success) {
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          portfolioAddresses: prev.portfolioAddresses.filter((p) => p.id !== id),
        };
      });
      return true;
    }
    return false;
  }, []);

  // Verify portfolio address ownership via signature
  const verifyPortfolioAddress = useCallback(async (id: string, message: string, signature: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    const result = await fetchWithAuth<{ portfolioAddress: { id: string; verified: boolean; verifiedAt: string | null; status: WalletClaimStatus } }>(
      `/api/portfolio-addresses/${id}/verify`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      },
      token
    );

    if (result.success && result.data?.portfolioAddress) {
      const { verifiedAt, status } = result.data.portfolioAddress;
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          portfolioAddresses: prev.portfolioAddresses.map((p) =>
            p.id === id ? { ...p, verified: true, verifiedAt, status } : p
          ),
        };
      });
      return true;
    }
    return false;
  }, []);

  // Check if address is in portfolio
  const isInPortfolio = useCallback(
    (address: string): boolean => {
      if (!profile) return false;
      return profile.portfolioAddresses.some(
        (p) => p.address.toLowerCase() === address.toLowerCase()
      );
    },
    [profile]
  );

  // Add favorite
  const addFavorite = useCallback(
    async (
      type: FavoriteItem['type'],
      refId: string,
      metadata?: Record<string, unknown>
    ): Promise<FavoriteItem | null> => {
      const token = getAuthToken();
      if (!token) return null;

      const result = await fetchWithAuth<{ favorite: FavoriteItem }>(
        '/api/favorites',
        {
          method: 'POST',
          body: JSON.stringify({ type, refId, metadata }),
        },
        token
      );

      if (result.success && result.data) {
        const favorite = result.data.favorite;
        setProfile((prev) => {
          if (!prev) return null;
          // Remove if already exists (upsert behavior)
          const filtered = prev.favorites.filter(
            (f) => !(f.type === type && f.refId === refId)
          );
          const next = {
            ...prev,
            favorites: [favorite, ...filtered],
          };
          // Notify other hook instances (e.g. PortfolioClient's pinned favorites)
          window.dispatchEvent(new CustomEvent('gs:profile-updated', { detail: { profile: next } }));
          return next;
        });
        return favorite;
      }
      return null;
    },
    []
  );

  // Remove favorite
  const removeFavorite = useCallback(async (id: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    const result = await fetchWithAuth(
      `/api/favorites/${id}`,
      { method: 'DELETE' },
      token
    );

    if (result.success) {
      setProfile((prev) => {
        if (!prev) return null;
        const next = {
          ...prev,
          favorites: prev.favorites.filter((f) => f.id !== id),
        };
        // Notify other hook instances (e.g. PortfolioClient's pinned favorites)
        window.dispatchEvent(new CustomEvent('gs:profile-updated', { detail: { profile: next } }));
        return next;
      });
      return true;
    }
    return false;
  }, []);

  // Check if item is favorited
  const isFavorited = useCallback(
    (type: FavoriteItem['type'], refId: string): boolean => {
      if (!profile) return false;
      return profile.favorites.some((f) => f.type === type && f.refId === refId);
    },
    [profile]
  );

  // Toggle pin on a favorite
  const togglePin = useCallback(async (favoriteId: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    const result = await fetchWithAuth<{ id: string; pinned: boolean }>(
      `/api/favorites/${favoriteId}`,
      { method: 'PATCH' },
      token
    );

    if (result.success && result.data) {
      const { id, pinned } = result.data;
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          favorites: prev.favorites.map((f) =>
            f.id === id ? { ...f, pinned } : f
          ),
        };
      });
      return true;
    }
    return false;
  }, []);

  // Set primary wallet
  const setPrimaryWallet = useCallback(async (address: string): Promise<boolean> => {
    const token = getAuthToken();
    if (!token) return false;

    const result = await fetchWithAuth(
      '/api/me/primary-wallet',
      {
        method: 'PUT',
        body: JSON.stringify({ address }),
      },
      token
    );

    if (result.success) {
      // Optimistic update: mark selected wallet as primary
      setProfile((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          wallets: prev.wallets.map((w) => ({
            ...w,
            isPrimary: w.address.toLowerCase() === address.toLowerCase(),
          })),
        };
      });
      return true;
    }
    return false;
  }, []);

  // Update settings
  const updateSettings = useCallback(
    async (updates: Partial<UserSettings>): Promise<UserSettings | null> => {
      const token = getAuthToken();
      if (!token) return null;

      const result = await fetchWithAuth<{ settings: UserSettings }>(
        '/api/settings',
        {
          method: 'PATCH',
          body: JSON.stringify(updates),
        },
        token
      );

      if (result.success && result.data) {
        const newSettings = result.data.settings;
        setProfile((prev) => {
          if (!prev) return null;
          return { ...prev, settings: newSettings };
        });
        return newSettings;
      }
      return null;
    },
    []
  );

  return {
    profile,
    isLoading,
    isConnected: isAuthenticated && !!primaryWallet,
    isAuthenticated,
    error,
    refreshProfile,
    updateEmail,
    updateDisplayName,
    addTrackedAddress,
    removeTrackedAddress,
    addPortfolioAddress,
    removePortfolioAddress,
    verifyPortfolioAddress,
    isInPortfolio,
    setPrimaryWallet,
    addFavorite,
    removeFavorite,
    isFavorited,
    togglePin,
    updateSettings,
    getAuthHeaders,
  };
}

export default useUserProfile;
