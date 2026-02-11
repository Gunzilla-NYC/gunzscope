/**
 * Settings API Routes
 *
 * PATCH /api/settings - Merge settings with existing
 * Body: { settings object to merge }
 *
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, updateSettings, getSettings } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export async function PATCH(request: NextRequest) {
  // Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    // Parse body
    const body = await request.json();

    // Validate body is an object
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return jsonError('Body must be an object', 400);
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found. Please call GET /api/me first.', 404);
    }

    // Update settings (merge with existing)
    const updatedSettings = await updateSettings(profile.id, body);

    return jsonSuccess({ settings: updatedSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return jsonError('Failed to update settings');
  }
}

export async function GET(request: NextRequest) {
  // Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found', 404);
    }

    // Get settings
    const settings = await getSettings(profile.id);

    return jsonSuccess({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return jsonError('Failed to fetch settings');
  }
}
