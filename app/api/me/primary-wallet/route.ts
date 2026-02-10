/**
 * PUT /api/me/primary-wallet - Set a wallet as the primary wallet
 * Requires authentication. Wallet must belong to the user's profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, setPrimaryWallet } from '@/lib/services/userService';

export async function PUT(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    const { address } = await request.json();
    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Address required' },
        { status: 400 }
      );
    }

    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Verify wallet belongs to this profile
    const owns = profile.wallets.some(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );
    if (!owns) {
      return NextResponse.json(
        { success: false, error: 'Wallet not linked to this profile' },
        { status: 403 }
      );
    }

    await setPrimaryWallet(profile.id, address);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting primary wallet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set primary wallet' },
      { status: 500 }
    );
  }
}
