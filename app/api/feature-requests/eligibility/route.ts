/**
 * GET /api/feature-requests/eligibility - Check if user can participate
 * Returns eligible status and NFT count.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse, isAdminWallet } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId } from '@/lib/services/userService';
import { checkNFTEligibility } from '@/lib/services/nftEligibilityService';

export async function GET(request: NextRequest) {
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

    // Admin wallet always eligible
    if (isAdminWallet(authResult.user.walletAddress)) {
      return NextResponse.json({ success: true, eligible: true, nftCount: 0 });
    }

    const eligibility = await checkNFTEligibility(profile.id);

    return NextResponse.json({ success: true, ...eligibility });
  } catch (error) {
    console.error('Error checking eligibility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}
