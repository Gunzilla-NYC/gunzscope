import { NextRequest, NextResponse } from 'next/server';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'avalanche';
    const contract = searchParams.get('contract');
    const tokenId = searchParams.get('tokenId');

    if (!contract || !tokenId) {
      return NextResponse.json(
        { error: 'Missing required parameters: contract, tokenId' },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENSEA_API_KEY;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (apiKey) {
      headers['X-API-KEY'] = apiKey;
    }

    // OpenSea orders endpoint for a specific NFT
    const url = `${OPENSEA_API_BASE}/orders/${chain}/seaport/listings?asset_contract_address=${contract}&token_ids=${tokenId}&limit=50`;

    const response = await fetch(url, {
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      // Return empty result on OpenSea errors (rate limit, not found, etc)
      console.warn(`OpenSea API error: ${response.status} for ${contract}/${tokenId}`);
      return NextResponse.json({
        orders: [],
        lowest: null,
        highest: null,
        error: `OpenSea API error: ${response.status}`,
      });
    }

    const data = await response.json();
    const orders = data?.orders || [];

    if (orders.length === 0) {
      return NextResponse.json({
        orders: [],
        lowest: null,
        highest: null,
      });
    }

    // Extract prices from orders
    // OpenSea Seaport orders have current_price in wei
    const prices = orders
      .filter((order: any) => order.current_price)
      .map((order: any) => {
        // current_price is in wei, convert to ether (assuming 18 decimals)
        const priceWei = BigInt(order.current_price);
        return Number(priceWei) / 1e18;
      })
      .filter((price: number) => price > 0);

    const lowest = prices.length > 0 ? Math.min(...prices) : null;
    const highest = prices.length > 0 ? Math.max(...prices) : null;

    return NextResponse.json({
      orders: orders.length,
      lowest,
      highest,
    });
  } catch (error) {
    console.error('Error in OpenSea orders API:', error);
    return NextResponse.json({
      orders: [],
      lowest: null,
      highest: null,
      error: 'Internal server error',
    });
  }
}
