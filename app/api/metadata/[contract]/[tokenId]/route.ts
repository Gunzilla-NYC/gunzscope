import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy for metadata.gunzchain.io to avoid CORS issues.
 * GET /api/metadata/{contract}/{tokenId}
 * Proxies to: https://metadata.gunzchain.io/api/v1/nft/{contract}/{tokenId}
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contract: string; tokenId: string }> }
) {
  try {
    const { contract, tokenId } = await params;

    // Basic validation
    if (!contract || !tokenId || !/^0x[a-fA-F0-9]{40}$/.test(contract)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const url = `https://metadata.gunzchain.io/api/v1/nft/${contract}/${tokenId}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
        // Cache for 5 minutes to reduce load on upstream
        next: { revalidate: 300 },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return NextResponse.json(
          { error: `Upstream returned ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error('[metadata-proxy] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}
