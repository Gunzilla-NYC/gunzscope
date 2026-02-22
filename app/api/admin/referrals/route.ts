import { NextRequest, NextResponse } from 'next/server';
import { listAllReferrers } from '@/lib/services/referralService';

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
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const result = await listAllReferrers(page, Math.min(limit, 100));
  return NextResponse.json({ success: true, ...result });
}
