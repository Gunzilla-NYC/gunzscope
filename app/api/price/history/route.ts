import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';

// Earliest known GUN price from CoinGecko (March 30, 2025).
// CoinGecko free tier only returns 365 days of history. For older dates,
// this serves as a reasonable proxy since GUN launched around this time.
const EARLIEST_GUN_PRICE_USD = 0.0776;
const EARLIEST_GUN_PRICE_DATE = new Date('2025-03-30');

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
      { headers, next: { revalidate: 86400 } },
    );

    if (!res.ok) {
      // For dates before CoinGecko has data, return the earliest known price
      if (coin === 'gunz' && date <= EARLIEST_GUN_PRICE_DATE) {
        return NextResponse.json(
          { price: EARLIEST_GUN_PRICE_USD, coin, date: dateString, estimated: true },
          { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400' } },
        );
      }
      return NextResponse.json(
        { error: `CoinGecko returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    let price = data?.market_data?.current_price?.usd ?? null;
    let estimated = false;

    // Sanity check: reject prices above GUN's known ATH ($0.115) — CoinGecko
    // has occasionally returned incorrect historical data above this threshold.
    const GUN_ATH_USD = 0.12; // ATH ~$0.115, small buffer
    if (price !== null && coin === 'gunz' && price > GUN_ATH_USD) {
      console.warn(`[/api/price/history] CoinGecko returned suspicious price $${price} for ${dateString}, exceeds known ATH — rejecting`);
      price = null;
    }

    // CoinGecko sometimes returns the coin info without market_data for dates
    // outside their range — fall back to earliest known price
    if (price === null && coin === 'gunz' && date <= EARLIEST_GUN_PRICE_DATE) {
      price = EARLIEST_GUN_PRICE_USD;
      estimated = true;
    }

    return NextResponse.json(
      { price, coin, date: dateString, ...(estimated && { estimated: true }) },
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
