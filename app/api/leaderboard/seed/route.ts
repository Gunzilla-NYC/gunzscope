import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { ethers } from 'ethers';
import { getGunPriceUsd } from '@/lib/server/gunPrice';

const GUNZSCAN_API = 'https://gunzscan.io/api/v2';
const OTG_GAME_ITEM_CONTRACT = '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';
const GUNZCHAIN_RPC = 'https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc';

interface GunzScanHolder {
  address: { hash: string };
  value: string; // NFT count as string
}

/**
 * POST /api/leaderboard/seed
 * Discovers top NFT holders from GunzScan and creates portfolio snapshots.
 * This seeds the leaderboard with active wallets so it's not empty.
 *
 * Protected by a simple secret to prevent abuse.
 */
export async function POST(request: Request) {
  try {
    // Simple auth check
    const { secret, limit = 20 } = await request.json().catch(() => ({ secret: '', limit: 20 }));
    if (secret !== process.env.SEED_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clampedLimit = Math.min(Number(limit), 50);

    // 1. Fetch top NFT holders from GunzScan Blockscout API
    const holdersRes = await fetch(
      `${GUNZSCAN_API}/tokens/${OTG_GAME_ITEM_CONTRACT}/holders?limit=${clampedLimit}`
    );
    if (!holdersRes.ok) {
      throw new Error(`GunzScan API error: ${holdersRes.status}`);
    }

    const holdersData = await holdersRes.json();
    const holders: GunzScanHolder[] = holdersData.items ?? [];

    if (holders.length === 0) {
      return NextResponse.json({ seeded: 0, message: 'No holders found' });
    }

    // 2. Fetch current GUN price (direct call, no self-fetch)
    const gunPriceUsd = await getGunPriceUsd();

    // 3. For each holder, fetch GUN balance and create snapshot
    const provider = new ethers.JsonRpcProvider(GUNZCHAIN_RPC);
    const results: { address: string; nftCount: number; gunBalance: number; status: string }[] = [];

    // Skip rate limit for seeding — check if snapshot exists within last 24h instead of 1h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const holder of holders) {
      const address = holder.address.hash.toLowerCase();
      const nftCount = parseInt(holder.value, 10) || 0;

      // Skip if already has a recent snapshot
      const existing = await prisma.portfolioSnapshot.findFirst({
        where: {
          address,
          timestamp: { gte: oneDayAgo },
        },
      });

      if (existing) {
        results.push({ address, nftCount, gunBalance: 0, status: 'skipped (recent)' });
        continue;
      }

      // Fetch GUN balance
      let gunBalance = 0;
      try {
        const balance = await provider.getBalance(address);
        gunBalance = parseFloat(ethers.formatEther(balance));
      } catch {
        // continue without balance
      }

      // Create snapshot
      await prisma.portfolioSnapshot.create({
        data: {
          address,
          chain: 'avalanche',
          nftCount,
          nftsWithPrice: 0,
          gunBalance,
          totalGunSpent: 0,
          nftValueGun: 0,
          gunPriceUsd,
        },
      });

      results.push({ address, nftCount, gunBalance, status: 'created' });
    }

    const created = results.filter((r) => r.status === 'created').length;
    const skipped = results.filter((r) => r.status.startsWith('skipped')).length;

    return NextResponse.json({
      seeded: created,
      skipped,
      total: holders.length,
      gunPriceUsd,
      results,
    });
  } catch (error) {
    console.error('Error seeding leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to seed leaderboard' },
      { status: 500 }
    );
  }
}
