import { NextRequest, NextResponse } from 'next/server';
import { getShareLeaderboard } from '@/lib/services/shareService';

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

/**
 * GET /api/admin/shares — Share leaderboard (admin only)
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const leaderboard = await getShareLeaderboard(50);
    return NextResponse.json({ success: true, ...leaderboard });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
