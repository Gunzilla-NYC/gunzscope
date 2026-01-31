import axios from 'axios';
import { toOpenSeaChain } from '@/lib/utils/openseaChain';

const OPENSEA_API_BASE = 'https://api.opensea.io/api/v2';

// =============================================================================
// Exported Interfaces for Sale Events
// =============================================================================

/**
 * A single sale event for an NFT
 */
export interface SaleEvent {
  eventTimestamp: Date;
  priceGUN: number;
  priceWGUN: number;
  sellerAddress: string;
  buyerAddress: string;
  txHash: string;
  marketplace: string;
}

/**
 * A sale event with NFT metadata (for collection-wide queries)
 */
export interface CollectionSaleEvent extends SaleEvent {
  tokenId: string;
  nftName: string;
  nftTraits: Record<string, string> | null;
}

/**
 * Floor price and collection statistics
 */
export interface FloorPriceResult {
  floorPriceGUN: number | null;
  totalVolume: number | null;
  totalSales: number | null;
  numOwners: number | null;
  lastUpdated: Date;
}

/**
 * A comparable sale for valuation purposes
 */
export interface ComparableSale {
  tokenId: string;
  nftName: string;
  rarity: string;
  salePriceGUN: number;
  saleDate: Date;
  buyerAddress: string;
  sellerAddress: string;
}

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

      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${mappedChain}/contract/${contractAddress}`,
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

      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${mappedChain}/account/${walletAddress}/nfts`,
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

      // Server-side: call OpenSea directly with mapped chain
      const headers = this.apiKey
        ? { 'X-API-KEY': this.apiKey }
        : {};

      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/orders/${mappedChain}/seaport/listings?asset_contract_address=${contractAddress}&token_ids=${tokenId}&limit=50`,
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

      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/chain/${mappedChain}/contract/${contractAddress}/nfts/${tokenId}`,
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

      const mappedChain = toOpenSeaChain(chain);

      // Try to get events for this NFT
      const response = await axios.get(
        `${OPENSEA_API_BASE}/events/chain/${mappedChain}/contract/${contractAddress}/nfts/${tokenId}`,
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

  // ===========================================================================
  // Sale Events Methods
  // ===========================================================================

  /**
   * Get sale history for a specific NFT
   */
  async getSaleEvents(
    contractAddress: string,
    tokenId: string,
    chain: string = 'avalanche'
  ): Promise<SaleEvent[]> {
    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};
      const mappedChain = toOpenSeaChain(chain);

      const response = await axios.get(
        `${OPENSEA_API_BASE}/events/chain/${mappedChain}/contract/${contractAddress}/nfts/${tokenId}`,
        {
          headers,
          params: {
            event_type: 'sale',
            limit: 50,
          },
        }
      );

      const events = response.data?.asset_events || [];

      return events.map((event: any) => this.parseSaleEvent(event));
    } catch (error) {
      console.warn('Error fetching sale events from OpenSea:', error);
      return [];
    }
  }

  /**
   * Get recent sales across the whole collection with pagination support
   */
  async getCollectionSaleEvents(
    collectionSlug: string = 'off-the-grid',
    afterDate?: Date,
    limit: number = 50
  ): Promise<CollectionSaleEvent[]> {
    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      const params: Record<string, string | number> = {
        event_type: 'sale',
        limit: Math.min(limit, 50), // OpenSea max is 50 per request
      };

      if (afterDate) {
        // OpenSea expects Unix timestamp in seconds
        params.after = Math.floor(afterDate.getTime() / 1000);
      }

      const allEvents: CollectionSaleEvent[] = [];
      let cursor: string | null = null;
      let fetched = 0;

      // Paginate until we have enough results or no more pages
      do {
        const requestParams: Record<string, string | number> = cursor
          ? { ...params, next: cursor }
          : params;

        const response = await axios.get<{
          asset_events?: any[];
          next?: string | null;
        }>(`${OPENSEA_API_BASE}/events/collection/${collectionSlug}`, {
          headers,
          params: requestParams,
        });

        const events = response.data?.asset_events || [];
        cursor = response.data?.next || null;

        for (const event of events) {
          if (fetched >= limit) break;
          allEvents.push(this.parseCollectionSaleEvent(event));
          fetched++;
        }
      } while (cursor && fetched < limit);

      return allEvents;
    } catch (error) {
      console.warn('Error fetching collection sale events from OpenSea:', error);
      return [];
    }
  }

  /**
   * Get floor price and collection statistics
   */
  async getCollectionFloorPrice(
    collectionSlug: string = 'off-the-grid'
  ): Promise<FloorPriceResult> {
    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      const response = await axios.get(
        `${OPENSEA_API_BASE}/collections/${collectionSlug}/stats`,
        { headers }
      );

      const stats = response.data?.total || response.data;

      return {
        floorPriceGUN: stats?.floor_price ?? null,
        totalVolume: stats?.volume ?? null,
        totalSales: stats?.sales ?? null,
        numOwners: stats?.num_owners ?? null,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.warn('Error fetching collection floor price from OpenSea:', error);
      return {
        floorPriceGUN: null,
        totalVolume: null,
        totalSales: null,
        numOwners: null,
        lastUpdated: new Date(),
      };
    }
  }

  /**
   * Get rarity-specific floor price by fetching collection listings
   * and filtering by rarity trait
   *
   * @param rarity - The rarity level to filter by (e.g., "Common", "Uncommon", "Rare", "Epic", "Legendary")
   * @param collectionSlug - OpenSea collection slug (default: 'off-the-grid')
   * @returns The minimum listing price for items of this rarity, or null if none found
   */
  async getRarityFloorPrice(
    rarity: string,
    collectionSlug: string = 'off-the-grid'
  ): Promise<{ floorPriceGUN: number | null; listingsCount: number }> {
    try {
      const headers = this.apiKey ? { 'X-API-KEY': this.apiKey } : {};

      // Fetch active listings for the collection
      // OpenSea API v2: /api/v2/listings/collection/{collection_slug}
      const response = await axios.get(
        `${OPENSEA_API_BASE}/listings/collection/${collectionSlug}`,
        {
          headers,
          params: {
            limit: 100, // Get more listings to find rarity matches
          },
        }
      );

      const listings = response.data?.listings || [];

      if (listings.length === 0) {
        return { floorPriceGUN: null, listingsCount: 0 };
      }

      // Filter listings by rarity trait
      const rarityLower = rarity.toLowerCase();
      const matchingPrices: number[] = [];

      for (const listing of listings) {
        // Get the NFT metadata from the protocol_data or the listing
        const nft = listing.protocol_data?.parameters?.offer?.[0] || {};
        const traits = listing.traits || nft.traits || [];

        // Check traits array for rarity match
        let listingRarity: string | null = null;

        // Handle traits as array (OpenSea format)
        if (Array.isArray(traits)) {
          for (const trait of traits) {
            const traitType = (trait.trait_type || trait.type || '').toLowerCase();
            if (traitType === 'rarity') {
              listingRarity = String(trait.value).toLowerCase();
              break;
            }
          }
        }
        // Handle traits as object (some APIs)
        else if (typeof traits === 'object' && traits !== null) {
          listingRarity = (
            traits['RARITY'] ||
            traits['Rarity'] ||
            traits['rarity'] ||
            ''
          ).toLowerCase();
        }

        if (listingRarity === rarityLower) {
          // Extract price from the listing
          const priceInfo = listing.price?.current || listing.current_price;
          if (priceInfo) {
            const priceWei = BigInt(priceInfo.value || priceInfo);
            const decimals = priceInfo.decimals || 18;
            const priceGUN = Number(priceWei) / Math.pow(10, decimals);

            if (priceGUN > 0) {
              matchingPrices.push(priceGUN);
            }
          }
        }
      }

      if (matchingPrices.length === 0) {
        // Fallback: try to get floor from recent sales of same rarity
        const recentSales = await this.getCollectionSaleEvents(collectionSlug, undefined, 100);
        const salePrices: number[] = [];

        for (const sale of recentSales) {
          let saleRarity: string | null = null;
          if (sale.nftTraits) {
            saleRarity = (
              sale.nftTraits['RARITY'] ||
              sale.nftTraits['Rarity'] ||
              sale.nftTraits['rarity'] ||
              ''
            ).toLowerCase();
          }

          if (saleRarity === rarityLower && sale.priceGUN > 0) {
            salePrices.push(sale.priceGUN);
          }
        }

        if (salePrices.length > 0) {
          // Use minimum of recent sale prices as estimate
          return {
            floorPriceGUN: Math.min(...salePrices),
            listingsCount: salePrices.length,
          };
        }

        return { floorPriceGUN: null, listingsCount: 0 };
      }

      return {
        floorPriceGUN: Math.min(...matchingPrices),
        listingsCount: matchingPrices.length,
      };
    } catch (error) {
      console.warn(`Error fetching rarity floor price for ${rarity}:`, error);
      return { floorPriceGUN: null, listingsCount: 0 };
    }
  }

  /**
   * Find recent sales of similar items for valuation
   *
   * Strategy:
   * 1. Try to find exact matches (same name + same rarity)
   * 2. If none found, fallback to rarity-only matches (any item with same rarity)
   * 3. Return sorted by most recent first
   */
  async getComparableSales(
    nftName: string,
    rarity: string,
    collectionSlug: string = 'off-the-grid',
    daysBack: number = 30,
    limit: number = 20
  ): Promise<ComparableSale[]> {
    const DEBUG = process.env.NODE_ENV === 'development';

    try {
      const afterDate = new Date();
      afterDate.setDate(afterDate.getDate() - daysBack);

      // Fetch more events than limit to account for filtering
      const events = await this.getCollectionSaleEvents(
        collectionSlug,
        afterDate,
        limit * 10 // Fetch 10x to ensure enough after filtering
      );

      if (DEBUG) {
        console.log(`[getComparableSales] Fetched ${events.length} events for ${nftName} (${rarity})`);
      }

      // Normalize for comparison
      const nameLower = nftName.toLowerCase().trim();
      const rarityLower = rarity.toLowerCase().trim();

      const exactMatches: ComparableSale[] = [];
      const rarityOnlyMatches: ComparableSale[] = [];

      for (const event of events) {
        // Skip events with no price
        if (!event.priceGUN || event.priceGUN <= 0) {
          // Also check priceWGUN as fallback
          if (!event.priceWGUN || event.priceWGUN <= 0) {
            continue;
          }
        }

        const effectivePrice = event.priceGUN > 0 ? event.priceGUN : event.priceWGUN;

        // Extract rarity from traits (check multiple possible keys)
        let eventRarity: string | null = null;
        if (event.nftTraits) {
          eventRarity =
            event.nftTraits['RARITY'] ||
            event.nftTraits['Rarity'] ||
            event.nftTraits['rarity'] ||
            event.nftTraits['Tier'] ||
            event.nftTraits['tier'] ||
            null;
        }

        if (DEBUG && !eventRarity && event.nftTraits) {
          console.log(`[getComparableSales] No rarity found in traits:`, event.nftTraits);
        }

        const eventRarityLower = eventRarity?.toLowerCase().trim() || '';
        const eventNameLower = (event.nftName || '').toLowerCase().trim();

        // Check for rarity match
        const rarityMatches = eventRarityLower === rarityLower;

        // Check for name match (allow partial/contains match for robustness)
        const exactNameMatch = eventNameLower === nameLower;
        const partialNameMatch =
          eventNameLower.includes(nameLower) || nameLower.includes(eventNameLower);

        const comparableSale: ComparableSale = {
          tokenId: event.tokenId,
          nftName: event.nftName,
          rarity: eventRarity || rarity,
          salePriceGUN: effectivePrice,
          saleDate: event.eventTimestamp,
          buyerAddress: event.buyerAddress,
          sellerAddress: event.sellerAddress,
        };

        if (rarityMatches && (exactNameMatch || partialNameMatch)) {
          exactMatches.push(comparableSale);
        } else if (rarityMatches) {
          rarityOnlyMatches.push(comparableSale);
        }
      }

      if (DEBUG) {
        console.log(`[getComparableSales] Found ${exactMatches.length} exact matches, ${rarityOnlyMatches.length} rarity-only matches`);
      }

      // Use exact matches if available, otherwise fallback to rarity-only
      let results = exactMatches.length > 0 ? exactMatches : rarityOnlyMatches;

      // Sort by most recent first
      results.sort((a, b) => b.saleDate.getTime() - a.saleDate.getTime());

      // Limit results
      results = results.slice(0, limit);

      if (DEBUG) {
        console.log(`[getComparableSales] Returning ${results.length} comparable sales`);
      }

      return results;
    } catch (error) {
      console.warn('Error fetching comparable sales from OpenSea:', error);
      return [];
    }
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Parse a raw OpenSea event into a SaleEvent
   */
  private parseSaleEvent(event: any): SaleEvent {
    const payment = event.payment || {};
    const decimals = payment.decimals || 18;
    const quantity = payment.quantity || '0';

    // Convert from wei to token amount
    const priceRaw = parseFloat(quantity) / Math.pow(10, decimals);
    const symbol = (payment.symbol || '').toUpperCase();

    return {
      eventTimestamp: new Date(event.event_timestamp),
      priceGUN: symbol === 'GUN' ? priceRaw : 0,
      priceWGUN: symbol === 'WGUN' ? priceRaw : 0,
      sellerAddress: event.seller || event.from_account?.address || '',
      buyerAddress: event.buyer || event.to_account?.address || '',
      txHash: event.transaction || event.transaction_hash || '',
      marketplace: 'opensea',
    };
  }

  /**
   * Parse a raw OpenSea event into a CollectionSaleEvent
   */
  private parseCollectionSaleEvent(event: any): CollectionSaleEvent {
    const baseEvent = this.parseSaleEvent(event);
    const nft = event.nft || {};

    // Parse traits into a Record<string, string>
    let nftTraits: Record<string, string> | null = null;
    if (nft.traits && Array.isArray(nft.traits)) {
      nftTraits = {};
      for (const trait of nft.traits) {
        if (trait.trait_type && trait.value !== undefined) {
          nftTraits[trait.trait_type] = String(trait.value);
        }
      }
    }

    return {
      ...baseEvent,
      tokenId: nft.identifier || nft.token_id || '',
      nftName: nft.name || '',
      nftTraits,
    };
  }
}
