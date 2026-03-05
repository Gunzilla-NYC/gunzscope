import { NextRequest, NextResponse } from 'next/server';
import {
  addToWhitelist,
  bulkAddToWhitelist,
  removeFromWhitelist,
  listWhitelist,
  listRemovedWhitelist,
} from '@/lib/services/whitelistService';
import { revokeWaitlistPromotion } from '@/lib/services/waitlistService';
import { banAddress, unbanAddress, resetAddress, listBans } from '@/lib/services/banService';

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
 * GET /api/admin/whitelist — List all whitelist entries (paginated)
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const view = searchParams.get('view');

  if (view === 'banned') {
    const result = await listBans(page, limit);
    return NextResponse.json(result);
  }

  if (view === 'removed') {
    const result = await listRemovedWhitelist(page, limit);
    return NextResponse.json(result);
  }

  const result = await listWhitelist(page, limit);
  return NextResponse.json(result);
}

/**
 * POST /api/admin/whitelist — Add address(es) to whitelist
 *
 * Body: { address: string, label?: string }
 *   or: { addresses: Array<{ address: string, label?: string }> }
 */
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  try {
    const body = await request.json();

    // Bulk add
    if (Array.isArray(body.addresses)) {
      const result = await bulkAddToWhitelist(body.addresses, body.addedBy ?? 'admin');
      return NextResponse.json(result);
    }

    // Single add
    if (body.address && typeof body.address === 'string') {
      const entry = await addToWhitelist(body.address, body.label, body.addedBy ?? 'admin');
      if (!entry) {
        return NextResponse.json(
          { error: 'Address already whitelisted' },
          { status: 409 }
        );
      }
      return NextResponse.json({ entry });
    }

    return NextResponse.json(
      { error: 'Provide address or addresses[]' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/**
 * DELETE /api/admin/whitelist — Remove an address from whitelist
 *
 * Body: { address: string }
 */
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  try {
    const body = await request.json();
    if (!body.address || typeof body.address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const removed = await removeFromWhitelist(body.address);
    if (!removed) {
      return NextResponse.json(
        { error: 'Address not found in whitelist' },
        { status: 404 }
      );
    }

    // Also reset any waitlist promotion so they start from zero
    await revokeWaitlistPromotion(body.address);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/**
 * PATCH /api/admin/whitelist — Ban, unban, or reset an address
 *
 * Body: { address: string, action: 'ban' | 'unban' | 'reset', reason?: string }
 */
export async function PATCH(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  try {
    const body = await request.json();
    const { address, action, reason } = body as {
      address?: string;
      action?: string;
      reason?: string;
    };

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!action || !['ban', 'unban', 'reset'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be ban, unban, or reset' },
        { status: 400 },
      );
    }

    if (action === 'ban') {
      await banAddress(address, reason, 'admin');
      return NextResponse.json({ success: true, action: 'banned' });
    }

    if (action === 'unban') {
      const removed = await unbanAddress(address);
      if (!removed) {
        return NextResponse.json({ error: 'Address is not banned' }, { status: 404 });
      }
      return NextResponse.json({ success: true, action: 'unbanned' });
    }

    if (action === 'reset') {
      await resetAddress(address);
      return NextResponse.json({ success: true, action: 'reset' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
