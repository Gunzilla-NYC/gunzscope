/**
 * Extract display-ready portfolio summary from a PortfolioCache blob.
 * Used by the share page to generate live OG card params.
 */

interface WalletDataMinimal {
  avalanche?: {
    gunToken?: { balance?: number; usdValue?: number } | null;
    nfts?: Array<{
      floorPrice?: number;
      purchasePriceGun?: number;
      quantity?: number;
      marketExitGun?: number;
    }>;
  };
  solana?: {
    gunToken?: { balance?: number } | null;
    nfts?: Array<unknown>;
  };
  totalValue?: number;
}

export interface PortfolioSummary {
  totalUsd: string;
  gunBalance: string;
  nftCount: number;
  nftPnlPct: string | null;
  gunSpent: string | null;
}

/**
 * Parse a PortfolioCache walletBlob and extract formatted display values
 * matching the format expected by the OG image route.
 *
 * Returns null if the blob can't be parsed or has no meaningful data.
 */
export function extractPortfolioSummary(
  walletBlob: string,
  gunPrice: number | null,
  nftCount: number,
): PortfolioSummary | null {
  try {
    const data: WalletDataMinimal = JSON.parse(walletBlob);
    if (!data) return null;

    // GUN balance (avalanche + solana)
    const avaxGun = data.avalanche?.gunToken?.balance ?? 0;
    const solGun = data.solana?.gunToken?.balance ?? 0;
    const totalGun = avaxGun + solGun;

    // GUN USD value
    const gunUsd = gunPrice ? totalGun * gunPrice : 0;

    // NFT valuation — use market exit (waterfall) or floor price
    const nfts = data.avalanche?.nfts ?? [];
    let nftUsd = 0;
    let totalGunSpent = 0;
    let totalFloorGun = 0;

    for (const nft of nfts) {
      const qty = nft.quantity ?? 1;
      const exitGun = nft.marketExitGun ?? nft.floorPrice ?? 0;
      totalFloorGun += exitGun * qty;

      if (nft.purchasePriceGun) {
        totalGunSpent += nft.purchasePriceGun * qty;
      }
    }

    if (gunPrice) {
      nftUsd = totalFloorGun * gunPrice;
    }

    const totalUsd = gunUsd + nftUsd;

    // P&L calculation (GUN-denominated: floor vs spent)
    let nftPnlPct: string | null = null;
    if (totalGunSpent > 0) {
      const pnlGun = totalFloorGun - totalGunSpent;
      const pct = (pnlGun / totalGunSpent) * 100;
      nftPnlPct = pct >= 0 ? `+${pct.toFixed(1)}` : pct.toFixed(1);
    }

    // Format for OG route (locale-formatted strings matching WalletIdentity pattern)
    return {
      totalUsd: totalUsd.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
      gunBalance: totalGun.toLocaleString(),
      nftCount,
      nftPnlPct,
      gunSpent: totalGunSpent > 0 ? totalGunSpent.toLocaleString() : null,
    };
  } catch {
    return null;
  }
}
