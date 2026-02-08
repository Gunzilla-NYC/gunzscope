/**
 * GET /api/feature-requests - List all feature requests
 * POST /api/feature-requests - Create a new feature request (auth + 5+ NFTs required)
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { checkNFTEligibility } from '@/lib/services/nftEligibilityService';
import { getAll, create } from '@/lib/services/featureRequestService';

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

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching feature requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch feature requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check NFT eligibility
    const eligibility = await checkNFTEligibility(profile.id);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { success: false, error: 'You need at least 5 OTG NFTs to submit feature requests', nftCount: eligibility.nftCount },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description } = body;

    // Validate input
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }
    if (title.trim().length > 100) {
      return NextResponse.json(
        { success: false, error: 'Title must be 100 characters or less' },
        { status: 400 }
      );
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }
    if (description.trim().length > 500) {
      return NextResponse.json(
        { success: false, error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    const featureRequest = await create(profile.id, title, description);

    return NextResponse.json({ success: true, request: featureRequest }, { status: 201 });
  } catch (error) {
    console.error('Error creating feature request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create feature request' },
      { status: 500 }
    );
  }
}
