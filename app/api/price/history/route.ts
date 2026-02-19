import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

/**
 * GET /api/price/history?coin=gunz&date=2025-12-10
 *
 * Server-side proxy for CoinGecko historical price lookup.
 * Avoids CORS issues and exposes the API key securely.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const coin = searchParams.get('coin') || 'gunz';
  const dateParam = searchParams.get('date'); // ISO date string or YYYY-MM-DD

  if (!dateParam) {
    return NextResponse.json({ error: 'date parameter is required' }, { status: 400 });
  }

  // Parse date and format as DD-MM-YYYY for CoinGecko
  const date = new Date(dateParam);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  const dateString = `${day}-${month}-${year}`;

  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const res = await fetch(
      `${COINGECKO_API_BASE}/coins/${encodeURIComponent(coin)}/history?date=${dateString}&localization=false`,
      { headers, next: { revalidate: 86400 } }, // 24h cache — historical prices don't change
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `CoinGecko returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const price = data?.market_data?.current_price?.usd ?? null;

    return NextResponse.json(
      { price, coin, date: dateString },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
        },
      },
    );
  } catch (error) {
    console.error('[/api/price/history] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch historical price' }, { status: 500 });
  }
}
