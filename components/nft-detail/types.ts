/**
 * NFT Detail Subcomponent Types
 *
 * Display-ready view model types for NFT detail subcomponents.
 * These types enforce that components receive pre-computed values only.
 *
 * GUARDRAILS:
 * - All values must be display-ready (no raw data that enables recomputation)
 * - Status/error values come from parent's per-token maps
 * - Market values come from parent's single computeMarketInputs() call
 * - Cost basis comes from parent's normalizeCostBasis() call
 */

import type { FetchStatus, MarketInputs } from '@/lib/nft/nftDetailHelpers';
import type { AcquisitionVenue } from '@/lib/types';

// =============================================================================
// Acquisition Card View Model
// =============================================================================

/** Display-ready acquisition data (subset of AcquisitionData for rendering) */
export interface AcquisitionDisplayData {
  acquisitionVenue?: AcquisitionVenue;
  purchaseDate?: Date;
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  decodeCostGun?: number;
  decodeCostUsd?: number;
  isFreeTransfer?: boolean;
  transferredFrom?: string;
  marketplaceTxHash?: string;
  acquisitionTxHash?: string;
  acquiredAt?: Date;
}

/** View model for acquisition card - groups all display-ready values */
export interface AcquisitionCardViewModel {
  /** Fetch status for acquisition data */
  status: FetchStatus;
  /** Error message if fetch failed */
  error: string | null;
  /** Pre-computed acquisition display data */
  data: AcquisitionDisplayData | undefined;
  /** Fallback transaction hash */
  fallbackTxHash?: string;
  /** Whether marketplace is configured */
  marketplaceConfigured: boolean;
}

// =============================================================================
// Market Range View Model
// =============================================================================

/** View model for observed market range - groups all display-ready values */
export interface MarketRangeViewModel {
  /** Whether to render the section */
  show: boolean;
  /** Loading state */
  loading: boolean;
  /** Pre-computed market inputs (single source of truth) */
  marketInputs: MarketInputs;
  /** Normalized cost basis (already validated) */
  costBasisGun: number | null;
  /** Listings fetch status */
  listingsStatus: FetchStatus;
  /** Listings error message */
  listingsError: string | null;
}

// =============================================================================
// Traits View Model
// =============================================================================

/** View model for traits section - just the filtered traits record */
export interface TraitsViewModel {
  /** Pre-filtered traits (excludes "None" values) */
  filteredTraits: Record<string, string>;
}

// =============================================================================
// Display Utility Function Types
// =============================================================================

/** Pure function to format a Date for display */
export type FormatDateFn = (date: Date | undefined) => string;

/** Pure function to get display label for acquisition venue */
export type GetVenueDisplayLabelFn = (venue: AcquisitionVenue | undefined, hasDecodeCost?: boolean) => string;

/** Pure function to calculate position on range bar (0-100%) */
export type GetPositionOnRangeFn = (value: number, low: number, high: number) => number;

// =============================================================================
// Debug Panel View Model
// =============================================================================

/** Acquisition type from transfer analysis */
export type AcquisitionType = 'MINT' | 'TRANSFER' | 'PURCHASE' | 'UNKNOWN';

/** Price source classification */
export type PriceSource = 'transfers' | 'localStorage' | 'onchain' | 'none';

/** Marketplace matching method */
export type MarketplaceMatchMethod = 'txHash' | 'timeWindow' | 'none';

/** Source of resolved acquisition */
export type ResolvedAcquisitionSource = 'holdingAcquisitionRaw' | 'onchain' | 'localStorage' | 'transferDerivation' | 'unknown';

/** Resolved acquisition data (deterministic, no-downgrade) */
export interface ResolvedAcquisitionData {
  acquisitionType: AcquisitionType | null;
  venue: AcquisitionVenue | null;
  acquiredAt: string | null;
  costGun: number | null;
  costUsd: number | null;
  txHash: string | null;
  fromAddress: string | null;
  source: ResolvedAcquisitionSource;
  qualityScore: number;
  qualityReasons: string[];
}

/** Holding acquisition from RPC (NFTHoldingAcquisition compatible) */
export interface HoldingAcquisitionData {
  owned: boolean;
  venue: AcquisitionVenue | null;
  txHash: string | null;
  costGun: number | null;
  fromAddress: string | null;
  isMint: boolean;
  acquiredAtIso: string | null;
  debug?: {
    txTo?: string;
    selector?: string;
    gunIsNative?: boolean;
    matchedRule?: string;
    hasOrderFulfilled?: boolean;
  };
}

