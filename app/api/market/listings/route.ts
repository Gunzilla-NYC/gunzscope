import { OpenSeaService } from '@/lib/api/opensea';
import { setReferencePriceCache, type MarketReferencePrice } from '@/lib/api/marketCache';
import type { MarketListingsResponse, MarketItemGroup } from '@/lib/types';

// In-memory server cache (same pattern as /api/opensea/rarity-floors)
let cache: MarketListingsResponse | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(): Promise<Response> {
  const now = Date.now();

  // Return cached data if fresh
  if (cache && now < cacheExpiresAt) {
    return Response.json(cache, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  }

  try {
    const opensea = new OpenSeaService();

    // Fetch listings + 7-day sales in parallel (they're independent)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [rawItems, recentSales] = await Promise.all([
      opensea.getActiveListingsDetailed('off-the-grid'),
      opensea.getCollectionSaleEvents('off-the-grid', sevenDaysAgo, 200),
    ]);

    // Build sales-by-name map
    const salesByName = new Map<string, { count: number; totalPrice: number }>();
    for (const sale of recentSales) {
      if (!sale.nftName) continue;
      const existing = salesByName.get(sale.nftName);
      const effectivePrice = sale.priceGUN > 0 ? sale.priceGUN : sale.priceWGUN;
      if (existing) {
        existing.count++;
        if (effectivePrice > 0) existing.totalPrice += effectivePrice;
      } else {
        salesByName.set(sale.nftName, { count: 1, totalPrice: effectivePrice > 0 ? effectivePrice : 0 });
      }
    }

    // Merge listings with sales data
    const items: MarketItemGroup[] = rawItems.map((item) => {
      const sales = salesByName.get(item.itemName);
      return {
        itemName: item.itemName,
        imageUrl: item.imageUrl,
        floorPriceGun: item.floorPriceGun,
        listingCount: item.listingCount,
        listings: item.listings,
        recentSales: sales?.count ?? 0,
        avgSalePriceGun: sales && sales.count > 0 ? sales.totalPrice / sales.count : null,
      };
    });

    const totalListingCount = items.reduce((sum, i) => sum + i.listingCount, 0);

    const data: MarketListingsResponse = {
      items,
      totalListingCount,
      uniqueItemCount: items.length,
      lastUpdated: new Date().toISOString(),
    };

    // Populate shared reference price cache for portfolio valuations
    const byItemName: Record<string, MarketReferencePrice> = {};
    for (const item of items) {
      if (item.itemName && !item.itemName.startsWith('Token #')) {
        byItemName[item.itemName] = {
          floorGun: item.floorPriceGun,
          avgSaleGun7d: item.avgSalePriceGun,
          listingCount: item.listingCount,
          recentSales: item.recentSales,
        };
      }
    }
    setReferencePriceCache({ byItemName, updatedAt: new Date().toISOString() });

    // Update server cache
    cache = data;
    cacheExpiresAt = now + CACHE_TTL_MS;

    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[API:market/listings] Error:', error);

    // Return stale cache on error if available
    if (cache) {
      return Response.json(cache, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      });
    }

    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
