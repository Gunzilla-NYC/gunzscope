import { NextRequest, NextResponse } from 'next/server';
import { isWhitelisted, addToWhitelist } from '@/lib/services/whitelistService';
import { isBanned } from '@/lib/services/banService';

/**
 * POST /api/access/reconcile
 * Links a wallet address to a promoted email user's whitelist entry.
 *
 * Body: { email: string, walletAddress: string }
 *
 * If the email is whitelisted (promoted), the wallet address is also whitelisted.
 * Idempotent — safe to call multiple times.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, walletAddress } = body as { email?: string; walletAddress?: string };

    if (!email || !walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Both email and walletAddress are required' },
        { status: 400 }
      );
    }

    // Check if the email identifier is whitelisted
    const emailId = `email:${email.toLowerCase()}`;
    const emailWhitelisted = await isWhitelisted(emailId);

    if (!emailWhitelisted) {
      return NextResponse.json(
        { success: false, error: 'Email is not whitelisted' },
        { status: 403 }
      );
    }

    // Check if the wallet is banned
    if (await isBanned(walletAddress)) {
      return NextResponse.json(
        { success: false, banned: true, error: 'Wallet is banned' },
        { status: 403 }
      );
    }

    // Whitelist the wallet address too
    await addToWhitelist(walletAddress, `reconciled:${email.toLowerCase()}`);

    console.info(`[ACCESS] RECONCILED | email="${email}" → wallet="${walletAddress}" | ${new Date().toISOString()}`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
