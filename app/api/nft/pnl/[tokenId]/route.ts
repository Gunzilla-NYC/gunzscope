import { NextRequest, NextResponse } from 'next/server';
import { calculateNFTPnL } from '@/lib/portfolio/pnlService';

const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tokenId: string }> }
) {
  const timestamp = new Date().toISOString();

  try {
    const { tokenId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Get required wallet param
    const wallet = searchParams.get('wallet');
    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: wallet',
          timestamp,
        },
        { status: 400 }
      );
    }

    // Get optional params for comparable sales
    const name = searchParams.get('name') || undefined;
    const rarity = searchParams.get('rarity') || undefined;

    // Validate contract is configured
    if (!NFT_CONTRACT) {
      console.error('[API] NFT contract address not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Server configuration error: NFT contract not set',
          timestamp,
        },
        { status: 500 }
      );
    }

    // Calculate P&L
    const result = await calculateNFTPnL(
      NFT_CONTRACT,
      tokenId,
      wallet,
      name,
      rarity
    );

    return NextResponse.json({
      success: true,
      data: result,
      timestamp,
    });
  } catch (error) {
    console.error('[API] Error calculating NFT P&L:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp,
      },
      { status: 500 }
    );
  }
}
