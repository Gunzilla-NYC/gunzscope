/**
 * POST /api/feature-requests/[id]/vote - Vote on a feature request
 * Auth + 20+ NFTs required (admin exempt). Toggle behavior: same vote again removes it.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse, isAdminWallet } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { checkNFTEligibility } from '@/lib/services/nftEligibilityService';
import { vote } from '@/lib/services/featureRequestService';
import { jsonSuccess, jsonError } from '@/lib/api/types';
import { isReadOnlyDatabase } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (isReadOnlyDatabase) {
    return jsonError('Voting is not available in production yet', 503);
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
        return jsonError('You need at least 20 OTG NFTs to vote', 403);
      }
    }

    const { id: featureRequestId } = await params;
    const body = await request.json();
    const { value } = body;

    if (value !== 1 && value !== -1) {
      return jsonError('Vote value must be 1 or -1', 400);
    }

    const result = await vote(profile.id, featureRequestId, value);

    return jsonSuccess({ ...result });
  } catch (error) {
    console.error('Error voting on feature request:', error);
    return jsonError('Failed to vote');
  }
}