/** NFT metadata debug info */
export interface MetadataDebugData {
  tokenURI?: string;
  metadataSource: 'tokenURI' | 'gunzscan' | 'unknown';
  hasDescription: boolean;
  descriptionLength: number;
  error?: string;
}

/** Debug data state (the big debug object from parent) */
export interface DebugDataState {
  tokenKey: string;
  cacheKey: string;
  cacheHit: boolean;
  cacheReason: string;
  transferEventCount: number;
  marketplaceMatches: number;
  gunPriceTimestamp: Date | null;
  priceSource: PriceSource;
  transferQueryInfo?: {
    fromBlock?: number;
    toBlock?: number;
    chunksQueried?: number;
    totalLogsFound?: number;
    currentOwner?: string | null;
    txTo?: string;
    selector?: string;
    gunIsNative?: boolean;
    matchedRule?: string;
  };
  derivedFromTransferTxHash?: string;
  derivedAcquiredAt?: string;
  derivedAcquisitionType?: AcquisitionType;
  acquisitionVenue?: string;
  acquisitionTxHash?: string;
  marketplaceConfigured: boolean;
  serverProxyUsed: boolean;
  marketplaceTestConnection?: {
    success: boolean;
    statusCode?: number;
    itemCount?: number;
    error?: string;
    responseKeys?: string[];
    serverProxyUsed?: boolean;
  };
  viewerWallet: string | null;
  currentOwner: string | null;
  tokenPurchasesCount: number;
  walletPurchasesCount_viewerWallet: number;
  walletPurchasesCount_currentOwner: number;
  walletPurchasesTimeRange_viewerWallet?: { min: string; max: string };
  walletPurchasesTimeRange_currentOwner?: { min: string; max: string };
  marketplaceEndpointBaseUrl: string;
  marketplaceNetwork: string;
  matchWindowMinutes: number;
  marketplaceMatchedTxHash?: string;
  marketplaceMatchedOrderId?: string;
  marketplaceMatchedPurchaseId?: string;
  marketplaceMatchedTimestamp?: string;
  marketplaceCandidatesCount: number;
  marketplaceCandidateTimes?: { min: string; max: string };
  marketplaceMatchMethod: MarketplaceMatchMethod;
  openSeaError?: string;
  noCacheEnabled: boolean;
  cacheBypassed: boolean;
  cacheRenderedFirst: boolean;
  backgroundRefreshAttempted: boolean;
  backgroundRefreshUpdated: boolean;
  refreshStartedAtIso: string | null;
  refreshFinishedAtIso: string | null;
  refreshError: string | null;
  refreshResultSummary: string | null;
  refreshExistingScore: number | null;
  refreshNewScore: number | null;
  refreshDecision: 'updated' | 'kept_existing_no_downgrade' | 'error' | 'no_candidates' | null;
}

/** Listings data structure */
export interface ListingsData {
  lowest?: number;
  highest?: number;
  average?: number;
  floorPriceGun?: number | null;
  ceilingPriceGun?: number | null;
  itemCount?: number;
}

/** View model for debug panel - groups all display-ready values */
export interface DebugPanelViewModel {
  /** Whether debug mode is enabled */
  show: boolean;
  /** Whether the debug panel is expanded */
  expanded: boolean;
  /** Copy button feedback state */
  copied: boolean;
  /** Debug data state */
  debugData: DebugDataState;
  /** Metadata debug info from NFT */
  metadataDebug: MetadataDebugData | undefined;
  /** Current purchase data (JSON serializable for display) */
  currentPurchaseDataJson: string;
  /** Resolved acquisition (deterministic) */
  currentResolvedAcquisition: ResolvedAcquisitionData | undefined;
  /** Holding acquisition from RPC */
  holdingAcquisitionRaw: HoldingAcquisitionData | null;
  /** Current GUN price in USD */
  currentGunPrice: number | null;
  /** Listings data for JSON display */
  listingsDataJson: string;
  /** Pre-computed per-token status values (parent does map lookups) */
  listingsStatus: FetchStatus;
  listingsError: string | null;
  holdingAcqStatus: FetchStatus;
  holdingAcqError: string | null;
  /** Map sizes for memory monitoring */
  listingsMapSize: number;
  holdingAcqMapSize: number;
}

/** Pure function to convert Date to ISO string safely */
export type ToIsoStringSafeFn = (date: Date | null | undefined) => string | null;
