/**
 * Favorites API Routes
 *
 * GET  /api/favorites - List all favorites, split by type
 * POST /api/favorites - Add a favorite item
 * Body: { type: string, refId: string, metadata?: object }
 *
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, addFavorite, listFavorites } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

const VALID_FAVORITE_TYPES = ['weapon', 'nft', 'attachment', 'skin', 'collection', 'wishlist'] as const;
type FavoriteType = typeof VALID_FAVORITE_TYPES[number];

function isValidFavoriteType(type: unknown): type is FavoriteType {
  return typeof type === 'string' && VALID_FAVORITE_TYPES.includes(type as FavoriteType);
}

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) return unauthorizedResponse(authResult);

  try {
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) return jsonError('Profile not found', 404);

    const favorites = await listFavorites(profile.id);
    return jsonSuccess(favorites);
  } catch (error) {
    console.error('Error listing favorites:', error);
    return jsonError('Failed to list favorites');
  }
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
      return jsonError(`Invalid type. Must be one of: ${VALID_FAVORITE_TYPES.join(', ')}`, 400);
    }

    // Validate refId
    if (typeof refId !== 'string' || !refId.trim()) {
      return jsonError('refId is required and must be a non-empty string', 400);
    }

    // Validate metadata if provided
    if (metadata !== undefined && (typeof metadata !== 'object' || metadata === null)) {
      return jsonError('metadata must be an object', 400);
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found. Please call GET /api/me first.', 404);
    }

    // Add favorite (with optional wishlist fields)
    const favorite = await addFavorite(profile.id, {
      type,
      refId: refId.trim(),
      metadata: metadata as Record<string, unknown>,
      ...(type === 'wishlist' && {
        externalContract: body.externalContract,
        externalTokenId: body.externalTokenId,
        externalChain: body.externalChain,
      }),
    });

    return jsonSuccess({ favorite });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return jsonError('Failed to add favorite');
  }
}
