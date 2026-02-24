import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getUnifiedStats } from '@/lib/services/shareService';
import { getReferrerStats } from '@/lib/services/referralService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

const WALLET_RE = /^0x[0-9a-f]{40}$/i;

/**
 * GET /api/share/stats?address={addr} — Unified share + referral stats
 * Auth required.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const address = request.nextUrl.searchParams.get('address');
  if (!address || !WALLET_RE.test(address)) {
    return jsonError('Valid wallet address required', 400);
  }

  try {
    const [stats, referralStats] = await Promise.all([
      getUnifiedStats(address),
      getReferrerStats(address),
    ]);

    return jsonSuccess({
      ...stats,
      recentReferrals: referralStats?.recentReferrals ?? [],
    });
  } catch (err) {
    console.error('[Share] GET /stats error:', err);
    return jsonError('Failed to get stats', 500);
  }
}
