/**
 * GET /api/me - Get current user profile with all relations
 *
 * Returns: UserProfile with wallets, tracked addresses, favorites, and settings
 * Requires: Bearer token from Dynamic auth
 *
 * On Vercel (read-only SQLite), this first tries a read-only lookup.
 * If the profile exists, it's returned without any writes.
 * If the profile doesn't exist, it attempts an upsert (which will only
 * succeed in writable environments like local dev).
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, upsertUserProfileWithRecovery } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  // Authenticate the request
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    // Try read-only lookup first (works on Vercel's read-only filesystem)
    const existingProfile = await getProfileByDynamicId(authResult.user.userId);
    if (existingProfile) {
      return jsonSuccess({ profile: existingProfile });
    }

    // Profile doesn't exist — try to create (fails on read-only filesystem)
    const profile = await upsertUserProfileWithRecovery(authResult.user);
    return jsonSuccess({ profile });
  } catch (error) {
    console.error('Error fetching user profile:', error instanceof Error ? error.message : error);
    return jsonError('Failed to fetch profile');
  }
}
