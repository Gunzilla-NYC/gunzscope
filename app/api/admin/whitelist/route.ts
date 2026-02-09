import { NextRequest, NextResponse } from 'next/server';
import {
  addToWhitelist,
  bulkAddToWhitelist,
  removeFromWhitelist,
  listWhitelist,
} from '@/lib/services/whitelistService';

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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
