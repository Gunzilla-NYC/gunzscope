import { NextRequest } from 'next/server';
import { toOpenSeaChain } from '@/lib/utils/openseaChain';
import { isTransientStatus, resolveCacheControl, jsonWithCache } from '../cacheHelpers';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

interface OpenSeaOrdersResponse {
  ordersCount: number;
  lowest: number | null;
  highest: number | null;
  asOfIso: string;
  error?: string;
  upstreamStatus: number;
  transient: boolean;
  _debug?: {
    hasApiKey: boolean;
    upstreamUrl: string;
    requestedChain: string;
    mappedChain: string;
  };
}

/**
 * Safe conversion from wei (bigint) to decimal number.
 * Avoids Number(BigInt) overflow for very large values by using string manipulation.
 */
function formatUnitsToNumber(value: bigint, decimals: number = 18): number {
  const valueStr = value.toString();
  if (valueStr === '0') return 0;
  const paddedValue = valueStr.padStart(decimals + 1, '0');
  const integerPart = paddedValue.slice(0, -decimals) || '0';
  const fractionalPart = paddedValue.slice(-decimals);
  const decimalStr = `${integerPart}.${fractionalPart}`;
  return parseFloat(decimalStr);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedChain = searchParams.get('chain') || 'avalanche';
  const contract = searchParams.get('contract');
  const tokenId = searchParams.get('tokenId');
  const debug = process.env.NODE_ENV === 'development' && searchParams.get('debug') === '1';

  // Server timestamp for cache freshness tracking
  const asOfIso = new Date().toISOString();

  // Map chain to OpenSea slug (e.g., 'avalanche' -> 'gunzilla')
  const mappedChain = toOpenSeaChain(requestedChain);

  // Param validation - client errors are not cached (no-store)
  if (!contract || !tokenId) {
    return jsonWithCache(
      {
        ordersCount: 0,
        lowest: null,
        highest: null,
        asOfIso,
        upstreamStatus: 0, // No upstream call made
        transient: false, // Not transient - this is a client error (but still retriable after fixing params)
        error: 'Missing required parameters: contract, tokenId',
      },
      resolveCacheControl({ debug, transient: false, upstreamStatus: 0, ok: false }),
      400
    );
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
    // Build debug info (only included if debug=1)
    const debugInfo = debug
      ? {
          hasApiKey: !!apiKey,
          upstreamUrl,
          requestedChain,
          mappedChain,
        }
      : undefined;

    // ALWAYS fetch upstream with no-store to avoid Next.js caching transient errors
    // We control caching via response Cache-Control headers instead
    const fetchOptions: RequestInit = {
      headers,
      cache: 'no-store',
    };

    const upstreamResponse = await fetch(upstreamUrl, fetchOptions);
    const upstreamStatus = upstreamResponse.status;
    const transient = isTransientStatus(upstreamStatus);

    if (!upstreamResponse.ok) {
      // Build specific error message based on status code
      let errorMsg: string;
      if (upstreamStatus === 429) {
        errorMsg = 'OpenSea rate limited (429)';
        console.warn(`[OpenSea] Rate limited for ${contract}/${tokenId}`);
      } else if (upstreamStatus === 401 || upstreamStatus === 403) {
        errorMsg = `OpenSea auth error (${upstreamStatus})`;
        console.warn(`[OpenSea] Auth error ${upstreamStatus} for ${contract}/${tokenId}`);
      } else if (upstreamStatus === 404) {
        errorMsg = 'OpenSea not found (404)';
        console.warn(`[OpenSea] Not found for ${contract}/${tokenId}`);
      } else if (upstreamStatus >= 500) {
        errorMsg = `OpenSea upstream error (${upstreamStatus})`;
        console.warn(`[OpenSea] Upstream error ${upstreamStatus} for ${contract}/${tokenId}`);
      } else {
        errorMsg = `OpenSea API error (${upstreamStatus})`;
        console.warn(`[OpenSea] API error ${upstreamStatus} for ${contract}/${tokenId}`);
      }

      // Return 200 with error field to keep UI non-blocking
      // Cache-Control resolved via resolveCacheControl (respects debug=1)
      return jsonWithCache(
        {
          ordersCount: 0,
          lowest: null,
          highest: null,
          asOfIso,
          upstreamStatus,
          transient,
          error: errorMsg,
          _debug: debugInfo,
        },
        resolveCacheControl({ debug, transient, upstreamStatus, ok: false })
      );
    }

    const data = await upstreamResponse.json();
    const orders = data?.orders || [];

    if (orders.length === 0) {
      return jsonWithCache(
        {
          ordersCount: 0,
          lowest: null,
          highest: null,
          asOfIso,
          upstreamStatus,
          transient: false, // Success response (2xx with empty data)
          _debug: debugInfo,
        },
        resolveCacheControl({ debug, transient: false, upstreamStatus, ok: true })
      );
    }

    // Extract prices from orders using safe bigint conversion
    // OpenSea Seaport orders have current_price in wei
    const prices = orders
      .filter((order: any) => order.current_price)
      .map((order: any) => {
        try {
          const priceWei = BigInt(order.current_price);
          return formatUnitsToNumber(priceWei, 18);
        } catch {
          // Skip orders with invalid price format
          return 0;
        }
      })
      .filter((price: number) => price > 0);

    const lowest = prices.length > 0 ? Math.min(...prices) : null;
    const highest = prices.length > 0 ? Math.max(...prices) : null;

    return jsonWithCache(
      {
        ordersCount: orders.length,
        lowest,
        highest,
        asOfIso,
        upstreamStatus,
        transient: false, // Success response
        _debug: debugInfo,
      },
      resolveCacheControl({ debug, transient: false, upstreamStatus, ok: true })
    );
  } catch (error) {
    console.error('Error in OpenSea orders API:', error);

    // Internal/network errors are transient (transient=true) because:
    // - The request never reached OpenSea or failed mid-flight
    // - Client should retry since the issue may be temporary
    // - We return no-store to prevent caching this failure
    return jsonWithCache(
      {
        ordersCount: 0,
        lowest: null,
        highest: null,
        asOfIso,
        upstreamStatus: 0, // No upstream response received
        transient: true, // Internal/network errors are transient - retry allowed
        error: 'Internal server error',
        _debug: debug
          ? {
              hasApiKey: !!apiKey,
              upstreamUrl,
              requestedChain,
              mappedChain,
            }
          : undefined,
      },
      resolveCacheControl({ debug, transient: true, upstreamStatus: 0, ok: false })
    );
  }
}
