/**
 * User Service - Database operations for user profiles
 *
 * Handles CRUD operations for UserProfile, Wallet, TrackedAddress,
 * FavoriteItem, and UserSettings.
 */

import prisma from '../db';
import type { WalletClaimStatus } from '../generated/prisma/client';
import type { DynamicUser } from '../auth/dynamicAuth';

// Re-export for consumers
export type { WalletClaimStatus } from '../generated/prisma/client';

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
  portfolioAddresses: {
    id: string;
    address: string;
    label: string | null;
    verified: boolean;
    verifiedAt: Date | null;
    status: WalletClaimStatus;
    addedAt: Date;
  }[];
}

export interface AddTrackedAddressInput {
  address: string;
  chain?: string;
  label?: string;
}

export interface AddFavoriteInput {
  type: 'weapon' | 'nft' | 'attachment' | 'skin' | 'collection' | 'wishlist';
  refId: string;
  metadata?: Record<string, unknown>;
  externalContract?: string;
  externalTokenId?: string;
  externalChain?: string;
}

export interface AddPortfolioAddressInput {
  address: string;
  label?: string;
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

    // Only set isPrimary: true on create if no other wallet is already primary
    const existingPrimary = await prisma.wallet.findFirst({
      where: { userProfileId: profile.id, isPrimary: true },
    });

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
        isPrimary: !existingPrimary, // Only primary if no existing primary wallet
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
      portfolioAddresses: {
        orderBy: { addedAt: 'desc' },
      },
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
      portfolioAddresses: {
        orderBy: { addedAt: 'desc' },
      },
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

/**
 * Look up a user profile by any linked wallet address.
 * Uses the @@index([address]) on the Wallet model.
 */
export async function getProfileByWalletAddress(address: string): Promise<UserProfileWithRelations | null> {
  const wallet = await prisma.wallet.findFirst({
    where: { address: address.toLowerCase() },
    select: { userProfileId: true },
  });
  if (!wallet) return null;

  try {
    return await getFullProfile(wallet.userProfileId);
  } catch {
    return null;
  }
}

/**
 * Set a wallet as primary for a user profile.
 * Clears isPrimary on all other wallets for the profile in a transaction.
 */
export async function setPrimaryWallet(userId: string, walletAddress: string): Promise<void> {
  await prisma.$transaction([
    prisma.wallet.updateMany({
      where: { userProfileId: userId },
      data: { isPrimary: false },
    }),
    prisma.wallet.updateMany({
      where: {
        userProfileId: userId,
        address: walletAddress.toLowerCase(),
      },
      data: { isPrimary: true },
    }),
  ]);
}

/**
 * Upsert user profile with wallet-based recovery.
 * If the dynamicUserId is new but the wallet already belongs to an existing profile,
 * migrate the existing profile to the new dynamicUserId instead of creating an orphan.
 */
export async function upsertUserProfileWithRecovery(dynamicUser: DynamicUser): Promise<UserProfileWithRelations> {
  // 1. Normal lookup by dynamicUserId
  const existingByDynamic = await getProfileByDynamicId(dynamicUser.userId);
  if (existingByDynamic) {
    return upsertUserProfile(dynamicUser);
  }

  // 2. No profile for this dynamicUserId — check if wallet belongs to another profile
  if (dynamicUser.walletAddress) {
    const existingByWallet = await getProfileByWalletAddress(dynamicUser.walletAddress);
    if (existingByWallet) {
      // Recovery: migrate the existing profile to the new dynamicUserId
      await prisma.userProfile.update({
        where: { id: existingByWallet.id },
        data: { dynamicUserId: dynamicUser.userId },
      });
      // Re-fetch with updated dynamicUserId
      return getFullProfile(existingByWallet.id);
    }
  }

  // 3. Truly new user — create fresh
  return upsertUserProfile(dynamicUser);
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
// Portfolio Address Operations
// =============================================================================

/**
 * Error thrown when an address is already claimed by another user.
 */
export class AddressAlreadyClaimedError extends Error {
  constructor(
    public readonly existingStatus: WalletClaimStatus,
    message?: string
  ) {
    super(message ?? 'This address is already claimed by another user');
    this.name = 'AddressAlreadyClaimedError';
  }
}

/**
 * Find an existing portfolio claim for an address across all users.
 * Uses @@index([address]) for fast lookup.
 */
export async function findClaimByAddress(
  address: string
): Promise<{ userProfileId: string; status: WalletClaimStatus; id: string } | null> {
  const claim = await prisma.portfolioAddress.findFirst({
    where: { address: address.toLowerCase() },
    select: { id: true, userProfileId: true, status: true },
  });
  return claim;
}

/**
 * Add a portfolio address with global uniqueness enforcement.
 *
 * - If unclaimed: creates the entry
 * - If claimed by same user: upserts (updates label/status)
 * - If claimed by another user with SELF_REPORTED and new status is VERIFIED/PRIMARY: takeover
 * - If claimed by another user otherwise: throws AddressAlreadyClaimedError
 */
export async function addPortfolioAddress(
  profileId: string,
  input: AddPortfolioAddressInput & { status?: WalletClaimStatus }
): Promise<{ id: string; address: string; label: string | null; verified: boolean; verifiedAt: Date | null; status: WalletClaimStatus; addedAt: Date }> {
  const normalizedAddress = input.address.toLowerCase();
  const status = input.status ?? 'SELF_REPORTED';
  const isVerifiedStatus = status === 'VERIFIED' || status === 'PRIMARY';
  const now = isVerifiedStatus ? new Date() : undefined;

  // Check for existing claim across all users
  const existingClaim = await findClaimByAddress(normalizedAddress);

  if (existingClaim && existingClaim.userProfileId !== profileId) {
    // Another user has this address
    if (isVerifiedStatus && existingClaim.status === 'SELF_REPORTED') {
      // Takeover: verified/primary trumps self-reported
      await prisma.$transaction([
        prisma.portfolioAddress.delete({ where: { id: existingClaim.id } }),
        prisma.portfolioAddress.create({
          data: {
            userProfileId: profileId,
            address: normalizedAddress,
            label: input.label ?? null,
            verified: isVerifiedStatus,
            verifiedAt: now ?? null,
            status,
          },
        }),
      ]);
      // Fetch the newly created record
      const created = await prisma.portfolioAddress.findFirst({
        where: { userProfileId: profileId, address: normalizedAddress },
      });
      return {
        id: created!.id,
        address: created!.address,
        label: created!.label,
        verified: created!.verified,
        verifiedAt: created!.verifiedAt,
        status: created!.status,
        addedAt: created!.addedAt,
      };
    }
    // Can't take over — block the claim
    throw new AddressAlreadyClaimedError(existingClaim.status);
  }

  // Same user or unclaimed — upsert
  const portfolioAddress = await prisma.portfolioAddress.upsert({
    where: {
      userProfileId_address: {
        userProfileId: profileId,
        address: normalizedAddress,
      },
    },
    update: {
      label: input.label,
      ...(isVerifiedStatus ? { verified: true, verifiedAt: now, status } : {}),
    },
    create: {
      userProfileId: profileId,
      address: normalizedAddress,
      label: input.label ?? null,
      verified: isVerifiedStatus,
      verifiedAt: now ?? null,
      status,
    },
  });

  return {
    id: portfolioAddress.id,
    address: portfolioAddress.address,
    label: portfolioAddress.label,
    verified: portfolioAddress.verified,
    verifiedAt: portfolioAddress.verifiedAt,
    status: portfolioAddress.status,
    addedAt: portfolioAddress.addedAt,
  };
}

/**
 * Mark a portfolio address as verified (after signature check).
 * Also handles takeover: if another user has a SELF_REPORTED claim on
 * the same address, it gets revoked.
 */
export async function verifyPortfolioAddress(
  profileId: string,
  portfolioAddressId: string
): Promise<{ id: string; address: string; verified: boolean; verifiedAt: Date | null; status: WalletClaimStatus } | null> {
  // Get the address being verified
  const record = await prisma.portfolioAddress.findFirst({
    where: { id: portfolioAddressId, userProfileId: profileId },
  });
  if (!record) return null;

  // Check for cross-user SELF_REPORTED claims to revoke
  const otherClaim = await prisma.portfolioAddress.findFirst({
    where: {
      address: record.address,
      userProfileId: { not: profileId },
      status: 'SELF_REPORTED',
    },
  });

  const now = new Date();

  if (otherClaim) {
    // Takeover: delete other user's claim, then mark ours verified
    await prisma.$transaction([
      prisma.portfolioAddress.delete({ where: { id: otherClaim.id } }),
      prisma.portfolioAddress.updateMany({
        where: { id: portfolioAddressId, userProfileId: profileId },
        data: { verified: true, verifiedAt: now, status: 'VERIFIED' },
      }),
    ]);
  } else {
    await prisma.portfolioAddress.updateMany({
      where: { id: portfolioAddressId, userProfileId: profileId },
      data: { verified: true, verifiedAt: now, status: 'VERIFIED' },
    });
  }

  const updated = await prisma.portfolioAddress.findUnique({
    where: { id: portfolioAddressId },
  });
  return updated
    ? { id: updated.id, address: updated.address, verified: updated.verified, verifiedAt: updated.verifiedAt, status: updated.status }
    : null;
}

/**
 * Remove a portfolio address
 */
export async function removePortfolioAddress(profileId: string, portfolioAddressId: string): Promise<boolean> {
  const result = await prisma.portfolioAddress.deleteMany({
    where: {
      id: portfolioAddressId,
      userProfileId: profileId, // Ensure user owns this record
    },
  });
  return result.count > 0;
}

/**
 * Get portfolio address count for limit checking
 */
export async function getPortfolioAddressCount(profileId: string): Promise<number> {
  return prisma.portfolioAddress.count({
    where: {
      userProfileId: profileId,
    },
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
): Promise<{ id: string; type: string; refId: string; metadata: unknown; pinned: boolean }> {
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
      ...(input.externalContract !== undefined && { externalContract: input.externalContract }),
      ...(input.externalTokenId !== undefined && { externalTokenId: input.externalTokenId }),
      ...(input.externalChain !== undefined && { externalChain: input.externalChain }),
    },
    create: {
      userProfileId: profileId,
      type: input.type,
      refId: input.refId,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      externalContract: input.externalContract ?? null,
      externalTokenId: input.externalTokenId ?? null,
      externalChain: input.externalChain ?? null,
    },
  });

  return {
    id: favorite.id,
    type: favorite.type,
    refId: favorite.refId,
    metadata: favorite.metadata ? JSON.parse(favorite.metadata) : null,
    pinned: favorite.pinned,
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
 * Toggle the pinned state of a favorite item
 */
export async function toggleFavoritePin(
  profileId: string,
  favoriteId: string,
): Promise<{ id: string; pinned: boolean } | null> {
  const item = await prisma.favoriteItem.findFirst({
    where: { id: favoriteId, userProfileId: profileId },
    select: { id: true, pinned: true },
  });
  if (!item) return null;

  const updated = await prisma.favoriteItem.update({
    where: { id: favoriteId },
    data: { pinned: !item.pinned },
    select: { id: true, pinned: true },
  });
  return updated;
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

/**
 * List all favorites for a user, split by type
 */
export async function listFavorites(profileId: string) {
  const items = await prisma.favoriteItem.findMany({
    where: { userProfileId: profileId },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  });

  const favorites = items
    .filter((f) => f.type !== 'wishlist')
    .map((f) => ({
      ...f,
      metadata: f.metadata ? JSON.parse(f.metadata) : null,
    }));

  const wishlist = items
    .filter((f) => f.type === 'wishlist')
    .map((f) => ({
      ...f,
      metadata: f.metadata ? JSON.parse(f.metadata) : null,
    }));

  return { favorites, wishlist };
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

// =============================================================================
// Admin: List Users
// =============================================================================

export interface AdminUserEntry {
  id: string;
  displayName: string | null;
  email: string | null;
  createdAt: Date;
  wallets: { address: string; chain: string; isPrimary: boolean }[];
  _count: {
    shareLinks: number;
    featureRequests: number;
    trackedAddresses: number;
    favorites: number;
  };
}

export async function listUsers(
  page = 1,
  limit = 50,
  search?: string,
): Promise<{ users: AdminUserEntry[]; total: number }> {
  const where = search
    ? {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { wallets: { some: { address: { contains: search.toLowerCase(), mode: 'insensitive' as const } } } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.userProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        displayName: true,
        email: true,
        createdAt: true,
        wallets: {
          select: { address: true, chain: true, isPrimary: true },
          orderBy: { isPrimary: 'desc' },
        },
        _count: {
          select: {
            shareLinks: true,
            featureRequests: true,
            trackedAddresses: true,
            favorites: true,
          },
        },
      },
    }),
    prisma.userProfile.count({ where }),
  ]);

  return { users, total };
}
