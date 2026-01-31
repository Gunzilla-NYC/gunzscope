import { NextRequest, NextResponse } from 'next/server';
import { AvalancheService } from '@/lib/blockchain/avalanche';
import { calculatePortfolioPnL } from '@/lib/portfolio/pnlService';

const NFT_CONTRACT = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '';

/**
 * Extract rarity from NFT traits
 * Checks for 'RARITY', 'Rarity', and 'rarity' keys
 */
function extractRarity(traits: Record<string, string> | undefined): string | undefined {
  if (!traits) return undefined;
  return traits['RARITY'] || traits['Rarity'] || traits['rarity'];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> }
) {
  const timestamp = new Date().toISOString();

  try {
    const { walletAddress } = await params;

    // Validate wallet address format
    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid wallet address format',
          timestamp,
        },
        { status: 400 }
      );
    }

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

    // Get wallet's NFTs
    const avalancheService = new AvalancheService();
    const allNfts: Array<{ tokenId: string; name: string; rarity?: string }> = [];

    // Paginate through all NFTs
    let startIndex = 0;
    const pageSize = 50;
    let hasMore = true;

    while (hasMore) {
      const page = await avalancheService.getNFTsPaginated(
        walletAddress,
        startIndex,
        pageSize
      );

      for (const nft of page.nfts) {
        allNfts.push({
          tokenId: nft.tokenId,
          name: nft.name,
          rarity: extractRarity(nft.traits),
        });
      }

      hasMore = page.hasMore;
      startIndex += pageSize;
    }

    console.log(`[API] Calculating P&L for ${allNfts.length} NFTs in wallet ${walletAddress}`);

    // Calculate portfolio P&L
    const result = await calculatePortfolioPnL(allNfts, NFT_CONTRACT, walletAddress);

    return NextResponse.json({
      success: true,
      data: result,
      timestamp,
    });
  } catch (error) {
    console.error('[API] Error calculating portfolio P&L:', error);
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
