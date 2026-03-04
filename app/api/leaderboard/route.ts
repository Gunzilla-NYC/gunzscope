import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getGunPriceUsd } from '@/lib/server/gunPrice';

/**
 * GET /api/leaderboard
 * Returns ranked wallet entries from PortfolioSnapshot data.
 * Each wallet appears once (latest snapshot). Sorted by total portfolio USD.
 * Cached for 5 minutes.
 */
export async function GET() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Fetch latest snapshot per wallet (DB-level dedup) and GUN price in parallel
    const [snapshots, priceResult] = await Promise.all([
      prisma.portfolioSnapshot.findMany({
        where: { timestamp: { gte: thirtyDaysAgo } },
        orderBy: { timestamp: 'desc' },
        distinct: ['address'],
      }),
      getGunPriceUsd(),
    ]);

    let gunPriceUsd = priceResult;

    // Fallback to snapshot average if price unavailable
    if (gunPriceUsd === 0) {
      const validSnapshots = snapshots.filter((s) => s.gunPriceUsd > 0);
      if (validSnapshots.length > 0) {
        gunPriceUsd =
          validSnapshots.reduce((sum, s) => sum + s.gunPriceUsd, 0) /
          validSnapshots.length;
      }
    }

    // Compute leaderboard entries
    const entries = snapshots
      .filter((s) => s.nftCount > 0 || s.gunBalance > 0)
      .map((s) => {
        const gunBalanceUsd = s.gunBalance * gunPriceUsd;
        const nftValueUsd = s.nftValueGun * gunPriceUsd;
        const totalPortfolioUsd = gunBalanceUsd + nftValueUsd;
        const unrealizedPnlGun = s.nftValueGun - s.totalGunSpent;
        const unrealizedPnlUsd = unrealizedPnlGun * gunPriceUsd;
        const pnlPercentage =
          s.totalGunSpent > 0
            ? (unrealizedPnlGun / s.totalGunSpent) * 100
            : null;

        return {
          address: s.address,
          chain: s.chain,
          totalPortfolioUsd,
          gunBalance: s.gunBalance,
          gunBalanceUsd,
          nftCount: s.nftCount,
          nftValueUsd,
          totalGunSpent: s.totalGunSpent,
          unrealizedPnlUsd,
          pnlPercentage,
          lastUpdated: s.timestamp.toISOString(),
        };
      })
      .sort((a, b) => b.totalPortfolioUsd - a.totalPortfolioUsd)
      .slice(0, 100)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));

    return NextResponse.json(
      {
        entries,
        gunPriceUsd,
        totalWallets: snapshots.length,
        lastUpdated: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
