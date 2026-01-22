import { NextRequest, NextResponse } from 'next/server';
import { toOpenSeaChain } from '@/lib/utils/openseaChain';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

interface OpenSeaOrdersResponse {
  ordersCount: number;
  lowest: number | null;
  highest: number | null;
  error?: string;
  _debug?: {
    hasApiKey: boolean;
    upstreamStatus: number;
    upstreamUrl: string;
    requestedChain: string;
    mappedChain: string;
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedChain = searchParams.get('chain') || 'avalanche';
  const contract = searchParams.get('contract');
  const tokenId = searchParams.get('tokenId');
  const debug = searchParams.get('debug') === '1';

  // Map chain to OpenSea slug (e.g., 'avalanche' -> 'gunzilla')
  const mappedChain = toOpenSeaChain(requestedChain);

  // Param validation
  if (!contract || !tokenId) {
    const response: OpenSeaOrdersResponse = {
      ordersCount: 0,
      lowest: null,
      highest: null,
      error: 'Missing required parameters: contract, tokenId',
    };
    return NextResponse.json(response, { status: 400 });
  }

  const apiKey = process.env.OPENSEA_API_KEY;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (apiKey) {
    headers['X-API-KEY'] = apiKey;
  }

  // OpenSea orders endpoint for a specific NFT (using mapped chain slug)
  const upstreamUrl = `${OPENSEA_API_BASE}/orders/${mappedChain}/seaport/listings?asset_contract_address=${contract}&token_ids=${tokenId}&limit=50`;

  try {
    const fetchOptions: RequestInit = {
      headers,
    };

    // Use cache: 'no-store' for debug requests, otherwise revalidate every 5 minutes
    if (debug) {
      fetchOptions.cache = 'no-store';
    } else {
      (fetchOptions as any).next = { revalidate: 300 };
    }

    const upstreamResponse = await fetch(upstreamUrl, fetchOptions);
    const upstreamStatus = upstreamResponse.status;

    // Build debug info (only included if debug=1)
    const debugInfo = debug
      ? {
          hasApiKey: !!apiKey,
          upstreamStatus,
          upstreamUrl,
          requestedChain,
          mappedChain,
        }
      : undefined;

    if (!upstreamResponse.ok) {
      // Return empty result on OpenSea errors (rate limit, not found, etc)
      console.warn(`OpenSea API error: ${upstreamStatus} for ${contract}/${tokenId}`);

      const response: OpenSeaOrdersResponse = {
        ordersCount: 0,
        lowest: null,
        highest: null,
        error: `OpenSea API error: ${upstreamStatus}`,
        _debug: debugInfo,
      };
      return NextResponse.json(response);
    }

    const data = await upstreamResponse.json();
    const orders = data?.orders || [];

    if (orders.length === 0) {
      const response: OpenSeaOrdersResponse = {
        ordersCount: 0,
        lowest: null,
        highest: null,
        _debug: debugInfo,
      };
      return NextResponse.json(response);
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

    const response: OpenSeaOrdersResponse = {
      ordersCount: orders.length,
      lowest,
      highest,
      _debug: debugInfo,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in OpenSea orders API:', error);

    const response: OpenSeaOrdersResponse = {
      ordersCount: 0,
      lowest: null,
      highest: null,
      error: 'Internal server error',
      _debug: debug
        ? {
            hasApiKey: !!apiKey,
            upstreamStatus: 0,
            upstreamUrl,
            requestedChain,
            mappedChain,
          }
        : undefined,
    };
    return NextResponse.json(response);
  }
}
