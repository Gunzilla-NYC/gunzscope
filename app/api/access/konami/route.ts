import { NextResponse } from 'next/server';
import { addToWhitelist } from '@/lib/services/whitelistService';
import { promoteFromWaitlist } from '@/lib/services/waitlistService';

export async function POST(req: Request) {
  try {
    const { address, email } = (await req.json()) as { address?: string; email?: string };
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Konami] Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
