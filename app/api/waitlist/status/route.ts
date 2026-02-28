import { NextRequest } from 'next/server';
import { getWaitlistStatus, bumpExpiredTrialThreshold } from '@/lib/services/waitlistService';
import { getWhitelistStatus } from '@/lib/services/whitelistService';
import { isBanned } from '@/lib/services/banService';
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

  // Check ban first
  if (await isBanned(identifier)) {
    return jsonSuccess({ banned: true });
  }

  // Check whitelist status (expiry-aware)
  const wlStatus = await getWhitelistStatus(identifier);

  if (wlStatus.status === 'permanent' || wlStatus.status === 'trial') {
    return jsonSuccess({
      promoted: true,
      identifier: identifier.toLowerCase(),
      ...(wlStatus.status === 'trial' && {
        trial: true,
        expiresAt: wlStatus.expiresAt?.toISOString(),
      }),
    });
  }

  // Expired trial — return waitlist data with trialExpired flag
  const status = await getWaitlistStatus(identifier);

  if (wlStatus.status === 'expired') {
    // Bump referral threshold from 1 → 2 (lazy, idempotent)
    await bumpExpiredTrialThreshold(identifier);
    // Re-fetch status after bump to get updated threshold
    const updatedStatus = await getWaitlistStatus(identifier);
    return jsonSuccess({
      trialExpired: true,
      ...(updatedStatus ?? { waitlisted: true, position: 0, referralCount: 0, promotionThreshold: 2, referralLink: null, slug: null }),
    });
  }

  if (!status) {
    return jsonError('Not on waitlist', 404);
  }

  return jsonSuccess({ ...status });
}
