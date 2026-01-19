import axios from 'axios';
import { MarketplaceData, MarketplacePurchase } from '../types';

/**
 * Client-side marketplace service that uses server-side proxy routes
 * to keep API keys secure. All purchase queries go through /api/marketplace/*
 */
export class GameMarketplaceService {
  // NEXT_PUBLIC_ var for debug display only - actual requests use server proxy
  private displayUrl: string;

  constructor() {
    this.displayUrl = process.env.NEXT_PUBLIC_GAME_MARKETPLACE_API || '';
  }

  /**
   * Get endpoint configuration info for debugging
   * Note: serverProxyUsed indicates all requests go through /api/marketplace/*
   */
  getEndpointInfo(): {
    baseUrl: string;
    network: 'mainnet' | 'testnet' | 'unconfigured';
    isConfigured: boolean;
    serverProxyUsed: boolean;
  } {
    const isConfigured = this.isConfigured();

    // Determine network from URL patterns (display URL only)
    let network: 'mainnet' | 'testnet' | 'unconfigured' = 'unconfigured';
    if (isConfigured) {
      if (this.displayUrl.includes('testnet') || this.displayUrl.includes('staging') || this.displayUrl.includes('dev')) {
        network = 'testnet';
      } else {
        network = 'mainnet';
      }
    }

    return {
      baseUrl: this.displayUrl || '(not configured)',
      network,
      isConfigured,
      serverProxyUsed: true, // Always true - we use /api routes
    };
  }

  /**
   * Check if the marketplace API is properly configured
   * Based on the display URL (actual config is server-side)
   */
  isConfigured(): boolean {
    return !!this.displayUrl && !this.displayUrl.includes('yourgame');
  }

  /**
   * Test connection to the marketplace API via server proxy
   * Makes a lightweight request to verify connectivity
   * Returns status info for debugging - never throws
   */
  async testConnection(): Promise<{
    success: boolean;
    statusCode?: number;
    itemCount?: number;
    error?: string;
    responseKeys?: string[];
    serverProxyUsed: boolean;
  }> {
    try {
      // Test via server proxy with a minimal wallet query
      const response = await axios.get('/api/marketplace/purchases/wallet', {
        params: { wallet: '0x0000000000000000000000000000000000000000', limit: 1 },
        timeout: 10000,
      });

      const statusCode = response.status;
      const data = response.data;

      // Check if server returned "not configured" error
      if (data.configured === false) {
        return {
          success: false,
          error: data.error || 'Marketplace not configured on server',
          serverProxyUsed: true,
        };
      }

      // Extract useful debug info
      let itemCount: number | undefined;
      let responseKeys: string[] | undefined;

      if (data) {
        if (Array.isArray(data)) {
          itemCount = data.length;
        } else if (typeof data === 'object') {
          responseKeys = Object.keys(data).slice(0, 10);
          if (Array.isArray(data.purchases)) {
            itemCount = data.purchases.length;
          } else if (Array.isArray(data.items)) {
            itemCount = data.items.length;
          } else if (typeof data.count === 'number') {
            itemCount = data.count;
          }
        }
      }

      return {
        success: statusCode >= 200 && statusCode < 300,
        statusCode,
        itemCount,
        responseKeys,
        serverProxyUsed: true,
      };
    } catch (error) {
      const axiosError = error as any;
      const statusCode = axiosError?.response?.status;

      // Check for 503 (not configured) from server
      if (statusCode === 503) {
        const errorData = axiosError?.response?.data;
        return {
          success: false,
          statusCode,
          error: errorData?.error || 'Marketplace not configured on server',
          serverProxyUsed: true,
        };
      }

      const errorMessage = axiosError?.message || 'Connection failed';

      return {
        success: false,
        statusCode,
        error: errorMessage,
        serverProxyUsed: true,
      };
    }
  }

  async getMarketplaceData(): Promise<MarketplaceData | null> {
    try {
      if (!this.displayUrl || this.displayUrl.includes('yourgame')) {
        console.warn('Game marketplace API not configured');
        return {
          totalListings: 0,
          floorPrice: 0,
          volume24h: 0,
          liveMints: 0,
        };
      }

      // Note: This endpoint doesn't use server proxy yet
      // Could be added if needed for sensitive data
      const response = await axios.get(
        `${this.displayUrl}/marketplace/stats`,
        { timeout: 10000 }
      );

      return {
        totalListings: response.data.totalListings || 0,
        floorPrice: response.data.floorPrice || 0,
        volume24h: response.data.volume24h || 0,
        liveMints: response.data.liveMints || response.data.totalMints || 0,
      };
    } catch (error) {
      console.error('Error fetching game marketplace data:', error);
      return null;
    }
  }

  async getPlayerAssets(walletAddress: string): Promise<any[]> {
    try {
      if (!this.displayUrl || this.displayUrl.includes('yourgame')) {
        console.warn('Game marketplace API not configured');
        return [];
      }

      // Note: This endpoint doesn't use server proxy yet
      const response = await axios.get(
        `${this.displayUrl}/player/${walletAddress}/assets`,
        { timeout: 10000 }
      );

      return response.data.assets || [];
    } catch (error) {
      console.error('Error fetching player assets:', error);
      return [];
    }
  }

