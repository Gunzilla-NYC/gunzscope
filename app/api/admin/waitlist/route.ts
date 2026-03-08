import { NextRequest, NextResponse } from 'next/server';
import {
  listWaitlist,
  getWaitlistStats,
  promoteFromWaitlist,
} from '@/lib/services/waitlistService';

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
 * GET /api/admin/waitlist — List waitlist entries + stats
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const rawLimit = parseInt(searchParams.get('limit') ?? '50', 10);
  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100);
  const status = searchParams.get('status') ?? undefined;

  const [result, stats] = await Promise.all([
    listWaitlist(page, limit, status),
    getWaitlistStats(),
  ]);

  return NextResponse.json({ ...result, stats });
}

/**
 * POST /api/admin/waitlist — Manual promote
 * Body: { address: string }
 */
export async function POST(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  try {
    const body = await request.json();
    if (!body.address || typeof body.address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const result = await promoteFromWaitlist(body.address, 'admin');
    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json({ error: 'Failed to promote' }, { status: 500 });
  }
}
