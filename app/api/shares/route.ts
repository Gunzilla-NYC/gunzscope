import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { createShareLink } from '@/lib/services/shareService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

/**
 * POST /api/shares — Create a share link
 *
 * Auth is optional: authenticated users get credit on the leaderboard,
 * unauthenticated users get a working short URL but no attribution.
 */
export async function POST(request: NextRequest) {
  let userProfileId: string | undefined;

  // Try to authenticate (optional)
  const authResult = await authenticateRequest(request);
  if (authResult.success) {
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (profile) {
      userProfileId = profile.id;
    }
  }

  try {
    const body = await request.json();

    if (!body.address || typeof body.address !== 'string') {
      return jsonError('address is required', 400);
    }

    const platform = body.platform as 'x' | 'discord' | 'copy';
    if (!['x', 'discord', 'copy'].includes(platform)) {
      return jsonError('platform must be "x", "discord", or "copy"', 400);
    }

    const link = await createShareLink({
      userProfileId,
      address: body.address,
      totalUsd: body.totalUsd ?? undefined,
      gunBalance: body.gunBalance ?? undefined,
      nftCount: body.nftCount !== undefined ? Number(body.nftCount) : undefined,
      nftPnlPct: body.nftPnlPct ?? undefined,
      gunSpent: body.gunSpent ?? undefined,
      platform,
    });

    return jsonSuccess({ code: link.code }, 201);
  } catch {
    return jsonError('Failed to create share link', 500);
  }
}
