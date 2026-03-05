/**
 * GET /api/me - Get current user profile with all relations
 *
 * Returns: UserProfile with wallets, tracked addresses, favorites, and settings
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { upsertUserProfileWithRecovery } from '@/lib/services/userService';
import { isWhitelisted } from '@/lib/services/whitelistService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  // Whitelist gate — prevent ghost profiles for non-whitelisted users
  const identifier =
    authResult.user.walletAddress ||
    (authResult.user.email ? `email:${authResult.user.email}` : null);

  if (!identifier || !(await isWhitelisted(identifier))) {
    return jsonError('Not whitelisted', 403);
  }

  try {
    const profile = await upsertUserProfileWithRecovery(authResult.user);
    return jsonSuccess({ profile });
  } catch (error) {
    console.error('Error fetching user profile:', error instanceof Error ? error.message : error);
    return jsonError('Failed to fetch profile');
  }
}
