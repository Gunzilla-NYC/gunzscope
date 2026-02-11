/**
 * Tracked Addresses API Routes
 *
 * POST /api/tracked-addresses - Add a tracked address
 * Body: { address: string, chain?: string, label?: string }
 *
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, addTrackedAddress } from '@/lib/services/userService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

// Basic address validation (non-empty, looks like an address)
function isValidAddress(address: unknown): address is string {
  if (typeof address !== 'string') return false;
  if (address.length < 20) return false;
  // EVM address check (0x prefix + 40 hex chars)
  if (address.startsWith('0x')) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
  // Solana-style (base58, 32-44 chars)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
    return true;
  }
  return false;
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
    const { address, chain, label } = body;

    // Validate address
    if (!isValidAddress(address)) {
      return jsonError('Invalid address format', 400);
    }

    // Validate optional fields
    if (chain !== undefined && typeof chain !== 'string') {
      return jsonError('Chain must be a string', 400);
    }
    if (label !== undefined && typeof label !== 'string') {
      return jsonError('Label must be a string', 400);
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return jsonError('Profile not found. Please call GET /api/me first.', 404);
    }

    // Add tracked address
    const tracked = await addTrackedAddress(profile.id, {
      address,
      chain,
      label,
    });

    return jsonSuccess({ trackedAddress: tracked });
  } catch (error) {
    console.error('Error adding tracked address:', error);
    return jsonError('Failed to add tracked address');
  }
}
