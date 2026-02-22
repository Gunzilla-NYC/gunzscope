import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import {
  getReferrerBySlug,
  recordClick,
  recordWalletConnected,
  recordPortfolioLoaded,
} from '@/lib/services/referralService';
import { isRateLimited } from '@/lib/utils/rateLimiter';
import { jsonSuccess, jsonError } from '@/lib/api/types';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

/**
 * POST /api/referral/track — Record funnel events
 *
 * No auth — called from redirect page (pre-login) and portfolio client.
 * Rate limited: 10 req/min per IP.
 *
 * Body: { slug, event, sessionId, walletAddress? }
 *   event: 'clicked' | 'wallet_connected' | 'portfolio_loaded'
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = hashIp(ip);

  // Rate limit: 10 requests per minute per IP
  if (isRateLimited(`ref:${ipHash}`, 10, 60_000)) {
    return jsonError('Too many requests', 429);
  }

  try {
    const body = await request.json();
    const { slug, event, sessionId, walletAddress } = body as {
      slug?: string;
      event?: string;
      sessionId?: string;
      walletAddress?: string;
    };

    if (!slug || !event || !sessionId) {
      return jsonError('slug, event, and sessionId are required', 400);
    }

    if (!['clicked', 'wallet_connected', 'portfolio_loaded'].includes(event)) {
      return jsonError('Invalid event type', 400);
    }

    if (event === 'clicked') {
      const referrer = await getReferrerBySlug(slug);
      if (!referrer) {
        return jsonError('Referrer not found', 404);
      }

      const userAgent = request.headers.get('user-agent');
      await recordClick(referrer.id, sessionId, ipHash, userAgent);
      return jsonSuccess({});
    }

    if (event === 'wallet_connected') {
      if (!walletAddress) {
        return jsonError('walletAddress required for wallet_connected', 400);
      }
      await recordWalletConnected(sessionId, slug, walletAddress);
      return jsonSuccess({});
    }

    if (event === 'portfolio_loaded') {
      if (!walletAddress) {
        return jsonError('walletAddress required for portfolio_loaded', 400);
      }
      await recordPortfolioLoaded(walletAddress);
      return jsonSuccess({});
    }

    return jsonSuccess({});
  } catch {
    // Don't leak internal errors — tracking is best-effort
    return jsonSuccess({});
  }
}
