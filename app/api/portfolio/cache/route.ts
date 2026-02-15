import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';

const MAX_BLOB_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * GET /api/portfolio/cache?address=0x...
 * Returns the cached enriched portfolio for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  const address = request.nextUrl.searchParams.get('address')?.toLowerCase();
  if (!address) {
    return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
  }

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { dynamicUserId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const cache = await prisma.portfolioCache.findUnique({
      where: {
        userProfileId_address: {
          userProfileId: profile.id,
          address,
        },
      },
    });

    if (!cache) {
      return NextResponse.json({ error: 'No cached portfolio' }, { status: 404 });
    }

    return NextResponse.json({
      walletBlob: cache.walletBlob,
      gunPrice: cache.gunPrice,
      nftCount: cache.nftCount,
      savedAt: cache.savedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error loading portfolio cache:', error);
    return NextResponse.json({ error: 'Failed to load cache' }, { status: 500 });
  }
}

/**
 * PUT /api/portfolio/cache
 * Saves the enriched portfolio blob for the authenticated user.
 */
export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.success) return unauthorizedResponse(auth);

  try {
    const body = await request.json();
    const { address, walletBlob, gunPrice, nftCount } = body;

    if (!address || !walletBlob || typeof nftCount !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: address, walletBlob, nftCount' },
        { status: 400 },
      );
    }

    if (walletBlob.length > MAX_BLOB_SIZE) {
      return NextResponse.json(
        { error: `walletBlob exceeds ${MAX_BLOB_SIZE / 1024 / 1024}MB limit` },
        { status: 413 },
      );
    }

    const normalizedAddress = address.toLowerCase();

    const profile = await prisma.userProfile.findUnique({
      where: { dynamicUserId: auth.user.userId },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const result = await prisma.portfolioCache.upsert({
      where: {
        userProfileId_address: {
          userProfileId: profile.id,
          address: normalizedAddress,
        },
      },
      update: {
        walletBlob,
        gunPrice: gunPrice ?? null,
        nftCount,
        savedAt: new Date(),
      },
      create: {
        userProfileId: profile.id,
        address: normalizedAddress,
        walletBlob,
        gunPrice: gunPrice ?? null,
        nftCount,
      },
    });

    return NextResponse.json({
      success: true,
      savedAt: result.savedAt.toISOString(),
    });
  } catch (error) {
    console.error('Error saving portfolio cache:', error);
    return NextResponse.json({ error: 'Failed to save cache' }, { status: 500 });
  }
}
