import prisma from '../db';
import { isWhitelisted } from './whitelistService';
import { incrementReferralAndCheckPromotion } from './waitlistService';

// =============================================================================
// Constants
// =============================================================================

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$/;
const CONSECUTIVE_HYPHENS = /--/;

const RESERVED_SLUGS = new Set([
  'app', 'api', 'admin', 'portfolio', 'demo', 'wallet', 'ref', 'referral',
  'gunzscope', 'gunz', 'null', 'undefined', 'market', 'scarcity',
  'leaderboard', 'updates', 'changelog', 'settings', 'credits',
  'brand', 'cookies', 'privacy', 'terms', 'insanity', 'feature-requests',
]);

// =============================================================================
// Types
// =============================================================================

export interface ReferrerData {
  id: string;
  walletAddress: string;
  slug: string;
  slugType: string;
  customSlug: string | null;
  previousSlug: string | null;
  slugChangedAt: Date | null;
  slugChangesRemaining: number;
  totalClicks: number;
  totalConversions: number;
  createdAt: Date;
}

export interface SlugCheck {
  available: boolean;
  reason?: 'taken' | 'reserved' | 'invalid';
}

export interface ReferrerStats {
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

type CreateResult =
  | { ok: true; referrer: ReferrerData }
  | { ok: false; code: 'invalid_slug' | 'reserved_slug' | 'slug_taken' | 'wallet_exists'; existing?: ReferrerData };

// =============================================================================
// Slug Validation
// =============================================================================

function validateSlug(slug: string): SlugCheck {
  if (!SLUG_REGEX.test(slug) || CONSECUTIVE_HYPHENS.test(slug)) {
    return { available: false, reason: 'invalid' };
  }
  if (RESERVED_SLUGS.has(slug)) {
    return { available: false, reason: 'reserved' };
  }
  return { available: true };
}

// =============================================================================
// Create
// =============================================================================

export async function createReferrer(walletAddress: string, slug: string): Promise<CreateResult> {
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedSlug = slug.toLowerCase().trim();

  // Validate slug format
  const check = validateSlug(normalizedSlug);
  if (!check.available) {
    return { ok: false, code: check.reason === 'reserved' ? 'reserved_slug' : 'invalid_slug' };
  }

  // Check if wallet already registered — return existing slug for recovery
  const existing = await prisma.referrer.findUnique({ where: { walletAddress: normalizedWallet } });
  if (existing) {
    return { ok: false, code: 'wallet_exists', existing };
  }

  try {
    const referrer = await prisma.referrer.create({
      data: {
        walletAddress: normalizedWallet,
        slug: normalizedSlug,
        slugType: 'custom',
        customSlug: normalizedSlug,
        slugChangesRemaining: 1, // Explicit — don't rely on DB default
      },
    });
    return { ok: true, referrer };
  } catch (err: unknown) {
    const prismaErr = err as { code?: string; meta?: { target?: string[] } };
    if (prismaErr.code === 'P2002') {
      // Unique constraint violation — slug taken (wallet checked above)
      return { ok: false, code: 'slug_taken' };
    }
    throw err;
  }
}

// =============================================================================
// Lookup
// =============================================================================

export async function checkSlugAvailability(slug: string): Promise<SlugCheck> {
  const normalized = slug.toLowerCase().trim();
  const check = validateSlug(normalized);
  if (!check.available) return check;

  const existing = await prisma.referrer.findUnique({ where: { slug: normalized } });
  if (existing) return { available: false, reason: 'taken' };

  return { available: true };
}

export async function getReferrerBySlug(slug: string): Promise<ReferrerData | null> {
  return prisma.referrer.findUnique({ where: { slug: slug.toLowerCase() } });
}

export async function getReferrerByWallet(walletAddress: string): Promise<ReferrerData | null> {
  return prisma.referrer.findUnique({ where: { walletAddress: walletAddress.toLowerCase() } });
}

/** Look up a referrer by their previous slug (for 30-day redirect after slug change). */
export async function getReferrerByPreviousSlug(slug: string): Promise<ReferrerData | null> {
  return prisma.referrer.findFirst({
    where: {
      previousSlug: slug.toLowerCase(),
      slugChangedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  });
}

// =============================================================================
// Event Tracking
// =============================================================================

/** Record a link click. Deduplicates by IP hash + referrer within 24h. */
export async function recordClick(
  referrerId: string,
  sessionId: string,
  ipHash: string | null,
  userAgent: string | null,
): Promise<void> {
  // Dedup: same IP + same referrer within 24h
  if (ipHash) {
    const recent = await prisma.referralEvent.findFirst({
      where: {
        referrerId,
        ipHash,
        clickedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent) return;
  }

  await prisma.$transaction([
    prisma.referralEvent.create({
      data: {
        referrerId,
        sessionId,
        ipHash,
        userAgent: userAgent?.slice(0, 300) ?? null,
      },
    }),
    prisma.referrer.update({
      where: { id: referrerId },
      data: { totalClicks: { increment: 1 } },
    }),
  ]);
}

/** Promote a clicked event to wallet_connected. Guards against dupes and self-referral. */
export async function recordWalletConnected(
  sessionId: string,
  slug: string,
  walletAddress: string,
): Promise<void> {
  const normalizedWallet = walletAddress.toLowerCase();

  // Find the click event by sessionId
  const event = await prisma.referralEvent.findFirst({
    where: { sessionId, status: 'clicked' },
    include: { referrer: true },
    orderBy: { clickedAt: 'desc' },
  });
  if (!event) return;

  // Guard: self-referral — referrer can't refer themselves
  if (event.referrer.walletAddress === normalizedWallet) return;

  // Guard: first-touch — wallet already referred by anyone
  const alreadyReferred = await prisma.referralEvent.findFirst({
    where: {
      referredWallet: normalizedWallet,
      status: { in: ['wallet_connected', 'portfolio_loaded'] },
    },
  });
  if (alreadyReferred) return;

  // Guard: wallet already has full access (whitelisted users can't be referred)
  const alreadyWhitelisted = await isWhitelisted(normalizedWallet);
  if (alreadyWhitelisted) return;

  // Guard: referred user must have joined the waitlist for referrer to get credit
  const onWaitlist = await prisma.waitlistEntry.findUnique({
    where: { address: normalizedWallet },
    select: { id: true },
  });
  if (!onWaitlist) return;

  await prisma.referralEvent.update({
    where: { id: event.id },
    data: {
      referredWallet: normalizedWallet,
      status: 'wallet_connected',
      walletConnectedAt: new Date(),
    },
  });

  // Check if the referrer is on the waitlist and should be promoted
  await incrementReferralAndCheckPromotion(event.referrerId);
}

/** Promote wallet_connected to portfolio_loaded (terminal state). */
export async function recordPortfolioLoaded(walletAddress: string): Promise<void> {
  const normalizedWallet = walletAddress.toLowerCase();

  const event = await prisma.referralEvent.findFirst({
    where: { referredWallet: normalizedWallet, status: 'wallet_connected' },
  });
  if (!event) return;

  await prisma.$transaction([
    prisma.referralEvent.update({
      where: { id: event.id },
      data: { status: 'portfolio_loaded', portfolioLoadedAt: new Date() },
    }),
    prisma.referrer.update({
      where: { id: event.referrerId },
      data: { totalConversions: { increment: 1 } },
    }),
  ]);
}

// =============================================================================
// Stats
// =============================================================================

export async function getReferrerStats(walletAddress: string): Promise<ReferrerStats | null> {
  const referrer = await prisma.referrer.findUnique({
    where: { walletAddress: walletAddress.toLowerCase() },
  });
  if (!referrer) return null;

  const walletsConnected = await prisma.referralEvent.count({
    where: { referrerId: referrer.id, status: { in: ['wallet_connected', 'portfolio_loaded'] } },
  });

  const recentEvents = await prisma.referralEvent.findMany({
    where: {
      referrerId: referrer.id,
      status: { in: ['wallet_connected', 'portfolio_loaded'] },
    },
    orderBy: { walletConnectedAt: 'desc' },
    take: 10,
  });

  const recentReferrals = recentEvents
    .filter(e => e.referredWallet)
    .map(e => ({
      walletPrefix: `${e.referredWallet!.slice(0, 6)}...${e.referredWallet!.slice(-4)}`,
      status: e.status,
      convertedAt: (e.portfolioLoadedAt ?? e.walletConnectedAt ?? e.clickedAt).toISOString(),
    }));

  const conversionRate = referrer.totalClicks > 0
    ? Math.round((referrer.totalConversions / referrer.totalClicks) * 1000) / 10
    : 0;

  return {
    slug: referrer.slug,
    shareUrl: `https://gunzscope.xyz/r/${referrer.slug}`,
    totalClicks: referrer.totalClicks,
    totalWalletsConnected: walletsConnected,
    totalConversions: referrer.totalConversions,
    conversionRate,
    recentReferrals,
  };
}

// =============================================================================
// Handle System
// =============================================================================

/**
 * Derive an auto-slug from a wallet address or email identifier.
 * Wallet: "0x" + first 4 hex chars → "0xf943"
 * Email:  username part (before @), truncated to 6 chars, alphanumeric only
 */
function deriveAutoSlug(identifier: string): string {
  if (identifier.startsWith('email:')) {
    const email = identifier.slice(6); // strip "email:" prefix
    const username = email.split('@')[0].replace(/[^a-z0-9]/g, '').slice(0, 6);
    return username || 'user'; // fallback if username is empty after sanitizing
  }
  return identifier.slice(0, 6).toLowerCase(); // "0xf943"
}

/**
 * Get or create an auto-handle for a wallet.
 * If the wallet already has a Referrer, return it.
 * Otherwise create one with an auto-derived slug.
 */
export async function getOrCreateAutoHandle(walletAddress: string): Promise<ReferrerData> {
  const normalizedWallet = walletAddress.toLowerCase();

  // Already exists? Return it.
  const existing = await prisma.referrer.findUnique({ where: { walletAddress: normalizedWallet } });
  if (existing) return existing;

  // Try to create with the auto-derived slug
  let slug = deriveAutoSlug(normalizedWallet);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await prisma.referrer.create({
        data: {
          walletAddress: normalizedWallet,
          slug,
          slugType: 'auto',
          slugChangesRemaining: 1, // Explicit — don't rely on DB default
        },
      });
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2002' && attempt < 4) {
        // Slug collision — append 2 random hex chars
        const suffix = Math.random().toString(16).slice(2, 4);
        slug = `${deriveAutoSlug(normalizedWallet)}-${suffix}`;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Failed to create auto handle');
}

/**
 * Switch between auto and custom slug modes.
 * For "auto": sets slug to the auto-derived value.
 * For "custom": sets slug to the previously claimed customSlug (errors if none).
 *
 * Enforces slug change limit: each switch that changes the active slug
 * decrements slugChangesRemaining and stores the old slug as previousSlug
 * for 30-day redirect.
 */
export async function switchSlugType(
  walletAddress: string,
  type: 'auto' | 'custom',
): Promise<ReferrerData> {
  const normalizedWallet = walletAddress.toLowerCase();
  const referrer = await prisma.referrer.findUnique({ where: { walletAddress: normalizedWallet } });
  if (!referrer) throw new Error('Handle not found');

  // Check slug change limit
  if (referrer.slugChangesRemaining <= 0) {
    throw new Error('No slug changes remaining');
  }

  let newSlug: string;

  if (type === 'custom') {
    if (!referrer.customSlug) throw new Error('No custom slug claimed yet');
    newSlug = referrer.customSlug;
  } else {
    // Switch to auto
    newSlug = deriveAutoSlug(normalizedWallet);
    // If auto slug is taken by someone else, append suffix
    const slugOwner = await prisma.referrer.findUnique({ where: { slug: newSlug } });
    if (slugOwner && slugOwner.id !== referrer.id) {
      const suffix = Math.random().toString(16).slice(2, 4);
      newSlug = `${deriveAutoSlug(normalizedWallet)}-${suffix}`;
    }
  }

  // If the slug isn't actually changing, no-op (don't consume a change)
  if (newSlug === referrer.slug) {
    return prisma.referrer.update({
      where: { id: referrer.id },
      data: { slugType: type },
    });
  }

  // Active slug is changing — consume a change and store old slug for redirect
  return prisma.referrer.update({
    where: { id: referrer.id },
    data: {
      slug: newSlug,
      slugType: type,
      previousSlug: referrer.slug,
      slugChangedAt: new Date(),
      slugChangesRemaining: { decrement: 1 },
    },
  });
}

/**
 * Claim a custom slug for a wallet that already has an auto-handle.
 * Updates slug to the custom value and stores it in customSlug.
 */
export async function claimCustomSlug(walletAddress: string, slug: string): Promise<CreateResult> {
  const normalizedWallet = walletAddress.toLowerCase();
  const normalizedSlug = slug.toLowerCase().trim();

  const check = validateSlug(normalizedSlug);
  if (!check.available) {
    return { ok: false, code: check.reason === 'reserved' ? 'reserved_slug' : 'invalid_slug' };
  }

  const referrer = await prisma.referrer.findUnique({ where: { walletAddress: normalizedWallet } });
  if (!referrer) {
    // No handle yet — create one directly with custom slug
    return createReferrer(normalizedWallet, normalizedSlug);
  }

  // Already has a custom slug
  if (referrer.customSlug) {
    return { ok: false, code: 'wallet_exists', existing: referrer };
  }

  try {
    const updated = await prisma.referrer.update({
      where: { id: referrer.id },
      data: {
        slug: normalizedSlug,
        slugType: 'custom',
        customSlug: normalizedSlug,
      },
    });
    return { ok: true, referrer: updated };
  } catch (err: unknown) {
    const prismaErr = err as { code?: string };
    if (prismaErr.code === 'P2002') {
      return { ok: false, code: 'slug_taken' };
    }
    throw err;
  }
}

// =============================================================================
// Admin
// =============================================================================

/**
 * Admin: Delete a referrer record entirely so the wallet can re-register.
 * ReferralEvents cascade-delete via the FK constraint.
 * Returns the deleted referrer or null if not found.
 */
/**
 * Find a referrer by wallet address OR slug.
 */
export async function findReferrerByWalletOrSlug(input: string): Promise<ReferrerData | null> {
  const normalized = input.toLowerCase();
  // Full wallet address (0x + 40 hex chars) — search by wallet
  if (normalized.startsWith('0x') && normalized.length === 42) {
    return prisma.referrer.findUnique({ where: { walletAddress: normalized } });
  }
  // Otherwise treat as slug (includes short 0x-prefixed auto slugs like "0xf943")
  return prisma.referrer.findFirst({ where: { slug: normalized } });
}

export async function resetReferrer(walletOrSlug: string): Promise<ReferrerData | null> {
  const existing = await findReferrerByWalletOrSlug(walletOrSlug);
  if (!existing) return null;

  await prisma.referrer.delete({ where: { id: existing.id } });
  return existing;
}

/**
 * Admin: Reset slugChangesRemaining back to 1 without deleting the referrer.
 */
export async function resetSlugChanges(walletOrSlug: string): Promise<ReferrerData | null> {
  const existing = await findReferrerByWalletOrSlug(walletOrSlug);
  if (!existing) return null;

  // Reset slug changes AND clear customSlug so the handle can be re-customized.
  // Don't touch slug/slugType — changing slug risks unique constraint violations.
  return prisma.referrer.update({
    where: { id: existing.id },
    data: {
      slugChangesRemaining: 1,
      customSlug: null,
    },
  });
}

export async function listAllReferrers(
  page = 1,
  limit = 50,
): Promise<{
  referrers: ReferrerData[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const [referrers, total] = await Promise.all([
    prisma.referrer.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.referrer.count(),
  ]);

  return {
    referrers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}
