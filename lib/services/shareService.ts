import prisma from '../db';
import { generateShortCode } from '../utils/shortCode';

// =============================================================================
// Types
// =============================================================================

export type SharePlatform = 'link' | 'discord' | 'x';

export interface CreateShareInput {
  userProfileId?: string;
  address: string;
  totalUsd?: string;
  gunBalance?: string;
  nftCount?: number;
  nftPnlPct?: string;
  gunSpent?: string;
  platform: SharePlatform | 'copy'; // 'copy' is legacy, treated as 'link'
}

export interface ShareLinkData {
  id: string;
  code: string;
  address: string;
  totalUsd: string | null;
  gunBalance: string | null;
  nftCount: number | null;
  nftPnlPct: string | null;
  gunSpent: string | null;
  platform: string;
  viewCount: number;
  createdAt: Date;
}

// =============================================================================
// Create
// =============================================================================

/** Create a new share link with a unique short code (retry for collision) */
export async function createShareLink(input: CreateShareInput): Promise<ShareLinkData> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateShortCode();
    try {
      return await prisma.shareLink.create({
        data: {
          code,
          userProfileId: input.userProfileId ?? null,
          address: input.address.toLowerCase(),
          totalUsd: input.totalUsd ?? null,
          gunBalance: input.gunBalance ?? null,
          nftCount: input.nftCount ?? null,
          nftPnlPct: input.nftPnlPct ?? null,
          gunSpent: input.gunSpent ?? null,
          platform: input.platform,
        },
      });
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2002' && attempt < 2) continue;
      throw err;
    }
  }
  throw new Error('Failed to generate unique share code');
}

// =============================================================================
// Lookup
// =============================================================================

/** Look up a share link by its short code. */
export async function getShareLinkByCode(code: string): Promise<ShareLinkData | null> {
  return prisma.shareLink.findUnique({ where: { code } });
}

// =============================================================================
// Click tracking
// =============================================================================

/** Increment view count and record click event (fire-and-forget) */
export async function recordClick(
  shareLinkId: string,
  referrer?: string,
  userAgent?: string,
): Promise<void> {
  await prisma.$transaction([
    prisma.shareLink.update({
      where: { id: shareLinkId },
      data: { viewCount: { increment: 1 } },
    }),
    prisma.shareClick.create({
      data: {
        shareLinkId,
        referrer: referrer?.slice(0, 500) ?? null,
        userAgent: userAgent?.slice(0, 300) ?? null,
      },
    }),
  ]);
}

// =============================================================================
// User stats (account page)
// =============================================================================

export interface UserShareStats {
  totalShares: number;
  totalViews: number;
  shares: ShareLinkData[];
}

