import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { isWhitelisted } from '@/lib/services/whitelistService';
import { joinWaitlist, getWaitlistStatus } from '@/lib/services/waitlistService';

/**
 * POST /api/access/validate
 * Checks if a wallet address is on the early-access whitelist.
 * If not, auto-joins the waitlist and returns waitlist status.
 *
 * Response shapes:
 *   { success: true }                                         — whitelisted
 *   { success: false, waitlisted: true, position, ... }       — on waitlist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address } = body as { address?: string };

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex');

    // 1. Check whitelist first
    const whitelisted = await isWhitelisted(address);
    if (whitelisted) {
      console.info(`[ACCESS] WHITELISTED | address="${address}" | ip=${ip} | ${new Date().toISOString()}`);
      return NextResponse.json({ success: true });
    }

    // 2. Not whitelisted — join/check waitlist
    const entry = await joinWaitlist(address, ipHash);

    // 3. If they were just promoted (race: promoted between whitelist check and here)
    if (entry.status === 'promoted' || entry.status === 'manual_promoted') {
      console.info(`[ACCESS] WAITLIST PROMOTED | address="${address}" | ip=${ip} | ${new Date().toISOString()}`);
      return NextResponse.json({ success: true });
    }

    // 4. Return waitlist status
    const status = await getWaitlistStatus(address);
    console.warn(`[ACCESS] WAITLISTED | address="${address}" | position=${status?.position ?? '?'} | ip=${ip} | ${new Date().toISOString()}`);

    return NextResponse.json({
      success: false,
      waitlisted: true,
      ...status,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
