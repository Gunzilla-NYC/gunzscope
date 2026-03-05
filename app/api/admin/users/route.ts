import { NextRequest, NextResponse } from 'next/server';
import { listUsers } from '@/lib/services/userService';
import { isWhitelisted } from '@/lib/services/whitelistService';

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
 * GET /api/admin/users — List all registered user profiles (paginated)
 */
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) return unauthorized();

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const search = searchParams.get('search') || undefined;

  const { users, total } = await listUsers(page, limit, search);

  // Cross-reference whitelist status for each user's primary wallet
  const enriched = await Promise.all(
    users.map(async (user) => {
      const primaryWallet = user.wallets.find((w) => w.isPrimary) ?? user.wallets[0];
      const whitelisted = primaryWallet
        ? await isWhitelisted(primaryWallet.address)
        : false;

      return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        wallets: user.wallets,
        counts: user._count,
        whitelisted,
      };
    }),
  );

  return NextResponse.json({ users: enriched, total });
}
