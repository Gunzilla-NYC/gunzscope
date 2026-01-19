import axios from 'axios';
import { PriceData } from '../types';

// Check if running in browser
const isBrowser = typeof window !== 'undefined';

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
          return {
            gunTokenPrice: data.gunTokenPrice,
            source: 'CoinGecko',
            timestamp: new Date(data.timestamp),
          };
        }
        return null;
      }

      // Server-side: call CoinGecko directly
      const coinId = 'gunz';

      const headers = this.apiKey
        ? { 'x-cg-demo-api-key': this.apiKey }
        : {};

      const response = await axios.get(
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

      const response = await axios.get(
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

      const response = await axios.get(
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
   * Get historical price for a token at a specific date
   * @param coinId - CoinGecko coin ID (e.g., 'gunz', 'avalanche-2')
   * @param date - Date to get price for
   * @returns Price in USD or null if not available
   */
  async getHistoricalPrice(coinId: string, date: Date): Promise<number | null> {
    try {
      const headers = this.apiKey
        ? { 'x-cg-demo-api-key': this.apiKey }
        : {};

      // Format date as DD-MM-YYYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const dateString = `${day}-${month}-${year}`;

      const response = await axios.get(
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
