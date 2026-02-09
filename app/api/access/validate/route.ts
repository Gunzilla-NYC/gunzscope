import { NextRequest, NextResponse } from 'next/server';
import { isWhitelisted } from '@/lib/services/whitelistService';

/**
 * POST /api/access/validate
 * Checks if a wallet address is on the early-access whitelist.
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

    const whitelisted = await isWhitelisted(address);
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    if (!whitelisted) {
      console.warn(`[ACCESS] NOT WHITELISTED | address="${address}" | ip=${ip} | ${new Date().toISOString()}`);
    } else {
      console.info(`[ACCESS] WHITELISTED | address="${address}" | ip=${ip} | ${new Date().toISOString()}`);
    }

    return NextResponse.json({ success: whitelisted });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
