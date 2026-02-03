import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * GET /api/stats/site
 * Returns site-wide statistics including total NFTs tracked across all users.
 *
 * Response is cached for 5 minutes to reduce database load.
 */
export async function GET() {
  try {
    // Only consider snapshots from the last 30 days as "active"
    // This prevents stale data from wallets that haven't been tracked recently
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get the most recent snapshot per unique address+chain combination
    // This gives us the current state of all tracked portfolios
    const snapshots = await prisma.portfolioSnapshot.findMany({
      where: { timestamp: { gte: thirtyDaysAgo } },
      orderBy: { timestamp: 'desc' },
      distinct: ['address', 'chain'],
    });

    // Calculate aggregate statistics
    const totalNftsTracked = snapshots.reduce(
      (sum, s) => sum + s.nftCount,
      0
    );
    const totalNftsWithPrice = snapshots.reduce(
      (sum, s) => sum + s.nftsWithPrice,
      0
    );
    const uniqueWallets = new Set(snapshots.map((s) => s.address)).size;

    // Aggregate GUN values from snapshots
    const totalGunSpent = snapshots.reduce((sum, s) => sum + s.totalGunSpent, 0);
    const totalNftValueGun = snapshots.reduce((sum, s) => sum + s.nftValueGun, 0);
    const totalGunBalance = snapshots.reduce((sum, s) => sum + s.gunBalance, 0);

    // Get current GUN price (try fetching, fallback to average from snapshots)
    let currentGunPrice = 0;
    try {
      const priceRes = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/price/gun`,
        { next: { revalidate: 60 } }
      );
      if (priceRes.ok) {
        const priceData = await priceRes.json();
        currentGunPrice = priceData.gunTokenPrice ?? 0;
      }
    } catch {
      // Use average from snapshots as fallback
      const validSnapshots = snapshots.filter((s) => s.gunPriceUsd > 0);
      if (validSnapshots.length > 0) {
        currentGunPrice = validSnapshots.reduce((sum, s) => sum + s.gunPriceUsd, 0) / validSnapshots.length;
      }
    }

    // If fetch succeeded but returned 0, also try fallback
    if (currentGunPrice === 0) {
      const validSnapshots = snapshots.filter((s) => s.gunPriceUsd > 0);
      if (validSnapshots.length > 0) {
        currentGunPrice = validSnapshots.reduce((sum, s) => sum + s.gunPriceUsd, 0) / validSnapshots.length;
      }
    }

    // Portfolio Value = (NFT value + GUN balance) × current GUN price
    const portfolioValueUsd = (totalNftValueGun + totalGunBalance) * currentGunPrice;

    // P&L = Current NFT Value - Acquisition Cost (both in GUN, then convert)
    const unrealizedPnlGun = totalNftValueGun - totalGunSpent;
    const unrealizedPnlUsd = unrealizedPnlGun * currentGunPrice;

    // Get snapshot count for the last 24 hours (activity metric)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await prisma.portfolioSnapshot.count({
      where: { timestamp: { gte: oneDayAgo } },
    });

    return NextResponse.json(
      {
        nftsTracked: totalNftsTracked,
        nftsWithPrice: totalNftsWithPrice,
        walletsTracked: uniqueWallets,
        snapshotsLast24h: recentActivity,
        portfolioValueUsd,
        unrealizedPnlUsd,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching site stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch site statistics' },
      { status: 500 }
    );
  }
}
