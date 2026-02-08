import { OpenSeaService } from '@/lib/api/opensea';
import type { ScarcityPageData } from '@/lib/types';

export async function GET(): Promise<Response> {
  try {
    const opensea = new OpenSeaService();

    // Fetch trait stats and active listings in parallel
    const [traitStats, listings] = await Promise.all([
      opensea.getCollectionTraits('off-the-grid'),
      opensea.getActiveListingsByItem('off-the-grid'),
    ]);

    // Also fetch recent sales to enrich listings with 7d sale counts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSales = await opensea.getCollectionSaleEvents('off-the-grid', sevenDaysAgo, 200);

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
    const enrichedListings = listings.map((listing) => {
      const sales = salesByName.get(listing.itemName);
      return {
        itemName: listing.itemName,
        imageUrl: listing.imageUrl,
        listingCount: listing.listingCount,
        floorPriceGun: listing.floorPriceGun,
        recentSales: sales?.count ?? 0,
        avgSalePriceGun: sales && sales.count > 0 ? sales.totalPrice / sales.count : null,
      };
    });

    // Also add items that sold recently but aren't currently listed
    for (const [name, sales] of salesByName.entries()) {
      if (!listings.some((l) => l.itemName === name)) {
        enrichedListings.push({
          itemName: name,
          imageUrl: null,
          listingCount: 0,
          floorPriceGun: 0,
          recentSales: sales.count,
          avgSalePriceGun: sales.count > 0 ? sales.totalPrice / sales.count : null,
        });
      }
    }

    const data: ScarcityPageData = {
      traitStats,
      listings: enrichedListings,
      lastUpdated: new Date().toISOString(),
    };

    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    });
  } catch (error) {
    console.error('[API:scarcity] Error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
