/**
 * NFT Eligibility Service
 *
 * Checks if a user has enough OTG NFTs (5+) to participate in feature requests.
 * Uses PortfolioSnapshot data linked through user's wallets.
 */

import prisma from '../db';

export interface EligibilityResult {
  eligible: boolean;
  nftCount: number;
}

/**
 * Check if a user has 5+ OTG NFTs across their linked wallets.
 * Looks at the most recent PortfolioSnapshot for each wallet address.
 */
export async function checkNFTEligibility(userId: string): Promise<EligibilityResult> {
  // Get all wallet addresses linked to this user
  const wallets = await prisma.wallet.findMany({
    where: { userProfileId: userId },
    select: { address: true },
  });

  if (wallets.length === 0) {
    return { eligible: false, nftCount: 0 };
  }

  const addresses = wallets.map((w) => w.address);

  // Get the most recent snapshot for each address to find max NFT count
  const snapshots = await prisma.portfolioSnapshot.findMany({
    where: { address: { in: addresses } },
    orderBy: { timestamp: 'desc' },
    distinct: ['address'],
    select: { nftCount: true },
  });

  // Sum NFT counts across all wallets
  const totalNftCount = snapshots.reduce((sum, s) => sum + s.nftCount, 0);

  return {
    eligible: totalNftCount >= 5,
    nftCount: totalNftCount,
  };
}
