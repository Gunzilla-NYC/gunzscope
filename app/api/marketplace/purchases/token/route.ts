import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for marketplace token purchases
 * Keeps GAME_MARKETPLACE_API_KEY secure on server
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const chain = searchParams.get('chain');
  const contract = searchParams.get('contract');
  const tokenId = searchParams.get('tokenId');

  // Validate required params
  if (!chain || !contract || !tokenId) {
    return NextResponse.json(
      { error: 'Missing required params: chain, contract, tokenId' },
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

    const url = new URL(`${apiUrl}/purchases/token`);
    url.searchParams.set('chain', chain);
    url.searchParams.set('contract', contract);
    url.searchParams.set('tokenId', tokenId);

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
    console.error('[API] Marketplace token purchases error:', message);

    return NextResponse.json(
      { error: message, configured: true },
      { status: 500 }
    );
  }
}
