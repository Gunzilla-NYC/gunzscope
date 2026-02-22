import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getReferrerStats } from '@/lib/services/referralService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

/**
 * GET /api/referral/stats?wallet={address} — Referrer dashboard data
 *
 * Auth required — referrer viewing their own stats.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) {
    return jsonError('wallet query param required', 400);
  }

  try {
    const stats = await getReferrerStats(wallet);
    if (!stats) {
      return jsonError('Referrer not found', 404);
    }

    return jsonSuccess({ stats });
  } catch {
    return jsonError('Failed to fetch stats', 500);
  }
}
