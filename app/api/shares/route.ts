import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { getOrCreateShareLink } from '@/lib/services/shareService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

/**
 * POST /api/shares — Get or create a share link (permanent, no snapshots)
 *
 * Auth is optional: authenticated users get credit on the leaderboard,
 * unauthenticated users get a working short URL but no attribution.
 *
 * If an active link already exists for the same (address, platform),
 * the existing link's code is returned (idempotent).
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

    const platform = body.platform as 'x' | 'discord' | 'copy' | 'link';
    if (!['x', 'discord', 'copy', 'link'].includes(platform)) {
      return jsonError('platform must be "x", "discord", "copy", or "link"', 400);
    }

    const link = await getOrCreateShareLink({
      userProfileId,
      address: body.address,
      platform,
    });

    return jsonSuccess({ code: link.code }, 201);
  } catch {
    return jsonError('Failed to create share link', 500);
  }
}
