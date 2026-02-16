import prisma from '../db';
import { generateShortCode } from '../utils/shortCode';

// =============================================================================
// Types
// =============================================================================

export interface CreateShareInput {
  userProfileId?: string;
  address: string;
  totalUsd?: string;
  gunBalance?: string;
  nftCount?: number;
  nftPnlPct?: string;
  platform: 'x' | 'discord' | 'copy';
}

export interface ShareLinkData {
  id: string;
  code: string;
  address: string;
  totalUsd: string | null;
  gunBalance: string | null;
  nftCount: number | null;
  nftPnlPct: string | null;
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

/** Look up a share link by its short code */
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
// Admin leaderboard
// =============================================================================

export interface LeaderboardEntry {
  userProfileId: string;
  displayName: string | null;
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
    select: { id: true, displayName: true },
  });
  const nameMap = new Map(profiles.map(p => [p.id, p.displayName]));

  const enriched = results.map(r => ({
    userProfileId: r.userProfileId!,
    displayName: nameMap.get(r.userProfileId!) ?? null,
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
