import { NextResponse } from 'next/server';
import { addToWhitelist } from '@/lib/services/whitelistService';
import { promoteFromWaitlist } from '@/lib/services/waitlistService';
import { getOrCreateAutoHandle, claimCustomSlug } from '@/lib/services/referralService';

export async function POST(req: Request) {
  try {
    const { address, email, handle } = (await req.json()) as {
      address?: string; email?: string; handle?: string;
    };
    const identifier = address?.toLowerCase() || (email ? `email:${email.toLowerCase()}` : null);
    if (!identifier) {
      return NextResponse.json({ error: 'Missing identifier' }, { status: 400 });
    }

    // Promote from waitlist if they're on it, otherwise whitelist directly
    try {
      await promoteFromWaitlist(identifier, 'konami');
    } catch {
      // Not on waitlist — whitelist directly
      await addToWhitelist(identifier, 'Konami code', 'konami');
    }

    // If email user provided a wallet too, whitelist both
    if (email && address) {
      await addToWhitelist(address.toLowerCase(), `reconciled:${email.toLowerCase()}`, 'konami');
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Konami] Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
