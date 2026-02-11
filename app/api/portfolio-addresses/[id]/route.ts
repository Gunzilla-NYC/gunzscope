/**
 * Portfolio Address by ID API Routes
 *
 * DELETE /api/portfolio-addresses/:id - Remove a portfolio address
 *
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, removePortfolioAddress } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    const { id } = await params;

    if (!id) {
      return jsonError('Missing ID parameter', 400);
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found', 404);
    }

    // Remove portfolio address (only if owned by this user)
    const deleted = await removePortfolioAddress(profile.id, id);

    if (!deleted) {
      return jsonError('Portfolio address not found', 404);
    }

    return jsonSuccess({ deletedId: id });
  } catch (error) {
    console.error('Error removing portfolio address:', error);
    return jsonError('Failed to remove portfolio address');
  }
}
