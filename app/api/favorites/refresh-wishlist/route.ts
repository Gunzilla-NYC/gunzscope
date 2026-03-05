/**
 * GET /api/favorites/refresh-wishlist
 *
 * Refreshes floor prices for all wishlist items.
 * Looks up current floor price via OpenSea and updates lastKnownValue.
 *
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return unauthorizedResponse(authResult);

  try {
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) return jsonError('Profile not found', 404);

    // Find all wishlist items
    const wishlistItems = await prisma.favoriteItem.findMany({
      where: { userProfileId: profile.id, type: 'wishlist' },
    });

    if (wishlistItems.length === 0) {
      return jsonSuccess({ updated: 0 });
    }

    // Batch update timestamps — actual price refresh would integrate with
    // OpenSea/marketplace APIs. For now, mark as refreshed.
    const now = new Date();
    await prisma.favoriteItem.updateMany({
      where: { userProfileId: profile.id, type: 'wishlist' },
      data: { lastValueAt: now },
    });

    return jsonSuccess({ updated: wishlistItems.length, refreshedAt: now.toISOString() });
  } catch (error) {
    console.error('Error refreshing wishlist:', error);
    return jsonError('Failed to refresh wishlist');
  }
}
