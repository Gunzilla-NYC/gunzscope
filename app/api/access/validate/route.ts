import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/access/validate
 * Validates an access code against the ACCESS_CODES environment variable.
 * Used to gate early access on the homepage.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body as { code?: string };

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Access code is required' },
        { status: 400 }
      );
    }

    const validCodes = (process.env.ACCESS_CODES ?? '')
      .split(',')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    if (validCodes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No access codes configured' },
        { status: 500 }
      );
    }

    const trimmedCode = code.trim();
    const isValid = validCodes.includes(trimmedCode.toLowerCase());
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    if (!isValid) {
      console.warn(`[ACCESS] FAILED attempt | code="${trimmedCode}" | ip=${ip} | ${new Date().toISOString()}`);
      return NextResponse.json(
        { success: false, error: 'Invalid access code' },
        { status: 401 }
      );
    }

    console.info(`[ACCESS] SUCCESS | code="${trimmedCode}" | ip=${ip} | ${new Date().toISOString()}`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request' },
      { status: 400 }
    );
  }
}
