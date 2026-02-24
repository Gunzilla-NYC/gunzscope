import { NextRequest, NextResponse } from 'next/server';
import {
  listAllReferrers,
  findReferrerByWalletOrSlug,
  resetReferrer,
  resetSlugChanges,
} from '@/lib/services/referralService';

/**
 * Verify admin secret from Authorization header.
 */
function verifyAdmin(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const auth = request.headers.get('authorization');
  if (!auth) return false;

  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  return token === secret;
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/**
 * GET /api/admin/referrals — List all referrers (paginated)
 * With ?search=... — Lookup a single referrer by wallet or slug
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');

  // Single lookup mode
  if (search) {
    const referrer = await findReferrerByWalletOrSlug(search.trim());
    if (!referrer) {
      return NextResponse.json({ success: false, found: false });
    }
    return NextResponse.json({
      success: true,
      found: true,
      referrer: {
        walletAddress: referrer.walletAddress,
        slug: referrer.slug,
        slugType: referrer.slugType,
        customSlug: referrer.customSlug,
        slugChangesRemaining: referrer.slugChangesRemaining,
        createdAt: referrer.createdAt,
      },
    });
  }

  // Paginated list mode
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const result = await listAllReferrers(page, Math.min(limit, 100));
  return NextResponse.json({ success: true, ...result });
}

/**
 * DELETE /api/admin/referrals — Delete a referrer handle entirely.
 * Body: { wallet: string } or { slug: string }
 * The wallet can then re-register from scratch.
 */
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  try {
    const body = await request.json();
    const input = (body.wallet ?? body.slug) as string | undefined;
    if (!input) {
      return NextResponse.json({ error: 'wallet or slug is required' }, { status: 400 });
    }

    const deleted = await resetReferrer(input.trim());
    if (!deleted) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deleted: { walletAddress: deleted.walletAddress, slug: deleted.slug },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to delete referrer' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/referrals — Reset slug changes remaining to 1.
 * Body: { wallet: string } or { slug: string }
 */
export async function PATCH(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  try {
    const body = await request.json();
    const input = (body.wallet ?? body.slug) as string | undefined;
    if (!input) {
      return NextResponse.json({ error: 'wallet or slug is required' }, { status: 400 });
    }

    const updated = await resetSlugChanges(input.trim());
    if (!updated) {
      return NextResponse.json({ error: 'Referrer not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      referrer: {
        walletAddress: updated.walletAddress,
        slug: updated.slug,
        slugChangesRemaining: updated.slugChangesRemaining,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to reset slug changes' }, { status: 500 });
  }
}
