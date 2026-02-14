/**
 * GET /api/feature-requests - List all feature requests
 * POST /api/feature-requests - Create a new feature request (auth + 20+ NFTs required, admin exempt)
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse, isAdminWallet } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { checkNFTEligibility } from '@/lib/services/nftEligibilityService';
import { getAll, create } from '@/lib/services/featureRequestService';
import { jsonSuccess, jsonError } from '@/lib/api/types';
import { isReadOnlyDatabase } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Auth is optional for GET — if authenticated, include user's votes
    let userId: string | undefined;
    const authResult = await authenticateRequest(request);
    if (authResult.success) {
      const profile = await getProfileByDynamicId(authResult.user.userId);
      if (profile) {
        userId = profile.id;
      }
    }

    const requests = await getAll(userId);

    // Sort by net votes descending
    requests.sort((a, b) => b.netVotes - a.netVotes);

    return jsonSuccess({ requests });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    return jsonError('Failed to fetch feature requests');
  }
}

export async function POST(request: NextRequest) {
  if (isReadOnlyDatabase) {
    return jsonError('Feature request submissions are not available in production yet', 503);
  }

  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('User profile not found', 404);
    }

    // Check NFT eligibility (admin exempt)
    if (!isAdminWallet(authResult.user.walletAddress)) {
      const eligibility = await checkNFTEligibility(profile.id);
      if (!eligibility.eligible) {
        return jsonError('You need at least 20 OTG NFTs to submit feature requests', 403);
      }
    }

    const body = await request.json();
    const { title, description } = body;

    // Validate input
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return jsonError('Title is required', 400);
    }
    if (title.trim().length > 100) {
      return jsonError('Title must be 100 characters or less', 400);
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return jsonError('Description is required', 400);
    }
    if (description.trim().length > 500) {
      return jsonError('Description must be 500 characters or less', 400);
    }

    const featureRequest = await create(profile.id, title, description);

    return jsonSuccess({ request: featureRequest }, 201);
  } catch (error) {
    console.error('Error creating feature request:', error);
    return jsonError('Failed to create feature request');
  }
}
