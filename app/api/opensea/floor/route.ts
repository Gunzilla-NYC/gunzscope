import { NextRequest } from 'next/server';
import { toOpenSeaChain } from '@/lib/utils/openseaChain';
import { isTransientStatus, resolveCacheControl, jsonWithCache } from '../cacheHelpers';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

interface FloorPriceResponse {
  floorPrice: number | null;
  asOfIso: string;
  error?: string;
  upstreamStatus: number;
  transient: boolean;
}

const CACHE_NO_STORE = 'no-store';

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
