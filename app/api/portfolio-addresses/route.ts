/**
 * Portfolio Addresses API Routes
 *
 * POST /api/portfolio-addresses - Add a portfolio address
 * Body: { address: string, label?: string }
 *
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import {
  getProfileByDynamicId,
  addPortfolioAddress,
  getPortfolioAddressCount,
} from '@/lib/services/userService';

const MAX_PORTFOLIO_ADDRESSES = 5;

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
    const { address, label } = body;

    // Validate address
    if (!isValidAddress(address)) {
      return NextResponse.json(
        { success: false, error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Validate optional label
    if (label !== undefined && typeof label !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Label must be a string' },
        { status: 400 }
      );
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found. Please call GET /api/me first.' },
        { status: 404 }
      );
    }

    // Check portfolio address limit
    const count = await getPortfolioAddressCount(profile.id);
    if (count >= MAX_PORTFOLIO_ADDRESSES) {
      return NextResponse.json(
        { success: false, error: 'Portfolio limit reached (5 wallets maximum)' },
        { status: 403 }
      );
    }

    // Add portfolio address
    const portfolioAddress = await addPortfolioAddress(profile.id, {
      address,
      label,
    });

    return NextResponse.json({
      success: true,
      portfolioAddress,
    });
  } catch (error) {
    console.error('Error adding portfolio address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add portfolio address' },
      { status: 500 }
    );
  }
}
