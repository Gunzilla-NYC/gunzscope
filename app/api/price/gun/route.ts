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

    // Fetch price + 7d sparkline, and 14d market chart in parallel
    const [marketsRes, chartRes] = await Promise.all([
      fetch(
        `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&ids=${COIN_ID}&sparkline=true&price_change_percentage=24h`,
        { headers, next: { revalidate: 60 } },
      ),
      fetch(
        `${COINGECKO_API_BASE}/coins/${COIN_ID}/market_chart?vs_currency=usd&days=14`,
        { headers, next: { revalidate: 300 } }, // 5-min cache — hourly data doesn't change fast
      ),
    ]);

    if (!marketsRes.ok) {
      throw new Error(`CoinGecko API error: ${marketsRes.status}`);
    }

    const data = await marketsRes.json();
    const coin = Array.isArray(data) ? data[0] : null;

    // Extract 14d hourly prices (array of [timestamp, price])
    let sparkline14d: number[] = [];
    if (chartRes.ok) {
      try {
        const chartData = await chartRes.json();
        if (Array.isArray(chartData?.prices)) {
          sparkline14d = chartData.prices.map((p: [number, number]) => p[1]);
        }
      } catch { /* non-critical — fall back to 7d */ }
    }

    if (coin) {
      return NextResponse.json({
        gunTokenPrice: coin.current_price,
        change24h: coin.price_change_percentage_24h,
        sparkline7d: coin.sparkline_in_7d?.price ?? [],
        sparkline14d,
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
