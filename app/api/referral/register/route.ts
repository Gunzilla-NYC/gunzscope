import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { createReferrer, getReferrerByWallet } from '@/lib/services/referralService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

const WALLET_RE = /^0x[0-9a-f]{40}$/i;

/**
 * POST /api/referral/register — Create a referrer slug
 *
 * Auth required (Dynamic JWT). Body: { walletAddress, slug }
 * If wallet already registered, returns existing slug for recovery.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  try {
    const body = await request.json();
    const { walletAddress, slug } = body as { walletAddress?: string; slug?: string };

    if (!walletAddress || typeof walletAddress !== 'string' || !WALLET_RE.test(walletAddress)) {
      return jsonError('Valid wallet address required', 400);
    }
    if (!slug || typeof slug !== 'string') {
      return jsonError('Slug is required', 400);
    }

    const result = await createReferrer(walletAddress, slug);

    if (result.ok) {
      return jsonSuccess({
        referrer: {
          walletAddress: result.referrer.walletAddress,
          slug: result.referrer.slug,
          shareUrl: `https://gunzscope.xyz/r/${result.referrer.slug}`,
        },
      }, 201);
    }

    // Wallet already registered — return existing for recovery
    if (result.code === 'wallet_exists' && result.existing) {
      return jsonSuccess({
        referrer: {
          walletAddress: result.existing.walletAddress,
          slug: result.existing.slug,
          shareUrl: `https://gunzscope.xyz/r/${result.existing.slug}`,
        },
        existing: true,
      });
    }

    const statusMap: Record<string, number> = {
      slug_taken: 409,
      invalid_slug: 400,
      reserved_slug: 400,
    };
    return jsonError(`Slug unavailable: ${result.code}`, statusMap[result.code] ?? 400);
  } catch {
    return jsonError('Failed to register referrer', 500);
  }
}

/**
 * GET /api/referral/register — Check if wallet is already registered
 *
 * Auth required. Query: ?wallet={address}
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet) return jsonError('wallet query param required', 400);

  const referrer = await getReferrerByWallet(wallet);
  if (!referrer) {
    return jsonSuccess({ registered: false });
  }

  return jsonSuccess({
    registered: true,
    referrer: {
      walletAddress: referrer.walletAddress,
      slug: referrer.slug,
      shareUrl: `https://gunzscope.xyz/r/${referrer.slug}`,
    },
  });
}
