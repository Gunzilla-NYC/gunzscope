import { NextRequest } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import {
  getOrCreateAutoHandle,
  getReferrerByWallet,
  claimCustomSlug,
  switchSlugType,
} from '@/lib/services/referralService';
import { jsonSuccess, jsonError } from '@/lib/api/types';

const WALLET_RE = /^0x[0-9a-f]{40}$/i;

function formatHandle(referrer: { walletAddress: string; slug: string; slugType: string; customSlug: string | null }) {
  return {
    walletAddress: referrer.walletAddress,
    slug: referrer.slug,
    slugType: referrer.slugType,
    customSlug: referrer.customSlug,
    shareUrl: `https://gunzscope.xyz/r/${referrer.slug}`,
  };
}

/**
 * GET /api/share/handle — Get current handle for a wallet
 * Auth required. Query: ?wallet={address}
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const wallet = request.nextUrl.searchParams.get('wallet');
  if (!wallet || !WALLET_RE.test(wallet)) {
    return jsonError('Valid wallet address required', 400);
  }

  try {
    const referrer = await getReferrerByWallet(wallet);
    if (!referrer) {
      return jsonSuccess({ handle: null });
    }
    return jsonSuccess({ handle: formatHandle(referrer) });
  } catch (err) {
    console.error('[Share] GET /handle error:', err);
    return jsonError('Failed to get handle', 500);
  }
}

/**
 * POST /api/share/handle — Create or claim a handle
 * Auth required.
 * Body: { walletAddress, slug?, slugType: 'auto' | 'custom' }
 */
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  try {
    const body = await request.json();
    const { walletAddress, slug, slugType } = body as {
      walletAddress?: string;
      slug?: string;
      slugType?: 'auto' | 'custom';
    };

    if (!walletAddress || !WALLET_RE.test(walletAddress)) {
      return jsonError('Valid wallet address required', 400);
    }

    if (slugType === 'custom') {
      if (!slug) return jsonError('Slug required for custom handle', 400);

      const result = await claimCustomSlug(walletAddress, slug);
      if (result.ok) {
        return jsonSuccess({ handle: formatHandle(result.referrer) }, 201);
      }

      // Handle already registered — return existing
      if (result.code === 'wallet_exists' && result.existing) {
        return jsonSuccess({ handle: formatHandle(result.existing), existing: true });
      }

      const statusMap: Record<string, number> = {
        slug_taken: 409,
        invalid_slug: 400,
        reserved_slug: 400,
      };
      return jsonError(`Slug unavailable: ${result.code}`, statusMap[result.code] ?? 400);
    }

    // Auto handle
    const referrer = await getOrCreateAutoHandle(walletAddress);
    return jsonSuccess({ handle: formatHandle(referrer) }, 201);
  } catch (err) {
    console.error('[Share] POST /handle error:', err);
    return jsonError('Failed to create handle', 500);
  }
}

/**
 * PUT /api/share/handle — Switch between auto and custom slug mode
 * Auth required.
 * Body: { walletAddress, slugType: 'auto' | 'custom' }
 */
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  try {
    const body = await request.json();
    const { walletAddress, slugType } = body as {
      walletAddress?: string;
      slugType?: 'auto' | 'custom';
    };

    if (!walletAddress || !WALLET_RE.test(walletAddress)) {
      return jsonError('Valid wallet address required', 400);
    }
    if (slugType !== 'auto' && slugType !== 'custom') {
      return jsonError('slugType must be "auto" or "custom"', 400);
    }

    const referrer = await switchSlugType(walletAddress, slugType);
    return jsonSuccess({ handle: formatHandle(referrer) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to switch slug type';
    console.error('[Share] PUT /handle error:', err);
    return jsonError(msg, 400);
  }
}
