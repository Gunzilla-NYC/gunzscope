import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { getUserShareStats } from '@/lib/services/shareService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

/**
 * GET /api/shares/stats — Get authenticated user's share stats
 */
export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  const profile = await getProfileByDynamicId(authResult.user.userId);
  if (!profile) {
    return jsonError('Profile not found', 404);
  }

  try {
    const stats = await getUserShareStats(profile.id);
    return jsonSuccess({
      totalShares: stats.totalShares,
      totalViews: stats.totalViews,
      shares: stats.shares.map(s => ({
        code: s.code,
        address: s.address,
        platform: s.platform,
        viewCount: s.viewCount,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  } catch {
    return jsonError('Failed to fetch share stats', 500);
  }
}
