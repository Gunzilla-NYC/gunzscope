/**
 * GET /api/me - Get current user profile with all relations
 *
 * Returns: UserProfile with wallets, tracked addresses, favorites, and settings
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { upsertUserProfile, getProfileByDynamicId } from '@/lib/services/userService';

export async function GET(request: NextRequest) {
  // Authenticate the request
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    // Get or create profile (upsert on first request)
    const profile = await upsertUserProfile(authResult.user);

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
