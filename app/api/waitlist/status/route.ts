import { NextRequest } from 'next/server';
import { getWaitlistStatus } from '@/lib/services/waitlistService';
import { isWhitelisted } from '@/lib/services/whitelistService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

/**
 * GET /api/waitlist/status?address={address}&email={email}
 * Public — returns waitlist position, referral count, and promotion threshold.
 * If the user has been promoted/whitelisted, returns { promoted: true }.
 * Accepts wallet address OR email (email stored as "email:user@example.com").
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  const email = request.nextUrl.searchParams.get('email');

  // Normalize: wallet address as-is, email gets "email:" prefix
  const identifier = address || (email ? `email:${email.toLowerCase()}` : null);
  if (!identifier) return jsonError('address or email is required', 400);

  // Check if already promoted (whitelisted)
  const whitelisted = await isWhitelisted(identifier);
  if (whitelisted) {
    return jsonSuccess({ promoted: true, identifier: identifier.toLowerCase() });
  }

  const status = await getWaitlistStatus(identifier);
  if (!status) {
    return jsonError('Not on waitlist', 404);
  }

  return jsonSuccess({ ...status });
}
