/**
 * User Service - Database operations for user profiles
 *
 * Handles CRUD operations for UserProfile, Wallet, TrackedAddress,
 * FavoriteItem, and UserSettings.
 */

import prisma from '../db';
import type { DynamicUser } from '../auth/dynamicAuth';

// =============================================================================
// Types
// =============================================================================

export interface UserProfileWithRelations {
  id: string;
  dynamicUserId: string;
  email: string | null;
  displayName: string | null;
  createdAt: Date;
  updatedAt: Date;
  wallets: {
    id: string;
    address: string;
    chain: string;
    isPrimary: boolean;
    createdAt: Date;
  }[];
  trackedAddresses: {
    id: string;
    address: string;
    chain: string | null;
    label: string | null;
    createdAt: Date;
  }[];
  favorites: {
    id: string;
    type: string;
    refId: string;
    metadata: unknown;
    createdAt: Date;
  }[];
  settings: {
    id: string;
    settings: unknown;
    updatedAt: Date;
  } | null;
}

export interface AddTrackedAddressInput {
  address: string;
  chain?: string;
  label?: string;
}

export interface AddFavoriteInput {
  type: 'weapon' | 'nft' | 'attachment' | 'skin' | 'collection';
  refId: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// User Profile Operations
// =============================================================================

/**
 * Get or create a user profile based on Dynamic auth
 * This is called on first authenticated API request
 */
export async function upsertUserProfile(dynamicUser: DynamicUser): Promise<UserProfileWithRelations> {
  // Upsert the user profile
  const profile = await prisma.userProfile.upsert({
    where: { dynamicUserId: dynamicUser.userId },
    update: {
      // Update email if newly provided
      ...(dynamicUser.email && { email: dynamicUser.email }),
    },
    create: {
      dynamicUserId: dynamicUser.userId,
      email: dynamicUser.email,
    },
  });

  // If wallet address is provided, upsert the wallet
  if (dynamicUser.walletAddress) {
    const chain = dynamicUser.chain || 'avalanche';
    await prisma.wallet.upsert({
      where: {
        userProfileId_address_chain: {
          userProfileId: profile.id,
          address: dynamicUser.walletAddress.toLowerCase(),
          chain,
        },
      },
      update: {},
      create: {
        userProfileId: profile.id,
        address: dynamicUser.walletAddress.toLowerCase(),
        chain,
        isPrimary: true, // First wallet is primary
      },
    });
  }

  // Return full profile with relations
  return getFullProfile(profile.id);
}

/**
 * Get full user profile with all relations
 */
export async function getFullProfile(profileId: string): Promise<UserProfileWithRelations> {
  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { id: profileId },
    include: {
      wallets: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      trackedAddresses: {
        orderBy: { createdAt: 'desc' },
      },
      favorites: {
        orderBy: { createdAt: 'desc' },
      },
      settings: true,
    },
  });

  return {
    ...profile,
    favorites: profile.favorites.map((f) => ({
      ...f,
      metadata: f.metadata ? JSON.parse(f.metadata) : null,
    })),
    settings: profile.settings
      ? {
          ...profile.settings,
          settings: JSON.parse(profile.settings.settings),
        }
      : null,
  };
}

/**
 * Get profile by Dynamic user ID
 */
export async function getProfileByDynamicId(dynamicUserId: string): Promise<UserProfileWithRelations | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { dynamicUserId },
    include: {
      wallets: {
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
      },
      trackedAddresses: {
        orderBy: { createdAt: 'desc' },
      },
      favorites: {
        orderBy: { createdAt: 'desc' },
      },
      settings: true,
    },
  });

  if (!profile) return null;

  return {
    ...profile,
    favorites: profile.favorites.map((f) => ({
      ...f,
      metadata: f.metadata ? JSON.parse(f.metadata) : null,
    })),
    settings: profile.settings
      ? {
          ...profile.settings,
          settings: JSON.parse(profile.settings.settings),
        }
      : null,
  };
}

/**
 * Update user email
 */
export async function updateUserEmail(profileId: string, email: string | null): Promise<void> {
  await prisma.userProfile.update({
    where: { id: profileId },
    data: { email },
  });
}

/**
 * Update user display name
 */
export async function updateDisplayName(profileId: string, displayName: string | null): Promise<void> {
  await prisma.userProfile.update({
    where: { id: profileId },
    data: { displayName },
  });
}

// =============================================================================
// Wallet Operations
// =============================================================================

/**
 * Add a wallet to user profile
 */
