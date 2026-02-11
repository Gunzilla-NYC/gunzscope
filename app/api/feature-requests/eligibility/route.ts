/**
 * GET /api/feature-requests/eligibility - Check if user can participate
 * Returns eligible status and NFT count.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse, isAdminWallet } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { checkNFTEligibility } from '@/lib/services/nftEligibilityService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export async function GET(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('User profile not found', 404);
    }

    // Admin wallet always eligible
    if (isAdminWallet(authResult.user.walletAddress)) {
      return jsonSuccess({ eligible: true, nftCount: 0 });
    }

    const eligibility = await checkNFTEligibility(profile.id);

    return jsonSuccess({ ...eligibility });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return jsonError('Failed to check eligibility');
  }
}
