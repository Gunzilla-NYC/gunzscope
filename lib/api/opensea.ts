import axios from 'axios';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

// Circuit breaker: cache failures to avoid spamming
// Key: tokenKey, Value: { failedAt: timestamp, error: string }
const failureCache = new Map<string, { failedAt: number; error: string }>();
const FAILURE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCachedFailure(tokenKey: string): { error: string } | null {
  const cached = failureCache.get(tokenKey);
  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.failedAt > FAILURE_CACHE_TTL_MS) {
    failureCache.delete(tokenKey);
    return null;
  }

  return { error: cached.error };
}

function setCachedFailure(tokenKey: string, error: string): void {
  failureCache.set(tokenKey, { failedAt: Date.now(), error });

  // Cleanup old entries (keep cache size reasonable)
  if (failureCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of failureCache.entries()) {
      if (now - value.failedAt > FAILURE_CACHE_TTL_MS) {
        failureCache.delete(key);
      }
    }
  }
}

export class OpenSeaService {
  private apiKey?: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || process.env.OPENSEA_API_KEY;
  }

  async getCollectionStats(collectionSlug: string): Promise<any | null> {
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await axios.get(
        `${OPENSEA_API_BASE}/collections/${collectionSlug}/stats`,
        { headers }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching OpenSea collection stats:', error);
      return null;
    }
  }

  async getNFTFloorPrice(contractAddress: string, chain: string = 'avalanche'): Promise<number | null> {
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      // Note: OpenSea's API structure varies by chain
      // This is a simplified example - adjust based on actual OpenSea API documentation
      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${chain}/contract/${contractAddress}`,
        { headers }
      );

      return response.data?.collection?.stats?.floor_price || null;
    } catch (error) {
      console.error('Error fetching NFT floor price from OpenSea:', error);
      return null;
    }
  }

  async getNFTsByWallet(
    walletAddress: string,
    chain: string = 'avalanche',
    limit: number = 50
  ): Promise<any[]> {
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${chain}/account/${walletAddress}/nfts`,
        {
          headers,
          params: { limit },
        }
      );

      return response.data?.nfts || [];
    } catch (error) {
      console.error('Error fetching NFTs from OpenSea:', error);
      return [];
    }
  }

  async getListings(contractAddress: string, chain: string = 'avalanche'): Promise<any[]> {
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await axios.get(
        `${OPENSEA_API_BASE}/listings/collection/${contractAddress}`,
        { headers }
      );

      return response.data?.listings || [];
    } catch (error) {
      console.error('Error fetching listings from OpenSea:', error);
      return [];
    }
  }

  async getNFTListings(
    contractAddress: string,
    tokenId: string,
    chain: string = 'avalanche'
  ): Promise<{ lowest: number | null; highest: number | null; error?: string }> {
    const tokenKey = `${chain}:${contractAddress}:${tokenId}`;

    // Check circuit breaker
    const cachedFailure = getCachedFailure(tokenKey);
    if (cachedFailure) {
      return { lowest: null, highest: null, error: cachedFailure.error };
    }

    try {
      // In browser, use our API route to avoid CORS
      if (isBrowser) {
        const response = await fetch(
          `/api/opensea/orders?chain=${encodeURIComponent(chain)}&contract=${encodeURIComponent(contractAddress)}&tokenId=${encodeURIComponent(tokenId)}`
        );

        if (!response.ok) {
          const errorMsg = `API error: ${response.status}`;
          setCachedFailure(tokenKey, errorMsg);
          return { lowest: null, highest: null, error: errorMsg };
        }

        const data = await response.json();

        if (data.error) {
          // Don't cache this as failure - it's from OpenSea, might recover
          return { lowest: data.lowest, highest: data.highest, error: data.error };
        }

        return { lowest: data.lowest, highest: data.highest };
      }

      // Server-side: call OpenSea directly
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await axios.get(
        `${OPENSEA_API_BASE}/orders/${chain}/seaport/listings?asset_contract_address=${contractAddress}&token_ids=${tokenId}&limit=50`,
        { headers }
      );

      const orders = response.data?.orders || [];

      if (orders.length === 0) {
        return { lowest: null, highest: null };
      }

      const prices = orders
        .filter((order: any) => order.current_price)
        .map((order: any) => {
          const priceWei = BigInt(order.current_price);
          return Number(priceWei) / 1e18;
        })
        .filter((price: number) => price > 0);

      if (prices.length === 0) {
        return { lowest: null, highest: null };
      }

      return {
        lowest: Math.min(...prices),
        highest: Math.max(...prices),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      console.warn('OpenSea listings fetch failed (non-blocking):', errorMsg);
      setCachedFailure(tokenKey, errorMsg);
      return { lowest: null, highest: null, error: errorMsg };
    }
  }

  async getNFTMetadata(
    contractAddress: string,
    tokenId: string,
    chain: string = 'avalanche'
  ): Promise<any | null> {
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`,
        { headers }
      );

      return response.data?.nft || null;
    } catch (error) {
      console.error('Error fetching NFT metadata from OpenSea:', error);
      return null;
    }
  }

  /**
   * Get the last sale price for a specific NFT
   * Returns the price in the chain's native currency (e.g., AVAX for Avalanche)
   */
  async getLastSalePrice(
    contractAddress: string,
    tokenId: string,
    walletAddress: string,
    chain: string = 'avalanche'
  ): Promise<{ price: number; date: Date; currency: string } | null> {
    try {
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      // Try to get events for this NFT
      const response = await axios.get(
        `${OPENSEA_API_BASE}/events/chain/${chain}/contract/${contractAddress}/nfts/${tokenId}`,
        {
          headers,
          params: {
            event_type: 'sale',
            limit: 50, // Get recent sales
          },
        }
      );

      const events = response.data?.asset_events || [];
      console.log(`Found ${events.length} sale events for token ${tokenId}`);

      if (events.length === 0) {
        return null;
      }

      // Find the sale where the buyer is our wallet address
      const userPurchase = events.find((event: any) =>
        event.to_account?.address?.toLowerCase() === walletAddress.toLowerCase()
      );

      if (!userPurchase) {
        console.log('No sale event found for this wallet address');
        return null;
      }

      console.log('Found purchase event:', userPurchase);

      // Extract price information
      const payment = userPurchase.payment;
      if (!payment) {
        return null;
      }

      // Convert from wei to native currency
      const price = parseFloat(payment.quantity) / Math.pow(10, payment.decimals || 18);
      const date = new Date(userPurchase.event_timestamp);
      const currency = payment.symbol || 'AVAX';

      console.log(`Last sale: ${price} ${currency} on ${date.toISOString()}`);

      return { price, date, currency };
    } catch (error) {
      console.error('Error fetching last sale price from OpenSea:', error);
      return null;
    }
  }
}