  async getLiveMintCount(): Promise<number> {
    try {
      if (!this.displayUrl || this.displayUrl.includes('yourgame')) {
        return 0;
      }

      // Note: This endpoint doesn't use server proxy yet
      const response = await axios.get(
        `${this.displayUrl}/mints/live`,
        { timeout: 10000 }
      );

      return response.data.count || 0;
    } catch (error) {
      console.error('Error fetching live mint count:', error);
      return 0;
    }
  }

  /**
   * Get purchases for a specific token from the marketplace
   * Uses server-side proxy to keep API key secure
   * Returns all purchase records that match the tokenKey
   */
  async getPurchasesForToken(
    tokenKey: string
  ): Promise<MarketplacePurchase[]> {
    try {
      // Parse tokenKey: {chain}:{contract}:{tokenId}
      const [chain, contract, tokenId] = tokenKey.split(':');
      if (!chain || !contract || !tokenId) {
        console.warn('Invalid tokenKey format:', tokenKey);
        return [];
      }

      // Call server proxy instead of direct API
      const response = await axios.get('/api/marketplace/purchases/token', {
        params: { chain, contract, tokenId },
        timeout: 15000,
      });

      // Check for server-side config error
      if (response.data.configured === false) {
        console.warn('Marketplace not configured on server');
        return [];
      }

      // Transform API response to MarketplacePurchase[] with ISO date strings
      const purchases: MarketplacePurchase[] = (response.data.purchases || []).map((p: any) => ({
        purchaseId: p.id || p.purchaseId || String(Date.now()),
        tokenKey,
        buyerAddress: p.buyer?.toLowerCase() || p.buyerAddress?.toLowerCase() || '',
        priceGun: parseFloat(p.priceGun || p.price || 0),
        priceUsd: p.priceUsd !== undefined ? parseFloat(p.priceUsd) : undefined,
        purchaseDateIso: toIsoString(p.purchaseDate || p.timestamp || p.createdAt),
        txHash: p.txHash || p.transactionHash || undefined,
        orderId: p.orderId || undefined,
      }));

      return purchases;
    } catch (error) {
      const axiosError = error as any;
      // 503 means not configured - don't log as error
      if (axiosError?.response?.status === 503) {
        console.warn('Marketplace not configured on server');
        return [];
      }
      console.error('Error fetching purchases for token:', error);
      return [];
    }
  }

  /**
   * Get all purchases for a wallet address within a time range
   * Uses server-side proxy to keep API key secure
   * Useful for matching against transfer events
   */
  async getPurchasesForWallet(
    walletAddress: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
    }
  ): Promise<MarketplacePurchase[]> {
    try {
      const params: Record<string, string | number> = {
        wallet: walletAddress.toLowerCase(),
      };

      if (options?.fromDate) {
        params.fromDate = options.fromDate.toISOString();
      }
      if (options?.toDate) {
        params.toDate = options.toDate.toISOString();
      }
      if (options?.limit) {
        params.limit = options.limit;
      }

      // Call server proxy instead of direct API
      const response = await axios.get('/api/marketplace/purchases/wallet', {
        params,
        timeout: 15000,
      });

      // Check for server-side config error
      if (response.data.configured === false) {
        console.warn('Marketplace not configured on server');
        return [];
      }

      // Transform API response to MarketplacePurchase[] with ISO date strings
      const purchases: MarketplacePurchase[] = (response.data.purchases || []).map((p: any) => ({
        purchaseId: p.id || p.purchaseId || String(Date.now()),
        tokenKey: p.tokenKey || `${p.chain || 'gunz'}:${p.contract?.toLowerCase() || ''}:${p.tokenId || ''}`,
        buyerAddress: p.buyer?.toLowerCase() || p.buyerAddress?.toLowerCase() || walletAddress.toLowerCase(),
        priceGun: parseFloat(p.priceGun || p.price || 0),
        priceUsd: p.priceUsd !== undefined ? parseFloat(p.priceUsd) : undefined,
        purchaseDateIso: toIsoString(p.purchaseDate || p.timestamp || p.createdAt),
        txHash: p.txHash || p.transactionHash || undefined,
        orderId: p.orderId || undefined,
      }));

      return purchases;
    } catch (error) {
      const axiosError = error as any;
      // 503 means not configured - don't log as error
      if (axiosError?.response?.status === 503) {
        console.warn('Marketplace not configured on server');
        return [];
      }
      console.error('Error fetching purchases for wallet:', error);
      return [];
    }
  }
}

/**
 * Convert various date formats to ISO string
 * Handles Date objects, ISO strings, timestamps, etc.
 */
function toIsoString(value: unknown): string {
  if (!value) {
    return new Date().toISOString();
  }

  // Already ISO string
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  // Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? new Date().toISOString() : value.toISOString();
  }

  // Timestamp number (ms or seconds)
  if (typeof value === 'number') {
    // Assume milliseconds if > 10 billion, otherwise seconds
    const ms = value > 10000000000 ? value : value * 1000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // Firestore-style { seconds, nanoseconds } object
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = (value as { seconds: number }).seconds;
    const d = new Date(seconds * 1000);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  return new Date().toISOString();
}
