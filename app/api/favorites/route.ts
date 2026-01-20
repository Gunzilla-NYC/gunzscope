/**
 * Favorites API Routes
 *
 * POST /api/favorites - Add a favorite item
 * Body: { type: string, refId: string, metadata?: object }
 *
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, addFavorite } from '@/lib/services/userService';

const VALID_FAVORITE_TYPES = ['weapon', 'nft', 'attachment', 'skin', 'collection'] as const;
type FavoriteType = typeof VALID_FAVORITE_TYPES[number];

function isValidFavoriteType(type: unknown): type is FavoriteType {
  return typeof type === 'string' && VALID_FAVORITE_TYPES.includes(type as FavoriteType);
}

export async function POST(request: NextRequest) {
  // Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    // Parse body
    const body = await request.json();
    const { type, refId, metadata } = body;

    // Validate type
    if (!isValidFavoriteType(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid type. Must be one of: ${VALID_FAVORITE_TYPES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate refId
    if (typeof refId !== 'string' || !refId.trim()) {
      return NextResponse.json(
        { success: false, error: 'refId is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate metadata if provided
    if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null)) {
      return NextResponse.json(
        { success: false, error: 'metadata must be an object' },
        { status: 400 }
      );
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found. Please call GET /api/me first.' },
        { status: 404 }
      );
    }

    // Add favorite
    const favorite = await addFavorite(profile.id, {
      type,
      refId: refId.trim(),
      metadata: metadata as Record<string, unknown>,
    });

    return NextResponse.json({
      success: true,
      favorite,
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add favorite' },
      { status: 500 }
    );
  }
}
