import { PriceData } from '../types';

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

/** Drop-in replacement for axios.get — removes ~30KB from client bundle */
async function fetchGet<T = any>(
  url: string,
  config?: { params?: Record<string, any>; headers?: Record<string, string | undefined> }
): Promise<{ data: T }> {
  let fullUrl = url;
  if (config?.params) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(config.params)) {
      if (v != null) sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) fullUrl += (url.includes('?') ? '&' : '?') + qs;
  }
  // Strip undefined header values for fetch compatibility
  const headers: Record<string, string> = {};
  if (config?.headers) {
    for (const [k, v] of Object.entries(config.headers)) {
      if (v !== undefined) headers[k] = v;
    }
  }
  const res = await fetch(fullUrl, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return { data };
}

export class CoinGeckoService {
  private apiKey?: string;
  private apiBase: string;

  constructor() {
    this.apiKey = process.env.COINGECKO_API_KEY;
    // Always use free API endpoint (works for both Demo and no key)
    this.apiBase = 'https://api.coingecko.com/api/v3';
  }

  async getGunTokenPrice(): Promise<PriceData | null> {
    try {
      // In browser, use our API route to avoid CORS
      if (isBrowser) {
        const response = await fetch('/api/price/gun');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        if (data.gunTokenPrice) {
          const result: PriceData = {
            gunTokenPrice: data.gunTokenPrice,
            source: 'CoinGecko',
            timestamp: new Date(data.timestamp),
          };
          if (Array.isArray(data.sparkline7d) && data.sparkline7d.length > 0) {
            result.sparkline7d = data.sparkline7d;
          }
          if (Array.isArray(data.sparkline14d) && data.sparkline14d.length > 0) {
            result.sparkline14d = data.sparkline14d;
          }
          return result;
        }
        return null;
      }

      // Server-side: call CoinGecko directly
      const coinId = 'gunz';

      const headers = this.apiKey
        ? { 'x-cg-demo-api-key': this.apiKey }
        : {};

      const response = await fetchGet(
        `${this.apiBase}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd',
            include_24hr_change: true,
          },
          headers,
        }
      );

      if (response.data[coinId]) {
        return {
          gunTokenPrice: response.data[coinId].usd,
          source: 'CoinGecko',
          timestamp: new Date(),
        };
      }

      return null;
    } catch (error) {
      console.error('Error fetching price from CoinGecko:', error);
      return null;
    }
  }

  async getTokenPriceByContract(
    contractAddress: string,
    platform: 'avalanche' | 'solana'
  ): Promise<number | null> {
    try {
      const platformId = platform === 'avalanche' ? 'avalanche' : 'solana';

      const headers = this.apiKey
        ? { 'x-cg-demo-api-key': this.apiKey }
        : {};

      const response = await fetchGet(
        `${this.apiBase}/simple/token_price/${platformId}`,
        {
          params: {
            contract_addresses: contractAddress,
            vs_currencies: 'usd',
          },
          headers,
        }
      );

      const priceData = response.data[contractAddress.toLowerCase()];
      return priceData?.usd || null;
    } catch (error) {
      console.error('Error fetching token price by contract:', error);
      return null;
    }
  }

  async searchToken(query: string): Promise<any[]> {
    try {
      const headers = this.apiKey
        ? { 'x-cg-demo-api-key': this.apiKey }
        : {};

      const response = await fetchGet(
        `${this.apiBase}/search`,
        {
          params: { query },
          headers,
        }
      );

      return response.data.coins || [];
    } catch (error) {
      console.error('Error searching token:', error);
      return [];
    }
  }

  /**
   * Get historical price for a token at a specific date.
   * In the browser, routes through /api/price/history to avoid CORS and
   * expose the server-side API key. Server-side calls CoinGecko directly.
   */
  async getHistoricalPrice(coinId: string, date: Date): Promise<number | null> {
    try {
      // Browser: use server-side proxy to avoid CORS + use API key
      if (isBrowser) {
        const res = await fetch(
          `/api/price/history?coin=${encodeURIComponent(coinId)}&date=${date.toISOString()}`
        );
        if (!res.ok) return null;
        const data = await res.json();
        return data.price ?? null;
      }

      // Server-side: call CoinGecko directly with API key
      const headers = this.apiKey
        ? { 'x-cg-demo-api-key': this.apiKey }
        : {};

      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const dateString = `${day}-${month}-${year}`;

      const response = await fetchGet(
        `${this.apiBase}/coins/${coinId}/history`,
        {
          params: {
            date: dateString,
            localization: false,
          },
          headers,
        }
      );

      return response.data?.market_data?.current_price?.usd || null;
    } catch (error) {
      console.error(`Error fetching historical price for ${coinId}:`, error);
      return null;
    }
  }

  /**
   * Get historical GUN token price
   */
  async getHistoricalGunPrice(date: Date): Promise<number | null> {
    return this.getHistoricalPrice('gunz', date);
  }

  /**
   * Get historical AVAX price
   */
  async getHistoricalAvaxPrice(date: Date): Promise<number | null> {
    return this.getHistoricalPrice('avalanche-2', date);
  }
}
