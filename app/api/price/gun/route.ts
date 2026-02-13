import { NextResponse } from 'next/server';

const COINGECKO_API_BASE = 'https://api.coingecko.com/api/v3';
const COIN_ID = 'gunz';

export async function GET() {
  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    // Use /coins/markets with sparkline=true to get both price AND 7-day history in one call
    const response = await fetch(
      `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&ids=${COIN_ID}&sparkline=true&price_change_percentage=24h`,
      { headers, next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const coin = Array.isArray(data) ? data[0] : null;

    if (coin) {
      return NextResponse.json({
        gunTokenPrice: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        sparkline7d: coin.sparkline_in_7d?.price ?? [],
        source: 'CoinGecko',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Price not found' }, { status: 404 });
  } catch (error) {
    console.error('Error fetching GUN price:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price' },
      { status: 500 }
    );
  }
}
