import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface SnapshotPayload {
  address: string;
  chain: string;
  nftCount: number;
  nftsWithPrice?: number;
  gunBalance?: number;
  totalGunSpent?: number;
  nftValueGun?: number;
  gunPriceUsd?: number;
}

/**
 * POST /api/portfolio/snapshot
 * Records a portfolio snapshot for tracking NFT counts over time.
 *
 * Rate limited to 1 snapshot per address per hour to prevent spam.
 */
export async function POST(request: NextRequest) {
  try {
    const body: SnapshotPayload = await request.json();

    if (!body.address || !body.chain || typeof body.nftCount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: address, chain, nftCount' },
        { status: 400 }
      );
    }

    const normalizedAddress = body.address.toLowerCase();

    // Rate limit: Check for existing snapshot in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentSnapshot = await prisma.portfolioSnapshot.findFirst({
      where: {
        address: normalizedAddress,
        chain: body.chain,
        timestamp: { gte: oneHourAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (recentSnapshot) {
      // Update existing snapshot instead of creating new one
      const updated = await prisma.portfolioSnapshot.update({
        where: { id: recentSnapshot.id },
        data: {
          nftCount: body.nftCount,
          nftsWithPrice: body.nftsWithPrice ?? 0,
          gunBalance: body.gunBalance ?? 0,
          totalGunSpent: body.totalGunSpent ?? 0,
          nftValueGun: body.nftValueGun ?? 0,
          gunPriceUsd: body.gunPriceUsd ?? 0,
          timestamp: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        snapshot: updated,
        updated: true,
      });
    }

    // Create new snapshot
    const snapshot = await prisma.portfolioSnapshot.create({
      data: {
        address: normalizedAddress,
        chain: body.chain,
        nftCount: body.nftCount,
        nftsWithPrice: body.nftsWithPrice ?? 0,
        gunBalance: body.gunBalance ?? 0,
        totalGunSpent: body.totalGunSpent ?? 0,
        nftValueGun: body.nftValueGun ?? 0,
        gunPriceUsd: body.gunPriceUsd ?? 0,
      },
    });

    return NextResponse.json({
      success: true,
      snapshot,
      created: true,
    });
  } catch (error) {
    console.error('Error recording portfolio snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to record snapshot' },
      { status: 500 }
    );
  }
}
