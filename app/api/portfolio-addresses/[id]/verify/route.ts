/**
 * Wallet Ownership Verification
 *
 * POST /api/portfolio-addresses/:id/verify
 * Body: { message: string, signature: string }
 *
 * Verifies that the user owns the wallet by checking an EIP-191 personal_sign signature.
 * The recovered address must match the stored portfolio address.
 */

import { NextRequest } from 'next/server';
import { ethers } from 'ethers';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, verifyPortfolioAddress } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';
import { prisma } from '@/lib/db';

const MAX_NONCE_AGE_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { message, signature } = body;

    if (typeof message !== 'string' || typeof signature !== 'string') {
      return jsonError('Missing message or signature', 400);
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found', 404);
    }

    // Load the portfolio address and confirm ownership
    const portfolioAddress = await prisma.portfolioAddress.findFirst({
      where: { id, userProfileId: profile.id },
    });
    if (!portfolioAddress) {
      return jsonError('Portfolio address not found', 404);
    }

    // Already verified
    if (portfolioAddress.verified) {
      return jsonSuccess({
        portfolioAddress: {
          id: portfolioAddress.id,
          address: portfolioAddress.address,
          verified: true,
          verifiedAt: portfolioAddress.verifiedAt?.toISOString() ?? null,
          status: portfolioAddress.status,
        },
      });
    }

    // Validate message format — extract nonce for replay protection
    const nonceMatch = message.match(/Nonce:\s*(\d+)/);
    if (!nonceMatch) {
      return jsonError('Invalid message format: missing nonce', 400);
    }
    const nonce = parseInt(nonceMatch[1], 10);
    if (Date.now() - nonce > MAX_NONCE_AGE_MS) {
      return jsonError('Signature expired — please try again', 400);
    }

    // Validate message contains the correct wallet address
    const walletMatch = message.match(/Wallet:\s*(0x[a-fA-F0-9]{40})/i);
    if (!walletMatch || walletMatch[1].toLowerCase() !== portfolioAddress.address.toLowerCase()) {
      return jsonError('Message wallet does not match portfolio address', 400);
    }

    // Recover signer address from EIP-191 personal_sign
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch {
      return jsonError('Invalid signature', 400);
    }

    // Compare recovered address with stored address
    if (recoveredAddress.toLowerCase() !== portfolioAddress.address.toLowerCase()) {
      return jsonError(
        'Signature does not match this wallet address. Make sure you sign with the correct wallet.',
        403
      );
    }

    // Mark as verified
    const updated = await verifyPortfolioAddress(profile.id, id);
    if (!updated) {
      return jsonError('Failed to verify address', 500);
    }

    return jsonSuccess({
      portfolioAddress: {
        id: updated.id,
        address: updated.address,
        verified: updated.verified,
        verifiedAt: updated.verifiedAt?.toISOString() ?? null,
        status: updated.status,
      },
    });
  } catch (error) {
    console.error('Error verifying portfolio address:', error);
    return jsonError('Verification failed');
  }
}
