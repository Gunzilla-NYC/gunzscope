import { NextResponse } from 'next/server';
import { addToWhitelist, getWhitelistStatus } from '@/lib/services/whitelistService';
import { isBanned } from '@/lib/services/banService';
import { joinWaitlistForTrial } from '@/lib/services/waitlistService';
import { getOrCreateAutoHandle, claimCustomSlug } from '@/lib/services/referralService';

/** 72 hours in milliseconds */
const TRIAL_DURATION_MS = 72 * 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const { address, email, handle } = (await req.json()) as {
      address?: string; email?: string; handle?: string;
    };
    const identifier = address?.toLowerCase() || (email ? `email:${email.toLowerCase()}` : null);
    if (!identifier) {
      return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
    }

    // Ban check — konami doesn't override a ban
    if (await isBanned(identifier)) {
      return NextResponse.json({ success: false, banned: true }, { status: 403 });
    }

    // Check existing whitelist status — don't downgrade permanent, don't re-grant expired
    const wlStatus = await getWhitelistStatus(identifier);

    if (wlStatus.status === 'permanent') {
      // Already has full access — no-op success
      return NextResponse.json({ success: true });
    }

    if (wlStatus.status === 'trial') {
      // Active trial — return trial info
      return NextResponse.json({
        success: true,
        trial: true,
        expiresAt: wlStatus.expiresAt?.toISOString(),
      });
    }

    if (wlStatus.status === 'expired') {
      // Trial already used — must earn permanent access via referral
      return NextResponse.json({
        success: false,
        trialExpired: true,
        error: 'Trial already used. Refer a friend for permanent access.',
      }, { status: 403 });
    }

    // No whitelist entry — grant 72h trial
    const expiresAt = new Date(Date.now() + TRIAL_DURATION_MS);
    await addToWhitelist(identifier, 'Konami code', 'konami', expiresAt);

    // Create waitlist entry with threshold 1 (so 1 referral = permanent access)
    await joinWaitlistForTrial(identifier);

    // If email user provided a wallet too, whitelist both
    if (email && address) {
      await addToWhitelist(address.toLowerCase(), `reconciled:${email.toLowerCase()}`, 'konami', expiresAt);
    }

    // Create referral handle if provided (best-effort, don't fail whitelist)
    if (handle && address) {
      try {
        await getOrCreateAutoHandle(address.toLowerCase());
        await claimCustomSlug(address.toLowerCase(), handle);
      } catch {
        // Custom slug failed — auto handle already created above
      }
    }

    return NextResponse.json({
      success: true,
      trial: true,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error('[Konami] Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
