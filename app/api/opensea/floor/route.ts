import { NextRequest, NextResponse } from 'next/server';
import { toOpenSeaChain } from '@/lib/utils/openseaChain';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

interface FloorPriceResponse {
  floorPrice: number | null;
  asOfIso: string;
  error?: string;
  upstreamStatus: number;
  transient: boolean;
}

function isTransientStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

const CACHE_NO_STORE = 'no-store';
const CACHE_SUCCESS = 'public, s-maxage=300, stale-while-revalidate=60';
const CACHE_HARD_FAILURE = 'public, s-maxage=600, stale-while-revalidate=60';

function resolveCacheControl(opts: {
  transient: boolean;
  upstreamStatus: number;
  ok: boolean;
}): string {
  const { transient, upstreamStatus, ok } = opts;
  if (transient) return CACHE_NO_STORE;
  if (upstreamStatus === 401 || upstreamStatus === 403 || upstreamStatus === 404) return CACHE_HARD_FAILURE;
  if (ok) return CACHE_SUCCESS;
  return CACHE_NO_STORE;
}

function jsonWithCache(
  body: FloorPriceResponse,
  cacheControl: string,
  status?: number
): NextResponse {
  const res = NextResponse.json(body, status ? { status } : undefined);
  res.headers.set('Cache-Control', cacheControl);
  return res;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestedChain = searchParams.get('chain') || 'avalanche';
  const contract = searchParams.get('contract');

  const asOfIso = new Date().toISOString();
  const mappedChain = toOpenSeaChain(requestedChain);

  if (!contract) {
    return jsonWithCache(
      {
        floorPrice: null,
        asOfIso,
        upstreamStatus: 0,
        transient: false,
        error: 'Missing required parameter: contract',
      },
      CACHE_NO_STORE,
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

  // OpenSea contract endpoint returns collection info including floor price
  const upstreamUrl = `${OPENSEA_API_BASE}/chain/${mappedChain}/contract/${contract}`;

  try {
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
      } else if (upstreamStatus === 401 || upstreamStatus === 403) {
        errorMsg = `OpenSea auth error (${upstreamStatus})`;
      } else if (upstreamStatus === 404) {
        errorMsg = 'Contract not found on OpenSea';
      } else {
        errorMsg = `OpenSea API error (${upstreamStatus})`;
      }

      console.warn(`[OpenSea Floor] ${errorMsg} for ${contract}`);

      return jsonWithCache(
        {
          floorPrice: null,
          asOfIso,
          upstreamStatus,
          transient,
          error: errorMsg,
        },
        resolveCacheControl({ transient, upstreamStatus, ok: false })
      );
    }

    const data = await upstreamResponse.json();
    const floorPrice = data?.collection?.stats?.floor_price ?? null;

    return jsonWithCache(
      {
        floorPrice,
        asOfIso,
        upstreamStatus,
        transient: false,
      },
      resolveCacheControl({ transient: false, upstreamStatus, ok: true })
    );
  } catch (error) {
    console.error('Error in OpenSea floor API:', error);

    return jsonWithCache(
      {
        floorPrice: null,
        asOfIso,
        upstreamStatus: 0,
        transient: true,
        error: 'Internal server error',
      },
      CACHE_NO_STORE
    );
  }
}
