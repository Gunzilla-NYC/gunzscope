import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { isWhitelisted } from '@/lib/services/whitelistService';
import { isBanned } from '@/lib/services/banService';
import { joinWaitlist, getWaitlistStatus, BannedError } from '@/lib/services/waitlistService';
import { claimCustomSlug } from '@/lib/services/referralService';

/**
 * POST /api/access/validate
 * Checks if a wallet address OR email is on the early-access whitelist.
 * If not, auto-joins the waitlist and returns waitlist status.
 *
 * Body: { address?: string, email?: string, handle?: string } — at least one identifier required.
 * Emails are stored as "email:user@example.com" in the address field.
 * Optional handle claims a custom referral slug after joining.
 *
 * Response shapes:
 *   { success: true }                                         — whitelisted
 *   { success: false, waitlisted: true, position, ... }       — on waitlist
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, email, handle } = body as { address?: string; email?: string; handle?: string };

    // Normalize: wallet address as-is, email gets "email:" prefix
    const identifier = address || (email ? `email:${email.toLowerCase()}` : null);

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Wallet address or email is required' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex');

    // 0. Check ban list — hard block, no auto-enroll
    const banned = await isBanned(identifier);
    if (banned) {
      console.warn(`[ACCESS] BANNED | id="${identifier}" | ip=${ip} | ${new Date().toISOString()}`);
      return NextResponse.json({ success: false, banned: true }, { status: 403 });
    }

    // 1. Check whitelist first
    const whitelisted = await isWhitelisted(identifier);
    if (whitelisted) {
      console.info(`[ACCESS] WHITELISTED | id="${identifier}" | ip=${ip} | ${new Date().toISOString()}`);
      return NextResponse.json({ success: true });
    }

    // 2. Not whitelisted — join/check waitlist
    const entry = await joinWaitlist(identifier, ipHash);

    // 3. If they were just promoted (race: promoted between whitelist check and here)
    if (entry.status === 'promoted' || entry.status === 'manual_promoted') {
      console.info(`[ACCESS] WAITLIST PROMOTED | id="${identifier}" | ip=${ip} | ${new Date().toISOString()}`);
      return NextResponse.json({ success: true });
    }

    // 4. Claim custom handle if provided (best-effort — don't fail the join)
    if (handle && typeof handle === 'string' && handle.length >= 3) {
      try {
        await claimCustomSlug(identifier, handle);
      } catch {
        // Custom slug failed — auto handle still works
      }
    }

    // 5. Return waitlist status
    const status = await getWaitlistStatus(identifier);
    console.warn(`[ACCESS] WAITLISTED | id="${identifier}" | handle=${handle ?? 'auto'} | position=${status?.position ?? '?'} | ip=${ip} | ${new Date().toISOString()}`);

    return NextResponse.json({
      success: false,
      waitlisted: true,
      ...status,
    });
  } catch (err) {
    if (err instanceof BannedError) {
      return NextResponse.json({ success: false, banned: true }, { status: 403 });
    }
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
