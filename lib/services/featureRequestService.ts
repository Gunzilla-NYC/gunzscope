/**
 * Feature Request Service
 *
 * CRUD operations for feature requests and voting.
 */

import prisma from '../db';

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

/** Resolve author display name: displayName → truncated primary wallet → null */
function resolveAuthorName(
  author: { displayName: string | null; wallets: { address: string }[] }
): string | null {
  if (author.displayName) return author.displayName;
  const primary = author.wallets[0];
  if (primary) return truncateAddress(primary.address);
  return null;
}

const AUTHOR_SELECT = {
  displayName: true,
  wallets: {
    where: { isPrimary: true },
    select: { address: true },
    take: 1,
  },
} as const;

export interface FeatureRequestWithVotes {
  id: string;
  title: string;
  description: string;
  status: string;
  adminNote: string | null;
  showAttribution: boolean;
  authorId: string;
  authorName: string | null;
  netVotes: number;
  userVote: number | null; // +1, -1, or null if user hasn't voted
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get all feature requests with vote tallies.
 * If userId is provided, includes the user's vote on each request.
 */
export async function getAll(userId?: string): Promise<FeatureRequestWithVotes[]> {
  const requests = await prisma.featureRequest.findMany({
    include: {
      author: { select: AUTHOR_SELECT },
      votes: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map((r) => {
    const netVotes = r.votes.reduce((sum, v) => sum + v.value, 0);
    const userVote = userId
      ? r.votes.find((v) => v.userId === userId)?.value ?? null
      : null;

    return {
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      adminNote: r.adminNote ?? null,
      showAttribution: r.showAttribution,
      authorId: r.authorId,
      authorName: resolveAuthorName(r.author),
      netVotes,
      userVote,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  });
}

/**
 * Create a new feature request.
 */
export async function create(
  userId: string,
  title: string,
  description: string
): Promise<FeatureRequestWithVotes> {
  const request = await prisma.featureRequest.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      authorId: userId,
    },
    include: {
      author: { select: AUTHOR_SELECT },
    },
  });

  return {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    adminNote: null,
    showAttribution: false,
    authorId: request.authorId,
    authorName: resolveAuthorName(request.author),
    netVotes: 0,
    userVote: null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

/**
 * Vote on a feature request. Toggle behavior:
 * - If user has no vote, creates one with the given value
 * - If user votes the same direction again, removes the vote
 * - If user votes the opposite direction, updates to new value
 *
 * Returns the new net vote count and the user's current vote.
 */
export async function vote(
  userId: string,
  featureRequestId: string,
  value: 1 | -1
): Promise<{ netVotes: number; userVote: number | null }> {
  // Check if user already voted
  const existing = await prisma.featureRequestVote.findUnique({
    where: {
      userId_featureRequestId: { userId, featureRequestId },
    },
  });

  if (existing) {
    if (existing.value === value) {
      // Same vote again — toggle off (remove)
      await prisma.featureRequestVote.delete({
        where: { id: existing.id },
      });
    } else {
      // Opposite vote — update
      await prisma.featureRequestVote.update({
        where: { id: existing.id },
        data: { value },
      });
    }
  } else {
    // No existing vote — create
    await prisma.featureRequestVote.create({
      data: { userId, featureRequestId, value },
    });
  }

  // Recalculate net votes
  const allVotes = await prisma.featureRequestVote.findMany({
    where: { featureRequestId },
    select: { value: true, userId: true },
  });

  const netVotes = allVotes.reduce((sum, v) => sum + v.value, 0);
  const userVote = allVotes.find((v) => v.userId === userId)?.value ?? null;

  return { netVotes, userVote };
}

/**
 * Update the status of a feature request (admin only).
 */
export async function updateStatus(
  featureRequestId: string,
  status: 'open' | 'planned' | 'completed' | 'declined',
  adminNote?: string | null,
  showAttribution?: boolean
): Promise<void> {
  await prisma.featureRequest.update({
    where: { id: featureRequestId },
    data: {
      status,
      adminNote: adminNote !== undefined ? (adminNote || null) : undefined,
      ...(showAttribution !== undefined && { showAttribution }),
    },
  });
}

/**
 * Delete a feature request and its votes (admin only).
 * Votes must be deleted first due to foreign key constraint.
 */
export async function deleteRequest(featureRequestId: string): Promise<void> {
  await prisma.featureRequestVote.deleteMany({
    where: { featureRequestId },
  });
  await prisma.featureRequest.delete({
    where: { id: featureRequestId },
  });
}
