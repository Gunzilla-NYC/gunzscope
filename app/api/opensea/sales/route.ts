import { NextRequest, NextResponse } from 'next/server';
import { toOpenSeaChain } from '@/lib/utils/openseaChain';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

/**
 * A single sale event for an NFT (API response format)
 */
interface SaleEventResponse {
  eventTimestamp: string; // ISO string
  priceGUN: number;
  priceWGUN: number;
  sellerAddress: string;
  buyerAddress: string;
  txHash: string;
  marketplace: string;
}

interface OpenSeaSalesResponse {
  salesCount: number;
  sales: SaleEventResponse[];
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

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function shouldCacheFailureStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 404;
}

const CACHE_NO_STORE = 'no-store';
const CACHE_SUCCESS = 'public, s-maxage=300, stale-while-revalidate=60';
const CACHE_HARD_FAILURE = 'public, s-maxage=600, stale-while-revalidate=60';

function resolveCacheControl(opts: {
  debug: boolean;
  transient: boolean;
  upstreamStatus: number;
  ok: boolean;
}): string {
  const { debug, transient, upstreamStatus, ok } = opts;

  if (debug) return CACHE_NO_STORE;
  if (transient) return CACHE_NO_STORE;
  if (shouldCacheFailureStatus(upstreamStatus)) return CACHE_HARD_FAILURE;
  if (ok) return CACHE_SUCCESS;
  return CACHE_NO_STORE;
}

function jsonWithCache(
  body: OpenSeaSalesResponse,
  cacheControl: string,
  status?: number
): NextResponse {
  const res = NextResponse.json(body, status ? { status } : undefined);
  res.headers.set('Cache-Control', cacheControl);
  return res;
}

/**
 * Parse a raw OpenSea event into a SaleEventResponse.
 * On GunzChain, OpenSea may use different payment symbols.
 */
// Known wGUN contract address on GunzChain
const WGUN_ADDRESS = '0x26debd39d5ed069770406fca10a0e4f8d2c743eb';

function parseSaleEvent(event: any): SaleEventResponse {
  const payment = event.payment || {};
  const decimals = payment.decimals || 18;
  const quantity = payment.quantity || '0';

  // Convert from wei to token amount
  const priceRaw = parseFloat(quantity) / Math.pow(10, decimals);
  const symbol = (payment.symbol || '').toUpperCase();
  const tokenAddress = (payment.token_address || '').toLowerCase();

  // GunzChain: accept GUN, WGUN, or native token payment as GUN price
  // Check both symbol AND token address to handle unexpected symbol values
  const isNativeToken = tokenAddress === '0x0000000000000000000000000000000000000000';
  const isWgunByAddress = tokenAddress === WGUN_ADDRESS;
  const isGunPayment = symbol === 'GUN' || isNativeToken;
  const isWgunPayment = symbol === 'WGUN' || isWgunByAddress;

  // OpenSea API returns event_timestamp as Unix seconds (number).
  // Convert to ISO string for consistent client-side Date parsing.
  let eventTimestamp: string;
  const rawTs = event.event_timestamp;
  if (typeof rawTs === 'number') {
    // Unix seconds → milliseconds
    eventTimestamp = new Date(rawTs * 1000).toISOString();
  } else if (typeof rawTs === 'string' && rawTs.length > 0) {
    // Already a string (ISO or date-like) — parse defensively
    const parsed = new Date(rawTs);
    eventTimestamp = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  } else {
    eventTimestamp = new Date().toISOString();
  }

  return {
    eventTimestamp,
    priceGUN: isGunPayment ? priceRaw : 0,
    priceWGUN: isWgunPayment ? priceRaw : 0,
    sellerAddress: event.seller || event.from_account?.address || '',
    buyerAddress: event.buyer || event.to_account?.address || '',
    txHash: event.transaction || event.transaction_hash || '',
    marketplace: 'opensea',
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedChain = searchParams.get('chain') || 'avalanche';
  const contract = searchParams.get('contract');
  const tokenId = searchParams.get('tokenId');
  const debug = searchParams.get('debug') === '1';

  const asOfIso = new Date().toISOString();
  const mappedChain = toOpenSeaChain(requestedChain);

  if (!contract || !tokenId) {
    return jsonWithCache(
      {
        salesCount: 0,
        sales: [],
        asOfIso,
        upstreamStatus: 0,
        transient: false,
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

  // OpenSea events endpoint for a specific NFT
  const upstreamUrl = `${OPENSEA_API_BASE}/events/chain/${mappedChain}/contract/${contract}/nfts/${tokenId}?event_type=sale&limit=50`;

  try {
    const debugInfo = debug
      ? {
          hasApiKey: !!apiKey,
          upstreamUrl,
          requestedChain,
          mappedChain,
        }
      : undefined;

    const fetchOptions: RequestInit = {
      headers,
      cache: 'no-store',
    };

    const upstreamResponse = await fetch(upstreamUrl, fetchOptions);
    const upstreamStatus = upstreamResponse.status;
    const transient = isTransientStatus(upstreamStatus);

    if (!upstreamResponse.ok) {
      let errorMsg: string;
      if (upstreamStatus === 429) {
        errorMsg = 'OpenSea rate limited (429)';
        console.warn(`[OpenSea Sales] Rate limited for ${contract}/${tokenId}`);
      } else if (upstreamStatus === 401 || upstreamStatus === 403) {
        errorMsg = `OpenSea auth error (${upstreamStatus})`;
        console.warn(`[OpenSea Sales] Auth error ${upstreamStatus} for ${contract}/${tokenId}`);
      } else if (upstreamStatus === 404) {
        errorMsg = 'OpenSea not found (404)';
        console.warn(`[OpenSea Sales] Not found for ${contract}/${tokenId}`);
      } else if (upstreamStatus >= 500) {
        errorMsg = `OpenSea upstream error (${upstreamStatus})`;
        console.warn(`[OpenSea Sales] Upstream error ${upstreamStatus} for ${contract}/${tokenId}`);
      } else {
        errorMsg = `OpenSea API error (${upstreamStatus})`;
        console.warn(`[OpenSea Sales] API error ${upstreamStatus} for ${contract}/${tokenId}`);
      }

      return jsonWithCache(
        {
          salesCount: 0,
          sales: [],
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
    const events = data?.asset_events || [];

    if (events.length === 0) {
      return jsonWithCache(
        {
          salesCount: 0,
          sales: [],
          asOfIso,
          upstreamStatus,
          transient: false,
          _debug: debugInfo,
        },
        resolveCacheControl({ debug, transient: false, upstreamStatus, ok: true })
      );
    }

    // Parse sale events
    const sales = events.map(parseSaleEvent);

    return jsonWithCache(
      {
        salesCount: sales.length,
        sales,
        asOfIso,
        upstreamStatus,
        transient: false,
        _debug: debugInfo,
      },
      resolveCacheControl({ debug, transient: false, upstreamStatus, ok: true })
    );
  } catch (error) {
    console.error('Error in OpenSea sales API:', error);

    return jsonWithCache(
      {
        salesCount: 0,
        sales: [],
        asOfIso,
        upstreamStatus: 0,
        transient: true,
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
