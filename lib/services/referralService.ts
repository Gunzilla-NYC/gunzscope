import prisma from '../db';

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
      data: { walletAddress: normalizedWallet, slug: normalizedSlug },
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

  // Guard: wallet is itself a registered referrer
  const isReferrer = await prisma.referrer.findUnique({ where: { walletAddress: normalizedWallet } });
  if (isReferrer) return;

  await prisma.referralEvent.update({
    where: { id: event.id },
    data: {
      referredWallet: normalizedWallet,
      status: 'wallet_connected',
      walletConnectedAt: new Date(),
    },
  });
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
// Admin
// =============================================================================

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