/** Get share stats for a specific user */
export async function getUserShareStats(userProfileId: string): Promise<UserShareStats> {
  const shares = await prisma.shareLink.findMany({
    where: { userProfileId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const totalShares = shares.length;
  const totalViews = shares.reduce((sum, s) => sum + s.viewCount, 0);
  return { totalShares, totalViews, shares };
}

// =============================================================================
// UPSERT Share Link (1-per-method)
// =============================================================================

/** Normalize legacy 'copy' platform to 'link'. */
function normalizePlatform(platform: string): SharePlatform {
  return platform === 'copy' ? 'link' : platform as SharePlatform;
}

/**
 * Create or replace a share link for the given (address, platform) pair.
 * On conflict: archives the existing link, creates a new one with a fresh code.
 * Enforces the 1-link-per-method constraint.
 */
export async function upsertShareLink(input: CreateShareInput): Promise<ShareLinkData> {
  const address = input.address.toLowerCase();
  const platform = normalizePlatform(input.platform);
  const snapshotData = {
    totalUsd: input.totalUsd ?? null,
    gunBalance: input.gunBalance ?? null,
    nftCount: input.nftCount ?? null,
    nftPnlPct: input.nftPnlPct ?? null,
    gunSpent: input.gunSpent ?? null,
  };

  // Check for existing active link
  const existing = await prisma.shareLink.findFirst({
    where: { address, platform, archived: false },
  });

  const newCode = generateShortCode();

  if (existing) {
    // Archive the old link and create a new one in a transaction
    const [, created] = await prisma.$transaction([
      prisma.shareLink.update({
        where: { id: existing.id },
        data: { archived: true, archivedRedirectTo: newCode },
      }),
      prisma.shareLink.create({
        data: {
          code: newCode,
          userProfileId: input.userProfileId ?? null,
          address,
          platform,
          ...snapshotData,
        },
      }),
    ]);
    return created;
  }

  // No existing link — create new
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = attempt === 0 ? newCode : generateShortCode();
    try {
      return await prisma.shareLink.create({
        data: {
          code,
          userProfileId: input.userProfileId ?? null,
          address,
          platform,
          ...snapshotData,
        },
      });
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2002' && attempt < 2) continue;
      throw err;
    }
  }
  throw new Error('Failed to generate unique share code');
}

// =============================================================================
// Get-or-Create Share Link (v2.1 — permanent, no snapshots)
// =============================================================================

/**
 * Get an existing share link for (address, platform), or create a new one if empty.
 * Links are permanent — once created they are never replaced.
 * No snapshot data is stored; OG cards use live PortfolioCache instead.
 */
export async function getOrCreateShareLink(input: {
  userProfileId?: string;
  address: string;
  platform: SharePlatform | 'copy';
}): Promise<ShareLinkData> {
  const address = input.address.toLowerCase();
  const platform = normalizePlatform(input.platform);

  // Return existing if slot is filled
  const existing = await prisma.shareLink.findFirst({
    where: { address, platform, archived: false },
  });
  if (existing) return existing;

  // INSERT new (no snapshot fields)
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateShortCode();
    try {
      return await prisma.shareLink.create({
        data: {
          code,
          userProfileId: input.userProfileId ?? null,
          address,
          platform,
        },
      });
    } catch (err: unknown) {
      const prismaErr = err as { code?: string };
      if (prismaErr.code === 'P2002' && attempt < 2) continue;
      throw err;
    }
  }
  throw new Error('Failed to generate unique share code');
}

// =============================================================================
// Share Slots (3 per wallet)
// =============================================================================

export interface ShareSlot {
  method: SharePlatform;
  active: boolean;
  code: string | null;
  viewCount: number;
  createdAt: string | null;
}

const ALL_METHODS: SharePlatform[] = ['link', 'discord', 'x'];

/** Get the 3 share slots for a wallet — one per method, some may be empty. */
export async function getShareSlots(address: string): Promise<ShareSlot[]> {
  const links = await prisma.shareLink.findMany({
    where: { address: address.toLowerCase(), archived: false },
  });

  const linkMap = new Map(links.map(l => [l.platform, l]));

  return ALL_METHODS.map(method => {
    const link = linkMap.get(method);
    return {
      method,
      active: !!link,
      code: link?.code ?? null,
      viewCount: link?.viewCount ?? 0,
      createdAt: link?.createdAt?.toISOString() ?? null,
    };
  });
}

// =============================================================================
// Unified Stats (share views + referral data)
// =============================================================================

export interface UnifiedStats {
  activeLinks: number;
  totalViews: number;
  totalConnected: number;
  totalConversions: number;
  cvrRate: number;
}

/** Get combined share + referral stats for a wallet address. */
export async function getUnifiedStats(address: string): Promise<UnifiedStats> {
  const normalizedAddr = address.toLowerCase();

  // Active share links count
  const activeShares = await prisma.shareLink.findMany({
    where: { address: normalizedAddr, archived: false },
    select: { viewCount: true },
  });
  const activeLinks = activeShares.length;

  // Total views across ALL links (active + archived) — cumulative, survives regeneration
  const allShares = await prisma.shareLink.findMany({
    where: { address: normalizedAddr },
    select: { viewCount: true },
  });
  const totalViews = allShares.reduce((sum, s) => sum + s.viewCount, 0);

  // Referral stats from Referrer model
  const referrer = await prisma.referrer.findUnique({
    where: { walletAddress: normalizedAddr },
    select: { totalClicks: true, totalConversions: true, id: true },
  });

  let totalConnected = 0;
  const totalConversions = referrer?.totalConversions ?? 0;

  if (referrer) {
    totalConnected = await prisma.referralEvent.count({
      where: {
        referrerId: referrer.id,
        status: { in: ['wallet_connected', 'portfolio_loaded'] },
      },
    });
  }

  // CVR = wallets connected / total share link views (the real top-of-funnel)
  const totalImpressions = totalViews + (referrer?.totalClicks ?? 0);
  const cvrRate = totalImpressions > 0
    ? Math.round((totalConnected / totalImpressions) * 1000) / 10
    : 0;

  return { activeLinks, totalViews, totalConnected, totalConversions, cvrRate };
}

// =============================================================================
// Admin leaderboard
// =============================================================================

export interface LeaderboardEntry {
  userProfileId: string;
  displayName: string | null;
  primaryWallet: string | null;
  totalViews: number;
  shareCount: number;
}

export interface TopPortfolioEntry {
  address: string;
  totalViews: number;
  shareCount: number;
}

/** Get top sharers by views and share count, plus most-shared portfolios */
export async function getShareLeaderboard(limit = 20): Promise<{
  byViews: LeaderboardEntry[];
  byShares: LeaderboardEntry[];
  topPortfolios: TopPortfolioEntry[];
}> {
  const results = await prisma.shareLink.groupBy({
    by: ['userProfileId'],
    where: { userProfileId: { not: null } },
    _sum: { viewCount: true },
    _count: true,
    orderBy: { _sum: { viewCount: 'desc' } },
    take: limit,
  });

  const userIds = results.map(r => r.userProfileId).filter(Boolean) as string[];
  const profiles = await prisma.userProfile.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      displayName: true,
      wallets: { select: { address: true, isPrimary: true }, orderBy: { isPrimary: 'desc' }, take: 1 },
    },
  });
  const nameMap = new Map(profiles.map(p => [p.id, p.displayName]));
  const walletMap = new Map(profiles.map(p => [p.id, p.wallets[0]?.address ?? null]));

  const enriched = results.map(r => ({
    userProfileId: r.userProfileId!,
    displayName: nameMap.get(r.userProfileId!) ?? null,
    primaryWallet: walletMap.get(r.userProfileId!) ?? null,
    totalViews: r._sum.viewCount ?? 0,
    shareCount: r._count,
  }));

  const byViews = [...enriched].sort((a, b) => b.totalViews - a.totalViews);
  const byShares = [...enriched].sort((a, b) => b.shareCount - a.shareCount);

  // Top shared portfolios (grouped by wallet address)
  const portfolioResults = await prisma.shareLink.groupBy({
    by: ['address'],
    _sum: { viewCount: true },
    _count: true,
    orderBy: { _sum: { viewCount: 'desc' } },
    take: limit,
  });

  const topPortfolios: TopPortfolioEntry[] = portfolioResults.map(r => ({
    address: r.address,
    totalViews: r._sum.viewCount ?? 0,
    shareCount: r._count,
  }));

  return { byViews, byShares, topPortfolios };
}
