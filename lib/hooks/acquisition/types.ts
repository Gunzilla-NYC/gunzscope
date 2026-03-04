import { AcquisitionVenue } from '@/lib/types';
import { NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';
import { FetchStatus } from '@/lib/nft/nftDetailHelpers';
import { type DebugDataState } from '@/components/nft-detail/types';

// =============================================================================
// Types
// =============================================================================

// Price source tracking - how we determined the purchase price
export type PriceSource = 'transfers' | 'localStorage' | 'onchain' | 'none';

// Marketplace matching method
export type MarketplaceMatchMethod = 'txHash' | 'timeWindow' | 'none';

// Acquisition type from transfer analysis
export type AcquisitionType = 'MINT' | 'TRANSFER' | 'PURCHASE' | 'UNKNOWN';

// =============================================================================
// RESOLVED ACQUISITION - Deterministic best-available acquisition data
// Prevents downgrades during refresh (e.g., PURCHASE -> TRANSFER fallback)
// =============================================================================

export type ResolvedAcquisitionSource = 'holdingAcquisitionRaw' | 'onchain' | 'localStorage' | 'transferDerivation' | 'unknown';

export interface ResolvedAcquisition {
  acquisitionType: AcquisitionType | null;
  venue: AcquisitionVenue | null;
  acquiredAt: string | null;  // ISO string
  costGun: number | null;
  costUsd: number | null;
  txFeeGun: number | null;       // Gas fee in GUN for this transaction
  senderTxFeeGun: number | null; // Gas fee for sender's original purchase (transfers)
  txHash: string | null;
  fromAddress: string | null;
  source: ResolvedAcquisitionSource;
  qualityScore: number;
  qualityReasons: string[];
}

// Structured acquisition data - separates transfer-derived vs price-derived fields
export interface AcquisitionData {
  // Source tracking
  priceSource: PriceSource;           // How we determined the price (onchain/transfers/localStorage/none)
  acquisitionVenue?: AcquisitionVenue; // Where the acquisition happened (opensea/otg_marketplace/decoder/mint/transfer/unknown)

  // Transfer-derived fields (from blockchain)
  acquiredAt?: Date;           // Block timestamp of first incoming transfer
  fromAddress?: string;        // Address that sent the NFT
  acquisitionTxHash?: string;  // Transaction hash of acquisition
  acquisitionType?: AcquisitionType; // MINT, TRANSFER, PURCHASE, or UNKNOWN

  // Marketplace purchase price fields (OpenSea, OTG Marketplace, etc.)
  purchasePriceGun?: number;   // Price paid in GUN for marketplace purchases
  purchasePriceUsd?: number;   // Calculated from purchasePriceGun at historical rate
  purchaseDate?: Date;         // Same as acquiredAt when price is known
  marketplaceTxHash?: string;  // TX hash of the purchase transaction

  // Decode/Mint cost fields (in-game decode costs, NOT marketplace purchases)
  decodeCostGun?: number;      // Cost paid to decode/mint (in-game currency)
  decodeCostUsd?: number;      // Calculated from decodeCostGun at historical rate

  // Offer fill detection
  isOfferFill?: boolean;       // True when acquired via a pre-signed OpenSea offer (wGUN)

  // Historical price resolution metadata
  priceConfidence?: 'exact' | 'daily' | 'estimated';   // Confidence of the historical GUN rate used
  historicalPriceSource?: 'cache' | 'coingecko' | 'defillama' | 'estimated'; // Which source provided the rate

  // Legacy compatibility
  transferredFrom?: string;    // Alias for fromAddress when acquisitionType=TRANSFER
  isFreeTransfer?: boolean;    // True if TRANSFER with no price (not applicable to paid decodes)
  transferType?: 'self' | 'gift'; // 'self' = between user's own wallets, 'gift' = from external wallet
}

// Re-export ItemData for consumers
export interface ItemData {
  tokenId: string;
  mintNumber: string;
  rarity?: string;
  index: number;
  colors: { primary: string; border: string };
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchaseDate?: Date;
}

// =============================================================================
// Hook Options & Result
// =============================================================================

export interface UseNFTAcquisitionPipelineOptions {
  walletAddress?: string;
  debugMode: boolean;
  noCacheMode: boolean;
  currentGunPrice: number | null;
  updateDebugData: (updates: Partial<DebugDataState>) => void;
}

export interface UseNFTAcquisitionPipelineResult {
  loadingDetails: boolean;
  currentPurchaseData: AcquisitionData | undefined;
  currentResolvedAcquisition: ResolvedAcquisition | undefined;
  holdingAcquisitionRaw: NFTHoldingAcquisition | null;
  listingsData: { lowest?: number; highest?: number; average?: number } | null;
  itemPurchaseData: Record<string, AcquisitionData>;
  resolvedAcquisitions: Record<string, ResolvedAcquisition>;
  listingsStatusByTokenId: Record<string, FetchStatus>;
  listingsErrorByTokenId: Record<string, string | null>;
  holdingAcqStatusByTokenId: Record<string, FetchStatus>;
  holdingAcqErrorByTokenId: Record<string, string | null>;
}
