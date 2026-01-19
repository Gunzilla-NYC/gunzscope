import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for marketplace wallet purchases
 * Keeps GAME_MARKETPLACE_API_KEY secure on server
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const wallet = searchParams.get('wallet');
  const fromDate = searchParams.get('fromDate');
  const toDate = searchParams.get('toDate');
  const limit = searchParams.get('limit');

  // Validate required params
  if (!wallet) {
    return NextResponse.json(
      { error: 'Missing required param: wallet' },
      { status: 400 }
    );
  }

  // Get server-side env vars
  const apiUrl = process.env.GAME_MARKETPLACE_API_URL;
  const apiKey = process.env.GAME_MARKETPLACE_API_KEY;

  // Check if marketplace is configured
  if (!apiUrl || apiUrl.includes('yourgame')) {
    return NextResponse.json(
      { error: 'Marketplace not configured', configured: false },
      { status: 503 }
    );
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const url = new URL(`${apiUrl}/purchases/wallet`);
    url.searchParams.set('wallet', wallet);

    if (fromDate) {
      url.searchParams.set('fromDate', fromDate);
    }
    if (toDate) {
      url.searchParams.set('toDate', toDate);
    }
    if (limit) {
      url.searchParams.set('limit', limit);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Upstream error', statusCode: response.status },
        { status: response.status }
      );
    }

    // Return upstream data with proxy metadata
    return NextResponse.json({
      ...data,
      _proxy: {
        used: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API] Marketplace wallet purchases error:', message);

    return NextResponse.json(
      { error: message, configured: true },
      { status: 500 }
    );
  }
}
