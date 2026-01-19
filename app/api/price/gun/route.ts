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

    const response = await fetch(
      `${COINGECKO_API_BASE}/simple/price?ids=${COIN_ID}&vs_currencies=usd&include_24hr_change=true`,
      { headers, next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    if (data[COIN_ID]) {
      return NextResponse.json({
        gunTokenPrice: data[COIN_ID].usd,
        change24h: data[COIN_ID].usd_24h_change,
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
