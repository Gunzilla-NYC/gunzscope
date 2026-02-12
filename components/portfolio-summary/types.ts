export type PortfolioViewMode = 'simple' | 'detailed';

export interface NftPnL {
  unrealizedGun: number | null;
  unrealizedUsd: number | null;
  pct: number | null;
  coverage: number;
  totalItems: number;
  nftsWithCost: number;
  nftsFreeTransfer: number;
}

export interface AcquisitionBreakdown {
  minted: number;
  mintedGun: number;
  bought: number;
  boughtGun: number;
  transferred: number;
  pending: number;
}

export interface ChangeDisplay {
  text: string;
  colorClass: string;
  isCalculating: boolean;
}
