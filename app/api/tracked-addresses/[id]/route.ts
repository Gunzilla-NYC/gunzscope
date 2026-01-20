/**
 * Tracked Address by ID API Routes
 *
 * DELETE /api/tracked-addresses/:id - Remove a tracked address
 *
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, removeTrackedAddress } from '@/lib/services/userService';

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
      return NextResponse.json(
        { success: false, error: 'Missing ID parameter' },
        { status: 400 }
      );
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Remove tracked address (only if owned by this user)
    const deleted = await removeTrackedAddress(profile.id, id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Tracked address not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedId: id,
    });
  } catch (error) {
    console.error('Error removing tracked address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove tracked address' },
      { status: 500 }
    );
  }
}
