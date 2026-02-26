import { NextRequest } from 'next/server';
import { getWaitlistStatus } from '@/lib/services/waitlistService';
import { isWhitelisted } from '@/lib/services/whitelistService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

/**
 * GET /api/waitlist/status?address={address}
 * Public — returns waitlist position, referral count, and promotion threshold.
 * If the user has been promoted/whitelisted, returns { promoted: true }.
 * No sensitive data exposed — position and referral count are non-private.
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) return jsonError('address is required', 400);

  // Check if already promoted (whitelisted)
  const whitelisted = await isWhitelisted(address);
  if (whitelisted) {
    return jsonSuccess({ promoted: true, address: address.toLowerCase() });
  }

  const status = await getWaitlistStatus(address);
  if (!status) {
    return jsonError('Not on waitlist', 404);
  }

  return jsonSuccess({ ...status });
}