export async function addWallet(
  profileId: string,
  address: string,
  chain: string
): Promise<{ id: string; address: string; chain: string }> {
  const normalizedAddress = address.toLowerCase();

  const wallet = await prisma.wallet.upsert({
    where: {
      userProfileId_address_chain: {
        userProfileId: profileId,
        address: normalizedAddress,
        chain,
      },
    },
    update: {},
    create: {
      userProfileId: profileId,
      address: normalizedAddress,
      chain,
      isPrimary: false,
    },
  });

  return { id: wallet.id, address: wallet.address, chain: wallet.chain };
}

/**
 * Remove a wallet from user profile
 */
export async function removeWallet(profileId: string, walletId: string): Promise<void> {
  await prisma.wallet.deleteMany({
    where: {
      id: walletId,
      userProfileId: profileId,
    },
  });
}

// =============================================================================
// Tracked Address Operations
// =============================================================================

/**
 * Add a tracked address
 */
export async function addTrackedAddress(
  profileId: string,
  input: AddTrackedAddressInput
): Promise<{ id: string; address: string; chain: string | null; label: string | null }> {
  const normalizedAddress = input.address.toLowerCase();

  const tracked = await prisma.trackedAddress.upsert({
    where: {
      userProfileId_address: {
        userProfileId: profileId,
        address: normalizedAddress,
      },
    },
    update: {
      label: input.label,
      chain: input.chain,
    },
    create: {
      userProfileId: profileId,
      address: normalizedAddress,
      chain: input.chain,
      label: input.label,
    },
  });

  return {
    id: tracked.id,
    address: tracked.address,
    chain: tracked.chain,
    label: tracked.label,
  };
}

/**
 * Remove a tracked address
 */
export async function removeTrackedAddress(profileId: string, trackedId: string): Promise<boolean> {
  const result = await prisma.trackedAddress.deleteMany({
    where: {
      id: trackedId,
      userProfileId: profileId, // Ensure user owns this record
    },
  });
  return result.count > 0;
}

/**
 * Update tracked address label
 */
export async function updateTrackedAddressLabel(
  profileId: string,
  trackedId: string,
  label: string | null
): Promise<void> {
  await prisma.trackedAddress.updateMany({
    where: {
      id: trackedId,
      userProfileId: profileId,
    },
    data: { label },
  });
}

// =============================================================================
// Favorites Operations
// =============================================================================

/**
 * Add a favorite item
 */
export async function addFavorite(
  profileId: string,
  input: AddFavoriteInput
): Promise<{ id: string; type: string; refId: string; metadata: unknown }> {
  const favorite = await prisma.favoriteItem.upsert({
    where: {
      userProfileId_type_refId: {
        userProfileId: profileId,
        type: input.type,
        refId: input.refId,
      },
    },
    update: {
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
    create: {
      userProfileId: profileId,
      type: input.type,
      refId: input.refId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });

  return {
    id: favorite.id,
    type: favorite.type,
    refId: favorite.refId,
    metadata: favorite.metadata ? JSON.parse(favorite.metadata) : null,
  };
}

/**
 * Remove a favorite item
 */
export async function removeFavorite(profileId: string, favoriteId: string): Promise<boolean> {
  const result = await prisma.favoriteItem.deleteMany({
    where: {
      id: favoriteId,
      userProfileId: profileId,
    },
  });
  return result.count > 0;
}

/**
 * Check if an item is favorited
 */
export async function isFavorited(
  profileId: string,
  type: string,
  refId: string
): Promise<boolean> {
  const count = await prisma.favoriteItem.count({
    where: {
      userProfileId: profileId,
      type,
      refId,
    },
  });
  return count > 0;
}

// =============================================================================
// Settings Operations
// =============================================================================

export interface UserSettingsData {
  defaultAddress?: string;
  defaultChain?: string;
  theme?: 'dark' | 'light' | 'system';
  compactView?: boolean;
  [key: string]: unknown;
}

/**
 * Get user settings
 */
export async function getSettings(profileId: string): Promise<UserSettingsData> {
  const settings = await prisma.userSettings.findUnique({
    where: { userProfileId: profileId },
  });
  return settings ? JSON.parse(settings.settings) : {};
}

/**
 * Update user settings (merge with existing)
 */
export async function updateSettings(
  profileId: string,
  updates: Partial<UserSettingsData>
): Promise<UserSettingsData> {
  const existing = await getSettings(profileId);
  const merged = { ...existing, ...updates };

  await prisma.userSettings.upsert({
    where: { userProfileId: profileId },
    update: { settings: JSON.stringify(merged) },
    create: {
      userProfileId: profileId,
      settings: JSON.stringify(merged),
    },
  });

  return merged;
}

/**
 * Replace all user settings
 */
export async function replaceSettings(
  profileId: string,
  settings: UserSettingsData
): Promise<void> {
  await prisma.userSettings.upsert({
    where: { userProfileId: profileId },
    update: { settings: JSON.stringify(settings) },
    create: {
      userProfileId: profileId,
      settings: JSON.stringify(settings),
    },
  });
}
