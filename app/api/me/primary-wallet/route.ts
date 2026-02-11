/**
 * PUT /api/me/primary-wallet - Set a wallet as the primary wallet
 * Requires authentication. Wallet must belong to the user's profile.
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, setPrimaryWallet } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export async function PUT(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    const { address } = await request.json();
    if (!address || typeof address !== 'string') {
      return jsonError('Address required', 400);
    }

    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found', 404);
    }

    // Verify wallet belongs to this profile
    const owns = profile.wallets.some(
      (w) => w.address.toLowerCase() === address.toLowerCase()
    );
    if (!owns) {
      return jsonError('Wallet not linked to this profile', 403);
    }

    await setPrimaryWallet(profile.id, address);

    return jsonSuccess({});
  } catch (error) {
    console.error('Error setting primary wallet:', error);
    return jsonError('Failed to set primary wallet');
  }
}
