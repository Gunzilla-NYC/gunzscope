/**
 * POST /api/me/email - Set user email
 *
 * Body: { email: string | null }
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, updateUserEmail } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export async function POST(request: NextRequest) {
  // Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    // Parse body
    const body = await request.json();
    const { email } = body;

    // Basic email validation (null is allowed to clear)
    if (email !== null && email !== undefined) {
      if (typeof email !== 'string') {
        return jsonError('Email must be a string or null', 400);
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonError('Invalid email format', 400);
      }
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found', 404);
    }

    // Update email
    await updateUserEmail(profile.id, email || null);

    return jsonSuccess({ email: email || null });
  } catch (error) {
    console.error('Error updating email:', error);
    return jsonError('Failed to update email');
  }
}
