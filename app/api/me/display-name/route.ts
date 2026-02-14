/**
 * PATCH /api/me/display-name - Set user display name
 *
 * Body: { displayName: string | null }
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, updateDisplayName } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';
import { isReadOnlyDatabase } from '@/lib/db';

const DISPLAY_NAME_MAX = 30;
const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9 _.\-]+$/;

export async function PATCH(request: NextRequest) {
  if (isReadOnlyDatabase) {
    return jsonError('Display name updates are not available in production yet', 503);
  }

  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    const body = await request.json();
    const { displayName } = body;

    if (displayName !== null && displayName !== undefined) {
      if (typeof displayName !== 'string') {
        return jsonError('Display name must be a string or null', 400);
      }
      const trimmed = displayName.trim();
      if (trimmed.length > DISPLAY_NAME_MAX) {
        return jsonError(`Display name must be ${DISPLAY_NAME_MAX} characters or less`, 400);
      }
      if (trimmed && !DISPLAY_NAME_REGEX.test(trimmed)) {
        return jsonError('Display name can only contain letters, numbers, spaces, underscores, hyphens, and dots', 400);
      }
    }

    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found', 404);
    }

    const finalName = displayName?.trim() || null;
    await updateDisplayName(profile.id, finalName);

    return jsonSuccess({ displayName: finalName });
  } catch (error) {
    console.error('Error updating display name:', error);
    return jsonError('Failed to update display name');
  }
}
