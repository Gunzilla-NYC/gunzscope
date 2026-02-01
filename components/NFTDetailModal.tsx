'use client';

// =============================================================================
// TODO: REMAINING HARDENING PHASES
// =============================================================================
// Phase 7 — Historical USD conversion:
//   - Requires API/provider changes: price-at-time for GUN/USD
//   - Fallback rules + caching strategy for historical prices
// =============================================================================

import { NFT, MarketplacePurchase, AcquisitionVenue } from '@/lib/types';
import Image from 'next/image';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AvalancheService, NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';
import { OpenSeaService } from '@/lib/api/opensea';
import { CoinGeckoService } from '@/lib/api/coingecko';
import {
  buildTokenKey,
  buildNftDetailCacheKey,
  getCachedNFTDetail,
  setCachedNFTDetail,
} from '@/lib/utils/nftCache';

// =============================================================================
// Import pure helpers from dedicated module (extracted for testability)
// =============================================================================
import {
  FetchStatus,
  TOKEN_MAP_SOFT_CAP,
  warnOnce,
  normalizeCostBasis,
  isAbortError,
  FIFOKeyTracker,
  toIsoStringSafe,
  computeMarketInputs,
  getPositionLabel,
} from '@/lib/nft/nftDetailHelpers';

// =============================================================================
// Import extracted presentational subcomponents
// =============================================================================
import {
  NFTDetailTraitsSection,
  NFTDetailAcquisitionCard,
  NFTDetailObservedMarketRange,
  NFTDetailDebugPanel,
  type HoldingAcquisitionData,
  type ResolvedAcquisitionData,
  type MetadataDebugData,
} from '@/components/nft-detail';

// Rarity order from highest to lowest
const RARITY_ORDER: Record<string, number> = {
  'Mythic': 1,
  'Legendary': 2,
  'Epic': 3,
  'Rare': 4,
  'Uncommon': 5,
  'Common': 6,
};

// Rarity colors based on the game's color scheme
const RARITY_COLORS: Record<string, { primary: string; border: string }> = {
  'Mythic': {
    primary: '#ff44ff',
    border: 'rgba(255, 68, 255, 0.65)',
  },
  'Legendary': {
    primary: '#ff8800',
    border: 'rgba(255, 136, 0, 0.65)',
  },
  'Epic': {
    primary: '#cc44ff',
    border: 'rgba(204, 68, 255, 0.65)',
  },
  'Rare': {
    primary: '#4488ff',
    border: 'rgba(68, 136, 255, 0.65)',
  },
  'Uncommon': {
    primary: '#44ff44',
    border: 'rgba(68, 255, 68, 0.65)',
  },
  'Common': {
    primary: '#888888',
    border: 'rgba(136, 136, 136, 0.65)',
  },
};

const getDefaultRarityColors = () => ({
  primary: '#b05bff',
  border: 'rgba(176, 91, 255, 0.65)',
});

// =============================================================================
// Related Items Utility
// =============================================================================

/**
 * Check if an NFT is a weapon (base item that can have related skins/attachments)
 */
function isWeapon(nft: NFT): boolean {
  const itemClass = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';
  // Check for exact "Weapon" match or weapon subtypes
  return itemClass === 'Weapon' ||
         itemClass === 'Primary Weapon' ||
         itemClass === 'Secondary Weapon' ||
         itemClass === 'Melee Weapon';
}

/**
 * Find all related items (skins, attachments) for a weapon NFT
 * Returns NFTs that mention this weapon in their name
 */
function findRelatedItems(weaponNft: NFT, allNfts: NFT[]): NFT[] {
  if (!isWeapon(weaponNft)) return [];

  const weaponName = weaponNft.name;

  // Extract the core weapon name (without suffixes like Legacy, MK2, etc.)
  // e.g., "Kestrel Legacy" -> "Kestrel", "Thunder MK2" -> "Thunder"
  const coreWeaponName = weaponName
    .replace(/\s+(Legacy|MK\d+|Pro|Elite|Prime|Standard)\s*$/i, '')
    .trim();

  // Also extract just the first word for shorter weapon names
  // e.g., "Kestrel Legacy" -> "Kestrel"
  const firstWord = coreWeaponName.split(/\s+/)[0];

  const related: NFT[] = [];

  for (const nft of allNfts) {
    // Skip the weapon itself
    if (nft.tokenId === weaponNft.tokenId) continue;

    const itemClass = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';

    // Only include skins and attachments (also check for variations)
    const isSkin = itemClass === 'Weapon Skin' || itemClass.toLowerCase().includes('skin');
    const isAccessory = itemClass === 'Accessory' || itemClass.toLowerCase().includes('attachment') || itemClass.toLowerCase().includes('accessory');

    if (!isSkin && !isAccessory) continue;

    // Check if the item name mentions this weapon
    const nftName = nft.name.toLowerCase();
    const lowerWeaponName = coreWeaponName.toLowerCase();
    const lowerFullName = weaponName.toLowerCase();
    const lowerFirstWord = firstWord.toLowerCase();

    // Check for various patterns that indicate this item is for this weapon
    if (
      nftName.includes(`for the ${lowerWeaponName}`) ||
      nftName.includes(`for the ${lowerFullName}`) ||
      nftName.includes(`for the ${lowerFirstWord}`) ||
      nftName.includes(`for ${lowerWeaponName}`) ||
      nftName.includes(`for ${lowerFirstWord}`) ||
      // Also check if it ends with the weapon name (e.g., "Enhanced Compensator Kestrel")
      nftName.endsWith(lowerWeaponName) ||
      nftName.endsWith(lowerFullName) ||
      nftName.endsWith(lowerFirstWord) ||
      // Check if it contains the weapon name as a word
      nftName.includes(` ${lowerFirstWord} `) ||
      nftName.includes(` ${lowerFirstWord}`)
    ) {
      related.push(nft);
    }
  }

  // Sort by class (skins first, then attachments), then by rarity, then by name
  return related.sort((a, b) => {
    const classA = a.traits?.['CLASS'] || '';
    const classB = b.traits?.['CLASS'] || '';

    // Skins before Accessories
    if (classA === 'Weapon Skin' && classB !== 'Weapon Skin') return -1;
    if (classB === 'Weapon Skin' && classA !== 'Weapon Skin') return 1;

    // Then by rarity
    const rarityA = RARITY_ORDER[a.traits?.['RARITY'] || a.traits?.['Rarity'] || ''] || 99;
    const rarityB = RARITY_ORDER[b.traits?.['RARITY'] || b.traits?.['Rarity'] || ''] || 99;
    if (rarityA !== rarityB) return rarityA - rarityB;

    // Then by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get rarity color for an NFT
 */
function getRarityColorForNft(nft: NFT): { primary: string; border: string } {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  return RARITY_COLORS[rarity] || getDefaultRarityColors();
}

interface ItemData {
  tokenId: string;
  mintNumber: string;
  rarity?: string;
  index: number;
  colors: { primary: string; border: string };
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchaseDate?: Date;
}

interface NFTDetailModalProps {
  nft: NFT | null;
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  /** All NFTs in the wallet - used for finding related items (skins/attachments) */
  allNfts?: NFT[];
}

// Price source tracking - how we determined the purchase price
type PriceSource = 'transfers' | 'localStorage' | 'onchain' | 'none';

// Marketplace matching method
type MarketplaceMatchMethod = 'txHash' | 'timeWindow' | 'none';

// Acquisition type from transfer analysis
type AcquisitionType = 'MINT' | 'TRANSFER' | 'PURCHASE' | 'UNKNOWN';

// Get human-readable label for acquisition venue
// Note: Labels do NOT include "Purchased" prefix - purchase context is implied by the Cost line
function getVenueDisplayLabel(venue: AcquisitionVenue | undefined, hasDecodeCost?: boolean): string {
  switch (venue) {
    case 'decode':
      // In-game hex decode (mint from zero address)
      return 'Decoded (in-game)';
    case 'system_mint':
      // System-initiated mint (mintForUser) - decode fee paid off-chain
      return 'System Reward / Airdrop';
    case 'opensea':
      return 'OpenSea';
    case 'otg_marketplace':
      return 'OTG Marketplace';
    case 'in_game_marketplace':
      return 'In-Game Marketplace';
    case 'decoder':
      // Legacy decoder contract
      return 'Decoded (in-game)';
    case 'mint':
      // Legacy mint venue - kept for backwards compatibility
      return hasDecodeCost ? 'Decoded (in-game)' : 'Minted';
    case 'transfer':
      return 'Transfer';
    case 'unknown':
    default:
      return 'Unknown';
  }
}

// =============================================================================
// RESOLVED ACQUISITION - Deterministic best-available acquisition data
// Prevents downgrades during refresh (e.g., PURCHASE -> TRANSFER fallback)
// =============================================================================

type ResolvedAcquisitionSource = 'holdingAcquisitionRaw' | 'onchain' | 'localStorage' | 'transferDerivation' | 'unknown';

interface ResolvedAcquisition {
  acquisitionType: AcquisitionType | null;
  venue: AcquisitionVenue | null;
  acquiredAt: string | null;  // ISO string
  costGun: number | null;
  costUsd: number | null;
  txHash: string | null;
  fromAddress: string | null;
  source: ResolvedAcquisitionSource;
  qualityScore: number;
  qualityReasons: string[];
}

// Scoring constants for acquisition quality
const ACQUISITION_SCORE = {
  PURCHASE_TYPE: 100,      // acquisitionType === 'PURCHASE'
  HAS_COST_GUN: 90,        // costGun is finite and > 0
  HAS_ACQUIRED_AT: 60,     // acquiredAt exists
  HAS_VENUE: 30,           // venue exists and not 'unknown'
  HAS_FROM_ADDRESS: 20,    // fromAddress exists
  TRANSFER_NO_COST: -80,   // acquisitionType === 'TRANSFER' AND costGun is 0 or null
  NO_ACQUIRED_AT: -50,     // acquiredAt missing
  DECODE_VENUE: 70,        // venue is decode/decoder/mint (in-game acquisition)
} as const;

/**
 * Score an acquisition candidate to determine quality.
 * Higher score = better data quality. PURCHASE always beats TRANSFER.
 */
function scoreAcquisitionCandidate(candidate: Partial<ResolvedAcquisition>): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Positive scoring
  if (candidate.acquisitionType === 'PURCHASE') {
    score += ACQUISITION_SCORE.PURCHASE_TYPE;
    reasons.push(`+${ACQUISITION_SCORE.PURCHASE_TYPE} PURCHASE type`);
  }

  if (candidate.costGun !== null && candidate.costGun !== undefined &&
      Number.isFinite(candidate.costGun) && candidate.costGun > 0) {
    score += ACQUISITION_SCORE.HAS_COST_GUN;
    reasons.push(`+${ACQUISITION_SCORE.HAS_COST_GUN} has costGun (${candidate.costGun})`);
  }

  if (candidate.acquiredAt) {
    score += ACQUISITION_SCORE.HAS_ACQUIRED_AT;
    reasons.push(`+${ACQUISITION_SCORE.HAS_ACQUIRED_AT} has acquiredAt`);
  }

  if (candidate.venue && candidate.venue !== 'unknown') {
    score += ACQUISITION_SCORE.HAS_VENUE;
    reasons.push(`+${ACQUISITION_SCORE.HAS_VENUE} has venue (${candidate.venue})`);

    // Bonus for decode venues (in-game acquisition with cost)
    if (candidate.venue === 'decode' || candidate.venue === 'decoder' || candidate.venue === 'mint' || candidate.venue === 'system_mint') {
      score += ACQUISITION_SCORE.DECODE_VENUE;
      reasons.push(`+${ACQUISITION_SCORE.DECODE_VENUE} decode venue`);
    }
  }

  if (candidate.fromAddress) {
    score += ACQUISITION_SCORE.HAS_FROM_ADDRESS;
    reasons.push(`+${ACQUISITION_SCORE.HAS_FROM_ADDRESS} has fromAddress`);
  }

  // Negative scoring
  if (candidate.acquisitionType === 'TRANSFER' &&
      (candidate.costGun === null || candidate.costGun === undefined || candidate.costGun === 0)) {
    score += ACQUISITION_SCORE.TRANSFER_NO_COST;
    reasons.push(`${ACQUISITION_SCORE.TRANSFER_NO_COST} TRANSFER with no cost`);
  }

  if (!candidate.acquiredAt) {
    score += ACQUISITION_SCORE.NO_ACQUIRED_AT;
    reasons.push(`${ACQUISITION_SCORE.NO_ACQUIRED_AT} missing acquiredAt`);
  }

  return { score, reasons };
}

/**
 * Build a ResolvedAcquisition candidate from holdingAcquisitionRaw (RPC-derived)
 */
function buildCandidateFromHoldingRaw(
  holding: NFTHoldingAcquisition | null,
  gunPriceAtTime?: number
): Partial<ResolvedAcquisition> | null {
  if (!holding || !holding.owned) return null;

  // Map venue to acquisition type
  let acquisitionType: AcquisitionType = 'UNKNOWN';
  if (holding.isMint || holding.venue === 'mint' || holding.venue === 'decode' || holding.venue === 'decoder' || holding.venue === 'system_mint') {
    acquisitionType = 'MINT';
  } else if (holding.venue === 'opensea' || holding.venue === 'otg_marketplace' || holding.venue === 'in_game_marketplace') {
    acquisitionType = 'PURCHASE';
  } else if (holding.venue === 'transfer') {
    acquisitionType = 'TRANSFER';
  }

  const costGun = holding.costGun ?? null;
  const costUsd = costGun !== null && gunPriceAtTime ? costGun * gunPriceAtTime : null;

  return {
    acquisitionType,
    venue: holding.venue ?? null,
    acquiredAt: holding.acquiredAtIso ?? null,
    costGun,
    costUsd,
    txHash: holding.txHash ?? null,
    fromAddress: holding.fromAddress ?? null,
    source: 'holdingAcquisitionRaw',
  };
}

/**
 * Build a ResolvedAcquisition candidate from localStorage cached data
 * Uses fallbacks to maximize data extraction from cache:
 * - acquiredAt: acquiredAt ?? purchaseDate
 * - costGun: purchasePriceGun ?? decodeCostGun
 * - txHash: acquisitionTxHash ?? marketplaceTxHash
 * - acquisitionType: PURCHASE if costGun > 0, TRANSFER if isFreeTransfer, else null
 */
function buildCandidateFromCache(
  cached: {
    purchasePriceGun?: number;
    purchasePriceUsd?: number;
    purchaseDate?: string;
    acquiredAt?: string; // May exist from some sources
    acquisitionVenue?: AcquisitionVenue;
    acquisitionTxHash?: string;
    marketplaceTxHash?: string; // Fallback txHash
    decodeCostGun?: number; // Fallback costGun
    transferredFrom?: string;
    isFreeTransfer?: boolean;
  } | null
): Partial<ResolvedAcquisition> | null {
  if (!cached) return null;

  // Extract values with fallbacks
  const costGun = cached.purchasePriceGun ?? cached.decodeCostGun ?? null;
  const acquiredAt = cached.acquiredAt ?? cached.purchaseDate ?? null;
  const txHash = cached.acquisitionTxHash ?? cached.marketplaceTxHash ?? null;
  const venue = cached.acquisitionVenue ?? null;

  // Only use cache if it has ANY meaningful data
  if (costGun === null && !acquiredAt && !venue && !txHash && !cached.isFreeTransfer) {
    return null;
  }

  // Determine acquisition type from cached data
  // Priority: costGun > 0 means PURCHASE, else isFreeTransfer means TRANSFER, else null
  let acquisitionType: AcquisitionType | null = null;
  if (typeof costGun === 'number' && costGun > 0) {
    // Any nonzero cost indicates a purchase
    acquisitionType = 'PURCHASE';
  } else if (cached.isFreeTransfer === true) {
    acquisitionType = 'TRANSFER';
  } else if (venue === 'decode' || venue === 'decoder' || venue === 'mint' || venue === 'system_mint') {
    acquisitionType = 'MINT';
  }

  return {
    acquisitionType,
    venue,
    acquiredAt,
    costGun,
    costUsd: cached.purchasePriceUsd ?? null,
    txHash,
    fromAddress: cached.transferredFrom ?? null,
    source: 'localStorage',
  };
}

/**
 * Build a ResolvedAcquisition candidate from transfer derivation (fallback)
 */
function buildCandidateFromTransfer(
  acquiredAt?: Date,
  acquisitionType?: AcquisitionType,
  fromAddress?: string,
  txHash?: string
): Partial<ResolvedAcquisition> | null {
  if (!acquiredAt && !fromAddress && !txHash) return null;

  return {
    acquisitionType: acquisitionType ?? 'TRANSFER',
    venue: 'transfer',
    acquiredAt: acquiredAt?.toISOString() ?? null,
    costGun: null,  // Transfer derivation has no cost
    costUsd: null,
    txHash: txHash ?? null,
    fromAddress: fromAddress ?? null,
    source: 'transferDerivation',
  };
}

/**
 * Select the best acquisition from candidates.
 * Returns the highest-scoring candidate that meets minimum quality threshold.
 */
function selectBestAcquisition(
  candidates: (Partial<ResolvedAcquisition> | null)[]
): ResolvedAcquisition {
  let bestCandidate: ResolvedAcquisition | null = null;
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    if (!candidate) continue;

    const { score, reasons } = scoreAcquisitionCandidate(candidate);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = {
        acquisitionType: candidate.acquisitionType ?? null,
        venue: candidate.venue ?? null,
        acquiredAt: candidate.acquiredAt ?? null,
        costGun: candidate.costGun ?? null,
        costUsd: candidate.costUsd ?? null,
        txHash: candidate.txHash ?? null,
        fromAddress: candidate.fromAddress ?? null,
        source: candidate.source ?? 'unknown',
        qualityScore: score,
        qualityReasons: reasons,
      };
    }
  }

  // Return best candidate or empty default
  return bestCandidate ?? {
    acquisitionType: null,
    venue: null,
    acquiredAt: null,
    costGun: null,
    costUsd: null,
    txHash: null,
    fromAddress: null,
    source: 'unknown',
    qualityScore: -100,
    qualityReasons: ['no valid candidates'],
  };
}

/**
 * Merge new acquisition with current, only if quality improves.
 * Prevents downgrades (e.g., PURCHASE with price -> TRANSFER without price)
 */
function mergeAcquisitionIfBetter(
  current: ResolvedAcquisition | null,
  incoming: ResolvedAcquisition
): { result: ResolvedAcquisition; wasUpdated: boolean; reason: string } {
  // If no current, accept incoming
  if (!current) {
    return {
      result: incoming,
      wasUpdated: true,
      reason: 'no existing data'
    };
  }

  // Only update if incoming has better or equal score
  if (incoming.qualityScore >= current.qualityScore) {
    return {
      result: incoming,
      wasUpdated: true,
      reason: `score improved: ${current.qualityScore} -> ${incoming.qualityScore}`
    };
  }

  // Keep current (prevent downgrade)
  return {
    result: current,
    wasUpdated: false,
    reason: `prevented downgrade: ${current.qualityScore} > ${incoming.qualityScore}`
  };
}

// Structured acquisition data - separates transfer-derived vs price-derived fields
interface AcquisitionData {
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

  // Legacy compatibility
  transferredFrom?: string;    // Alias for fromAddress when acquisitionType=TRANSFER
  isFreeTransfer?: boolean;    // True if TRANSFER with no price (not applicable to paid decodes)
}

export default function NFTDetailModal({ nft, isOpen, onClose, walletAddress, allNfts = [] }: NFTDetailModalProps) {
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [itemPurchaseData, setItemPurchaseData] = useState<Record<string, AcquisitionData>>({});
  // Resolved acquisition data per token - deterministic best-available data
  const [resolvedAcquisitions, setResolvedAcquisitions] = useState<Record<string, ResolvedAcquisition>>({});
  // Per-token listings data to prevent cross-token leakage in multi-token NFTs
  const [listingsByTokenId, setListingsByTokenId] = useState<Record<string, {
    lowest?: number;
    highest?: number;
    average?: number;
  } | null>>({});
  const [currentGunPrice, setCurrentGunPrice] = useState<number | null>(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [relatedItemsExpanded, setRelatedItemsExpanded] = useState(false);

  // Debug mode: enabled via ?debugNft=1 URL parameter
  // No-cache mode: enabled via ?noCache=1 - bypasses all cache reads for fresh data
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debugNft') === '1';
  const noCacheMode = searchParams.get('noCache') === '1';
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [debugCopied, setDebugCopied] = useState(false);

  // Ref to track fetch state and prevent duplicate fetches
  const fetchStateRef = useRef<{
    lastFetchedTokenKey: string | null;
    lastFetchTimestamp: number;
    fetchInProgress: boolean;
  }>({
    lastFetchedTokenKey: null,
    lastFetchTimestamp: 0,
    fetchInProgress: false,
  });

  // Staleness threshold for background refresh (10 minutes)
  const STALE_THRESHOLD_MS = 10 * 60 * 1000;

  // Per-token raw holding acquisition results from RPC (prevents cross-token leakage)
  const [holdingAcquisitionRawByTokenId, setHoldingAcquisitionRawByTokenId] = useState<Record<string, NFTHoldingAcquisition | null>>({});

  // ==========================================================================
  // HARDENING: Per-token status and error tracking (removes null ambiguity)
  // ==========================================================================
  const [listingsStatusByTokenId, setListingsStatusByTokenId] = useState<Record<string, FetchStatus>>({});
  const [listingsErrorByTokenId, setListingsErrorByTokenId] = useState<Record<string, string | null>>({});
  const [holdingAcqStatusByTokenId, setHoldingAcqStatusByTokenId] = useState<Record<string, FetchStatus>>({});
  const [holdingAcqErrorByTokenId, setHoldingAcqErrorByTokenId] = useState<Record<string, string | null>>({});

  // ==========================================================================
  // HARDENING: AbortController refs for race-proofing async operations
  // ==========================================================================
  const abortControllersRef = useRef<Record<string, AbortController | undefined>>({});

  // ==========================================================================
  // HARDENING: FIFO key trackers for memory-bounded maps
  // ==========================================================================
  const listingsKeyTrackerRef = useRef(new FIFOKeyTracker(TOKEN_MAP_SOFT_CAP));
  const holdingAcqKeyTrackerRef = useRef(new FIFOKeyTracker(TOKEN_MAP_SOFT_CAP));

  // Async safety: track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Abort all in-flight requests on unmount
      Object.values(abortControllersRef.current).forEach(controller => controller?.abort());
      abortControllersRef.current = {};
    };
  }, []);

  // Debug instrumentation state
  const [debugData, setDebugData] = useState<{
    tokenKey: string;
    cacheKey: string;
    cacheHit: boolean;
    cacheReason: string;
    transferEventCount: number;
    marketplaceMatches: number;
    gunPriceTimestamp: Date | null;
    priceSource: PriceSource;
    // Transfer query debug info (legacy - now uses acquisition debug)
    transferQueryInfo?: {
      fromBlock?: number;
      toBlock?: number;
      chunksQueried?: number;
      totalLogsFound?: number;
      currentOwner?: string | null;
      // New acquisition debug fields
      txTo?: string;
      selector?: string;
      gunIsNative?: boolean;
      matchedRule?: string;
    };
    // Transfer-derived debug fields
    derivedFromTransferTxHash?: string;
    derivedAcquiredAt?: string; // ISO string
    derivedAcquisitionType?: AcquisitionType;
    // Acquisition venue/tx from getNFTHoldingAcquisition
    acquisitionVenue?: string;
    acquisitionTxHash?: string;
    // Marketplace matching debug fields - enhanced
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
    // OpenSea error (if any)
    openSeaError?: string;
    // No-cache mode status
    noCacheEnabled: boolean;
    cacheBypassed: boolean;
    // Background refresh tracking
    cacheRenderedFirst: boolean;
    backgroundRefreshAttempted: boolean;
    backgroundRefreshUpdated: boolean;
    // Enhanced refresh diagnostics
    refreshStartedAtIso: string | null;
    refreshFinishedAtIso: string | null;
    refreshError: string | null;
    refreshResultSummary: string | null;
    refreshExistingScore: number | null;
    refreshNewScore: number | null;
    refreshDecision: 'updated' | 'kept_existing_no_downgrade' | 'error' | 'no_candidates' | null;
  }>({
    tokenKey: '',
    cacheKey: '',
    cacheHit: false,
    cacheReason: '',
    transferEventCount: 0,
    marketplaceMatches: 0,
    gunPriceTimestamp: null,
    priceSource: 'none',
    // Enhanced marketplace debug defaults
    marketplaceConfigured: false,
    serverProxyUsed: true,
    viewerWallet: null,
    currentOwner: null,
    tokenPurchasesCount: 0,
    walletPurchasesCount_viewerWallet: 0,
    walletPurchasesCount_currentOwner: 0,
    marketplaceEndpointBaseUrl: '',
    marketplaceNetwork: '',
    matchWindowMinutes: 10,
    marketplaceCandidatesCount: 0,
    marketplaceMatchMethod: 'none',
    noCacheEnabled: false,
    cacheBypassed: false,
    cacheRenderedFirst: false,
    backgroundRefreshAttempted: false,
    backgroundRefreshUpdated: false,
    // Enhanced refresh diagnostics
    refreshStartedAtIso: null,
    refreshFinishedAtIso: null,
    refreshError: null,
    refreshResultSummary: null,
    refreshExistingScore: null,
    refreshNewScore: null,
    refreshDecision: null,
  });

  // Reset state when modal opens (component remounts via key prop when NFT changes)
  useEffect(() => {
    if (isOpen) {
      // =======================================================================
      // HARDENING: Abort any in-flight requests from previous modal session
      // =======================================================================
      Object.values(abortControllersRef.current).forEach(controller => controller?.abort());
      abortControllersRef.current = {};

      setActiveItemIndex(0);
      setItemPurchaseData({});
      setResolvedAcquisitions({});  // Reset resolved acquisition data
      setListingsByTokenId({});     // Reset per-token listings
      setCurrentGunPrice(null);
      setDetailsExpanded(false);
      setHoldingAcquisitionRawByTokenId({}); // Reset per-token raw acquisition for fresh fetch

      // =======================================================================
      // HARDENING: Reset per-token status/error maps
      // =======================================================================
      setListingsStatusByTokenId({});
      setListingsErrorByTokenId({});
      setHoldingAcqStatusByTokenId({});
      setHoldingAcqErrorByTokenId({});

      // =======================================================================
      // HARDENING: Reset FIFO key trackers
      // =======================================================================
      listingsKeyTrackerRef.current.reset();
      holdingAcqKeyTrackerRef.current.reset();

      // Reset fetch state for new modal session (allows fresh fetch on open)
      fetchStateRef.current = {
        lastFetchedTokenKey: null,
        lastFetchTimestamp: 0,
        fetchInProgress: false,
      };
      // Note: debugExpanded is NOT reset here - user preference persists during session
      setDebugData({
        tokenKey: '',
        cacheKey: '',
        cacheHit: false,
        cacheReason: '',
        transferEventCount: 0,
        marketplaceMatches: 0,
        gunPriceTimestamp: null,
        priceSource: 'none',
        // Enhanced marketplace debug defaults
        marketplaceConfigured: false,
        serverProxyUsed: true,
        viewerWallet: null,
        currentOwner: null,
        tokenPurchasesCount: 0,
        walletPurchasesCount_viewerWallet: 0,
        walletPurchasesCount_currentOwner: 0,
        marketplaceEndpointBaseUrl: '',
        marketplaceNetwork: '',
        matchWindowMinutes: 10,
        marketplaceCandidatesCount: 0,
        marketplaceMatchMethod: 'none',
        noCacheEnabled: noCacheMode,
        cacheBypassed: false,
        cacheRenderedFirst: false,
        backgroundRefreshAttempted: false,
        backgroundRefreshUpdated: false,
        // Enhanced refresh diagnostics
        refreshStartedAtIso: null,
        refreshFinishedAtIso: null,
        refreshError: null,
        refreshResultSummary: null,
        refreshExistingScore: null,
        refreshNewScore: null,
        refreshDecision: null,
      });

      // Fetch current GUN price
      const fetchGunPrice = async () => {
        try {
          const coinGeckoService = new CoinGeckoService();
          const priceData = await coinGeckoService.getGunTokenPrice();
          if (priceData?.gunTokenPrice) {
            setCurrentGunPrice(priceData.gunTokenPrice);
            const timestamp = priceData.timestamp;
            setDebugData(prev => ({ ...prev, gunPriceTimestamp: timestamp }));
            if (debugMode) {
              console.debug('[NFTDetailModal] GUN/USD rate fetched:', {
                rate: priceData.gunTokenPrice,
                timestamp: timestamp,
                source: priceData.source,
              });
            }
          }
        } catch (error) {
          console.error('Error fetching GUN price:', error);
        }
      };
      fetchGunPrice();
    }
  }, [isOpen, debugMode, noCacheMode]);

  // Build sorted list of items (by rarity desc, then mint number asc)
  const sortedItems: ItemData[] = useMemo(() => {
    if (!nft) {
      return [];
    }

    const getRarity = () => nft.traits?.['RARITY'] || nft.traits?.['Rarity'];
    const rarity = getRarity();
    const colors = RARITY_COLORS[rarity || ''] || getDefaultRarityColors();

    if (!nft.tokenIds || nft.tokenIds.length <= 1) {
      return [{
        tokenId: nft.tokenId,
        mintNumber: nft.mintNumber || nft.tokenId,
        rarity,
        index: 0,
        colors,
      }];
    }

    // Create items array with their data
    const items: ItemData[] = nft.tokenIds.map((tokenId, index) => ({
      tokenId,
      mintNumber: nft.mintNumbers?.[index] || tokenId,
      rarity,
      index,
      colors,
    }));

    // Sort by rarity (highest first), then by mint number (lowest first)
    return items.sort((a, b) => {
      const rarityA = RARITY_ORDER[a.rarity || ''] || 999;
      const rarityB = RARITY_ORDER[b.rarity || ''] || 999;
      if (rarityA !== rarityB) {
        return rarityA - rarityB;
      }
      const mintA = parseInt(a.mintNumber) || 0;
      const mintB = parseInt(b.mintNumber) || 0;
      return mintA - mintB;
    });
  }, [nft]);

  // Get currently active item
  const activeItem = sortedItems[activeItemIndex] || sortedItems[0];

  // Derive current token's listings and acquisition data from per-token maps
  // This prevents cross-token leakage when switching between items in multi-token NFTs
  const listingsData = activeItem ? listingsByTokenId[activeItem.tokenId] ?? null : null;
  const holdingAcquisitionRaw = activeItem ? holdingAcquisitionRawByTokenId[activeItem.tokenId] ?? null : null;

  // Load purchase data for the active item
  useEffect(() => {
    if (!isOpen || !nft || !walletAddress || !activeItem) {
      return;
    }

    const tokenId = activeItem.tokenId;
    // NFT_COLLECTION_AVALANCHE is server-side only; hardcoded fallback for production
    const nftContractAddress = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';

    // Build token key and cache key using new versioned cache system
    const tokenKey = buildTokenKey(nft.chain, nftContractAddress, tokenId);
    const fullCacheKey = buildNftDetailCacheKey(walletAddress, tokenKey);

    // Update debug keys
    setDebugData(prev => ({
      ...prev,
      tokenKey,
      cacheKey: fullCacheKey,
    }));

    // =========================================================================
    // STALE-WHILE-REVALIDATE: Prevent duplicate/frequent fetches
    // - Skip if fetch already in progress for this token
    // - Skip background refresh if last fetch was within STALE_THRESHOLD_MS
    // - Always allow fetch for NEW tokens (different tokenKey)
    // =========================================================================
    const now = Date.now();
    const isSameToken = fetchStateRef.current.lastFetchedTokenKey === tokenKey;
    const timeSinceLastFetch = now - fetchStateRef.current.lastFetchTimestamp;
    const isStale = timeSinceLastFetch > STALE_THRESHOLD_MS;
    const fetchInProgress = fetchStateRef.current.fetchInProgress && isSameToken;

    // Skip if fetch in progress for same token (prevent race conditions)
    if (fetchInProgress) {
      if (debugMode) {
        console.debug('[NFTDetailModal] Skipping fetch - already in progress for token:', tokenKey);
      }
      return;
    }

    // For same token: only refresh if stale (unless noCache mode forces refresh)
    if (isSameToken && !isStale && !noCacheMode && itemPurchaseData[tokenId]) {
      if (debugMode) {
        console.debug('[NFTDetailModal] Skipping background refresh - data is fresh:', {
          tokenKey,
          timeSinceLastFetchMs: timeSinceLastFetch,
          staleThresholdMs: STALE_THRESHOLD_MS,
        });
      }
      // Update debug to show we're using cached data without refresh
      setDebugData(prev => ({
        ...prev,
        cacheHit: true,
        cacheReason: 'fresh_data',
        priceSource: itemPurchaseData[tokenId].priceSource,
        cacheRenderedFirst: true,
        backgroundRefreshAttempted: false,
      }));
      return;
    }

    // In noCache mode, log that we're bypassing caches
    if (noCacheMode && debugMode) {
      console.debug('[NFTDetailModal] noCache mode enabled - bypassing all cache reads');
    }

    // NOTE: We intentionally skip NFT prop data - it's unreliable and may contain stale values.
    // Always verify against actual transfer history or localStorage cache.

    // Check localStorage cache using new versioned cache system
    // In noCache mode, skip localStorage entirely
    const cacheResult = noCacheMode
      ? { hit: false, cacheKey: fullCacheKey, reason: 'noCache_mode' as const }
      : getCachedNFTDetail(walletAddress, tokenKey);

    // Track whether we rendered from cache first (for background refresh)
    let cacheRenderedFirst = false;

    // Check component state first (fast path for tab switching)
    // In noCache mode, skip component state to force fresh fetch
    // BUT: Even with cache hit, we run ONE background refresh if data is stale
    if (itemPurchaseData[tokenId] && !noCacheMode) {
      if (debugMode) {
        console.debug('[NFTDetailModal] Component state exists for token (will background refresh if stale):', {
          tokenId,
          tokenKey,
          priceSource: itemPurchaseData[tokenId].priceSource,
          isStale,
        });
      }
      // Mark that we have cached data rendered
      cacheRenderedFirst = true;
      setDebugData(prev => ({
        ...prev,
        cacheHit: true,
        cacheReason: 'component_state',
        priceSource: itemPurchaseData[tokenId].priceSource,
        cacheRenderedFirst: true,
      }));
      // NOTE: We do NOT return early - we continue to background refresh
    } else if (cacheResult.hit && 'value' in cacheResult && cacheResult.value && !noCacheMode) {
      // Determine acquisition source from cached data
      const cachedValue = cacheResult.value;
      const hasTransferData = cachedValue.purchasePriceGun !== undefined ||
        cachedValue.purchaseDate !== undefined ||
        cachedValue.isFreeTransfer === true;
      const cachedPriceSource: PriceSource = hasTransferData ? 'localStorage' : 'none';

      if (debugMode) {
        console.debug('[NFTDetailModal] localStorage cache HIT (will background refresh):', {
          tokenId,
          tokenKey,
          cacheKey: cacheResult.cacheKey,
          value: cachedValue,
          priceSource: cachedPriceSource,
        });
      }

      // Restore data from cache IMMEDIATELY for fast UI
      const cachedData = cachedValue;
      const restoredAcquisition: AcquisitionData = {
        priceSource: cachedPriceSource,
        acquisitionVenue: cachedData.acquisitionVenue,

        // We don't have transfer-derived fields in cache, they'd need re-fetch
        acquiredAt: undefined,
        fromAddress: undefined,
        acquisitionType: undefined,
        acquisitionTxHash: cachedData.acquisitionTxHash,

        // Price fields from cache
        purchasePriceGun: cachedData.purchasePriceGun,
        purchasePriceUsd: cachedData.purchasePriceUsd,
        purchaseDate: cachedData.purchaseDate ? new Date(cachedData.purchaseDate) : undefined,
        marketplaceTxHash: cachedData.acquisitionTxHash,

        // Legacy
        transferredFrom: cachedData.transferredFrom,
        isFreeTransfer: cachedData.isFreeTransfer,
      };

      setItemPurchaseData(prev => ({
        ...prev,
        [tokenId]: restoredAcquisition,
      }));

      // CRITICAL: Build resolvedAcquisition from cache immediately so UI doesn't show null
      // This ensures the modal shows correct acquisition data before background refresh completes
      const candidateFromCacheImmediate = buildCandidateFromCache(cachedData);
      if (candidateFromCacheImmediate) {
        const resolvedFromCache = selectBestAcquisition([candidateFromCacheImmediate]);
        setResolvedAcquisitions(prev => ({
          ...prev,
          [tokenId]: resolvedFromCache,
        }));
        if (debugMode) {
          console.debug('[NFTDetailModal] Resolved acquisition from cache (immediate):', {
            tokenId,
            score: resolvedFromCache.qualityScore,
            source: resolvedFromCache.source,
            acquisitionType: resolvedFromCache.acquisitionType,
            costGun: resolvedFromCache.costGun,
          });
        }
      }

      cacheRenderedFirst = true;
      setDebugData(prev => ({
        ...prev,
        cacheHit: true,
        cacheReason: 'localStorage',
        priceSource: cachedPriceSource,
        cacheRenderedFirst: true,
      }));
      // NOTE: We do NOT return early - we continue to background refresh
    } else {
      // Cache miss (or noCache mode) - need to fetch fresh data
      if (debugMode) {
        console.debug('[NFTDetailModal] localStorage cache MISS:', {
          tokenId,
          tokenKey,
          cacheKey: cacheResult.cacheKey,
          reason: cacheResult.reason,
          noCacheMode,
        });
      }

      // Update debug data to reflect cache bypass in noCache mode
      if (noCacheMode) {
        setDebugData(prev => ({
          ...prev,
          cacheBypassed: true,
          cacheReason: 'noCache_mode',
        }));
      }
    }

    // =========================================================================
    // STALE-WHILE-REVALIDATE: Run ONE background refresh per modal open
    // - Only refreshes if data is stale (older than STALE_THRESHOLD_MS)
    // - Prevents duplicate fetches via fetchStateRef
    // =========================================================================
    const loadItemDetails = async (isBackgroundRefresh: boolean) => {
      // =====================================================================
      // HARDENING: AbortController setup for race-proofing
      // Abort any previous request for this token before starting a new one
      // =====================================================================
      const abortKey = `fetch:${tokenId}`;
      abortControllersRef.current[abortKey]?.abort();
      const abortController = new AbortController();
      abortControllersRef.current[abortKey] = abortController;

      // Mark fetch as in progress for this token
      fetchStateRef.current.fetchInProgress = true;
      fetchStateRef.current.lastFetchedTokenKey = tokenKey;

      // =====================================================================
      // HARDENING: Set per-token status to 'loading', clear previous errors
      // =====================================================================
      setHoldingAcqStatusByTokenId(prev => ({ ...prev, [tokenId]: 'loading' }));
      setHoldingAcqErrorByTokenId(prev => ({ ...prev, [tokenId]: null }));
      setListingsStatusByTokenId(prev => ({ ...prev, [tokenId]: 'loading' }));
      setListingsErrorByTokenId(prev => ({ ...prev, [tokenId]: null }));

      // Only show loading spinner if this is NOT a background refresh
      if (!isBackgroundRefresh) {
        setLoadingDetails(true);
      }

      // Mark background refresh as attempted and record start time
      if (isBackgroundRefresh) {
        setDebugData(prev => ({
          ...prev,
          backgroundRefreshAttempted: true,
          refreshStartedAtIso: new Date().toISOString(),
          refreshFinishedAtIso: null,
          refreshError: null,
          refreshResultSummary: null,
          refreshDecision: null,
        }));
      } else {
        setDebugData(prev => ({
          ...prev,
          cacheHit: false,
          cacheReason: cacheResult.reason || 'fetching',
        }));
      }

      if (debugMode) {
        console.debug('[NFTDetailModal] Fetching fresh data for token:', {
          tokenId,
          tokenKey,
        });
      }

      try {
        const avalancheService = new AvalancheService();
        const openSeaService = new OpenSeaService();
        const coinGeckoService = new CoinGeckoService();

        if (!nftContractAddress) {
          return;
        }

        // =====================================================================
        // STEP 1: Load acquisition details (blockchain-derived data)
        // Always fetch fresh from RPC - this is critical for debug panel accuracy
        // =====================================================================
        const acquisition = await avalancheService.getNFTHoldingAcquisition(nftContractAddress, tokenId, walletAddress);

        // HARDENING: Check for abort signal first (silent exit on abort)
        if (abortController.signal.aborted) {
          if (debugMode) {
            console.debug('[NFTDetailModal] Fetch aborted for token:', tokenId);
          }
          return;
        }

        // Async safety: check if still mounted and token hasn't changed
        if (!isMountedRef.current || activeItem?.tokenId !== tokenId) {
          if (debugMode) {
            console.debug('[NFTDetailModal] Aborting state update - unmounted or token changed:', {
              isMounted: isMountedRef.current,
              startedTokenId: tokenId,
              currentTokenId: activeItem?.tokenId,
            });
          }
          return;
        }

        // HARDENING: FIFO eviction for holdingAcquisitionRaw map
        const holdingKeysToEvict = holdingAcqKeyTrackerRef.current.track(tokenId);
        if (holdingKeysToEvict.length > 0 && debugMode) {
          console.debug('[NFTDetailModal] FIFO evicting holding acquisition keys:', holdingKeysToEvict);
        }

        // Store raw acquisition result for debug panel (per-token, prevents cross-token leakage)
        setHoldingAcquisitionRawByTokenId(prev => {
          const next = { ...prev, [tokenId]: acquisition };
          // Remove evicted keys
          holdingKeysToEvict.forEach(key => delete next[key]);
          return next;
        });

        // HARDENING: Update acquisition status to success
        setHoldingAcqStatusByTokenId(prev => ({ ...prev, [tokenId]: 'success' }));

        if (debugMode) {
          console.debug('[NFTDetailModal] Acquisition result:', {
            tokenId,
            acquisition,
          });
        }

        // Extract acquisition-derived fields
        const hasAcquisitionData = acquisition !== null && acquisition.owned;
        const acquiredAt = acquisition?.acquiredAtIso ? new Date(acquisition.acquiredAtIso) : undefined;
        const fromAddress = acquisition?.fromAddress;
        const acquisitionVenue = acquisition?.venue;
        const acquisitionTxHash = acquisition?.txHash;
        const costGunFromChain = acquisition?.costGun ?? 0;

        // Track if acquisition fetch returned null (timeout or error)
        if (isBackgroundRefresh && acquisition === null) {
          setDebugData(prev => ({
            ...prev,
            refreshError: 'acquisition_null_or_timeout',
            refreshResultSummary: 'acquisition fetch returned null (timeout or no data) - keeping existing',
          }));
        }

        // Backward compatibility aliases
        const hasTransferData = hasAcquisitionData;
        const totalLogsFound = hasAcquisitionData ? 1 : 0;
        // For currentOwner lookup in marketplace matching (will be determined from acquisition)
        const currentOwnerFromAcquisition = acquisition?.owned ? walletAddress : null;

        // Map venue to acquisition type for backward compatibility
        let acquisitionType: AcquisitionType;
        if (acquisition?.isMint || acquisitionVenue === 'mint') {
          acquisitionType = 'MINT';
        } else if (hasAcquisitionData) {
          acquisitionType = 'TRANSFER';
        } else {
          acquisitionType = 'UNKNOWN';
        }

        // Update debug transfer event count and query info
        setDebugData(prev => ({
          ...prev,
          transferEventCount: totalLogsFound,
          derivedAcquiredAt: acquiredAt?.toISOString(),
          derivedAcquisitionType: acquisitionType,
          acquisitionVenue,
          acquisitionTxHash: acquisitionTxHash ?? undefined,
        }));

        // =====================================================================
        // STEP 2: Load marketplace listings (price data source)
        // =====================================================================
        let marketplaceMatchCount = 0;

        if (!listingsData) {
          try {
            const listings = await openSeaService.getNFTListings(nftContractAddress, tokenId, 'avalanche');

            // HARDENING: Check for abort signal (silent exit on abort)
            if (abortController.signal.aborted) {
              if (debugMode) {
                console.debug('[NFTDetailModal] Listings fetch aborted for token:', tokenId);
              }
              return;
            }

            const lowest = listings.lowest ?? undefined;
            const highest = listings.highest ?? undefined;
            const average = lowest !== undefined && highest !== undefined
              ? (lowest + highest) / 2
              : lowest ?? highest;

            marketplaceMatchCount = (lowest !== undefined ? 1 : 0) + (highest !== undefined ? 1 : 0);

            if (debugMode) {
              console.debug('[NFTDetailModal] Marketplace listings:', {
                tokenId,
                lowest,
                highest,
                average,
                matchCount: marketplaceMatchCount,
                error: listings.error,
              });
            }

            // HARDENING: Check abort signal before state updates
            if (abortController.signal.aborted) {
              return;
            }

            // Async safety: check if still mounted and token hasn't changed
            if (!isMountedRef.current || activeItem?.tokenId !== tokenId) {
              return;
            }

            // Update debug marketplace matches and any error
            setDebugData(prev => ({
              ...prev,
              marketplaceMatches: marketplaceMatchCount,
              openSeaError: listings.error,
            }));

            // HARDENING: FIFO eviction for listings map
            const listingsKeysToEvict = listingsKeyTrackerRef.current.track(tokenId);
            if (listingsKeysToEvict.length > 0 && debugMode) {
              console.debug('[NFTDetailModal] FIFO evicting listings keys:', listingsKeysToEvict);
            }

            // Per-token listings data (prevents cross-token leakage)
            setListingsByTokenId(prev => {
              const next = { ...prev, [tokenId]: { lowest, highest, average } };
              // Remove evicted keys
              listingsKeysToEvict.forEach(key => delete next[key]);
              return next;
            });

            // HARDENING: Update listings status to success
            setListingsStatusByTokenId(prev => ({ ...prev, [tokenId]: 'success' }));
          } catch (openSeaError) {
            // HARDENING: Silent exit on AbortError
            if (isAbortError(openSeaError)) {
              if (debugMode) {
                console.debug('[NFTDetailModal] Listings fetch aborted (AbortError) for token:', tokenId);
              }
              return;
            }

            // HARDENING: Check abort signal in catch block
            if (abortController.signal.aborted) {
              return;
            }

            // OpenSea failure is non-blocking
            const errorMsg = openSeaError instanceof Error ? openSeaError.message : 'Unknown error';
            console.warn('[NFTDetailModal] OpenSea fetch failed (non-blocking):', errorMsg);

            // Async safety: check if still mounted and token hasn't changed
            if (!isMountedRef.current || activeItem?.tokenId !== tokenId) {
              return;
            }

            setDebugData(prev => ({
              ...prev,
              marketplaceMatches: 0,
              openSeaError: errorMsg,
            }));

            // HARDENING: Update listings status to error and record error message
            setListingsStatusByTokenId(prev => ({ ...prev, [tokenId]: 'error' }));
            setListingsErrorByTokenId(prev => ({ ...prev, [tokenId]: errorMsg }));

            // Per-token listings data (empty on error)
            setListingsByTokenId(prev => ({
              ...prev,
              [tokenId]: { lowest: undefined, highest: undefined, average: undefined },
            }));
          }
        } else {
          // HARDENING: Already have listings data, mark as success (only if not aborted)
          if (!abortController.signal.aborted && isMountedRef.current && activeItem?.tokenId === tokenId) {
            setListingsStatusByTokenId(prev => ({ ...prev, [tokenId]: 'success' }));
          }
        }

        // =====================================================================
        // STEP 3: Marketplace purchase matching (DUAL RETRIEVAL STRATEGY)
        // Populate purchasePriceGun/purchaseDate ONLY when a marketplace match exists
        // =====================================================================

        let purchasePriceGun: number | undefined = undefined;
        let purchasePriceUsd: number | undefined = undefined;
        let purchaseDate: Date | undefined = undefined;
        let marketplaceTxHash: string | undefined = undefined;
        let marketplaceOrderId: string | undefined = undefined;
        let marketplacePurchaseId: string | undefined = undefined;
        let marketplaceMatchedTimestamp: string | undefined = undefined;
        let marketplaceMatchMethod: MarketplaceMatchMethod = 'none';
        let marketplaceCandidatesCount = 0;
        let marketplaceCandidateTimes: { min: string; max: string } | undefined = undefined;

        // Enhanced debug tracking
        let tokenPurchasesCount = 0;
        let walletPurchasesCount_viewerWallet = 0;
        let walletPurchasesCount_currentOwner = 0;
        let walletPurchasesTimeRange_viewerWallet: { min: string; max: string } | undefined = undefined;
        let walletPurchasesTimeRange_currentOwner: { min: string; max: string } | undefined = undefined;

        // Identity setup (use null when not available, never empty string)
        const viewerWalletLower = walletAddress?.toLowerCase() ?? null;
        const currentOwnerLower = currentOwnerFromAcquisition?.toLowerCase() ?? null;
        const TIME_WINDOW_MS = 10 * 60 * 1000; // 10 minutes (widened from 5)
        const MATCH_WINDOW_MINUTES = 10;

        // Only attempt marketplace matching if we have transfer data (acquisition timestamp)
        if (hasTransferData && acquiredAt) {
          try {
            const marketplaceService = new GameMarketplaceService();
            const endpointInfo = marketplaceService.getEndpointInfo();

            // Update endpoint info in debug
            setDebugData(prev => ({
              ...prev,
              viewerWallet: viewerWalletLower,
              currentOwner: currentOwnerLower,
              marketplaceEndpointBaseUrl: endpointInfo.baseUrl,
              marketplaceNetwork: endpointInfo.network,
              matchWindowMinutes: MATCH_WINDOW_MINUTES,
              marketplaceConfigured: endpointInfo.isConfigured,
              serverProxyUsed: endpointInfo.serverProxyUsed,
            }));

            // Check if marketplace is configured before making API calls
            if (!endpointInfo.isConfigured) {
              // Run testConnection for debug info (helps diagnose configuration issues)
              const testResult = await marketplaceService.testConnection();
              setDebugData(prev => ({
                ...prev,
                marketplaceTestConnection: testResult,
              }));

              if (debugMode) {
                console.debug('[NFTDetailModal] Marketplace not configured:', {
                  endpointInfo,
                  testResult,
                });
              }

              // Skip all marketplace retrieval - we'll show "Marketplace data unavailable" in UI
            } else {
              // =========================================================
              // DUAL RETRIEVAL STRATEGY
              // 1. Fetch by token
              // 2. Fetch by wallet (for both viewerWallet AND currentOwner)
              // 3. Merge and dedupe all results
              // =========================================================

              // Strategy A: Fetch purchases for this specific token
              const tokenPurchases = await marketplaceService.getPurchasesForToken(tokenKey);
            tokenPurchasesCount = tokenPurchases.length;

            if (debugMode) {
              console.debug('[NFTDetailModal] Token purchases:', {
                tokenKey,
                count: tokenPurchasesCount,
                purchases: tokenPurchases,
              });
            }

            // Strategy B: Fetch purchases for viewerWallet (user's wallet)
            let viewerWalletPurchases: MarketplacePurchase[] = [];
            if (viewerWalletLower) {
              viewerWalletPurchases = await marketplaceService.getPurchasesForWallet(viewerWalletLower, {
                // Wider time range to catch the purchase
                fromDate: new Date(acquiredAt.getTime() - 24 * 60 * 60 * 1000), // 24h before
                toDate: new Date(acquiredAt.getTime() + 24 * 60 * 60 * 1000),   // 24h after
                limit: 100,
              });
              walletPurchasesCount_viewerWallet = viewerWalletPurchases.length;

              if (viewerWalletPurchases.length > 0) {
                const sorted = [...viewerWalletPurchases].sort(
                  (a, b) => new Date(a.purchaseDateIso).getTime() - new Date(b.purchaseDateIso).getTime()
                );
                walletPurchasesTimeRange_viewerWallet = {
                  min: sorted[0].purchaseDateIso,
                  max: sorted[sorted.length - 1].purchaseDateIso,
                };
              }

              if (debugMode) {
                console.debug('[NFTDetailModal] Viewer wallet purchases:', {
                  viewerWallet: viewerWalletLower,
                  count: walletPurchasesCount_viewerWallet,
                  timeRange: walletPurchasesTimeRange_viewerWallet,
                });
              }
            }

            // Strategy C: Fetch purchases for currentOwner (if different from viewerWallet)
            // Important for custodial wallets where currentOwner != viewerWallet
            let currentOwnerPurchases: MarketplacePurchase[] = [];
            if (currentOwnerLower && currentOwnerLower !== viewerWalletLower) {
              currentOwnerPurchases = await marketplaceService.getPurchasesForWallet(currentOwnerLower, {
                fromDate: new Date(acquiredAt.getTime() - 24 * 60 * 60 * 1000),
                toDate: new Date(acquiredAt.getTime() + 24 * 60 * 60 * 1000),
                limit: 100,
              });
              walletPurchasesCount_currentOwner = currentOwnerPurchases.length;

              if (currentOwnerPurchases.length > 0) {
                const sorted = [...currentOwnerPurchases].sort(
                  (a, b) => new Date(a.purchaseDateIso).getTime() - new Date(b.purchaseDateIso).getTime()
                );
                walletPurchasesTimeRange_currentOwner = {
                  min: sorted[0].purchaseDateIso,
                  max: sorted[sorted.length - 1].purchaseDateIso,
                };
              }

              if (debugMode) {
                console.debug('[NFTDetailModal] Current owner purchases:', {
                  currentOwner: currentOwnerLower,
                  count: walletPurchasesCount_currentOwner,
                  timeRange: walletPurchasesTimeRange_currentOwner,
                });
              }
            }

            // =========================================================
            // MERGE AND DEDUPE all purchases
            // Filter wallet purchases to only those matching this tokenKey
            // =========================================================
            const viewerWalletMatchingToken = viewerWalletPurchases.filter(
              p => p.tokenKey.toLowerCase() === tokenKey.toLowerCase()
            );
            const currentOwnerMatchingToken = currentOwnerPurchases.filter(
              p => p.tokenKey.toLowerCase() === tokenKey.toLowerCase()
            );

            // Combine all sources
            const allPurchases: MarketplacePurchase[] = [
              ...tokenPurchases,
              ...viewerWalletMatchingToken,
              ...currentOwnerMatchingToken,
            ];

            // Dedupe by purchaseId, txHash, or (tokenKey + timestamp)
            const seen = new Set<string>();
            const dedupedPurchases = allPurchases.filter(p => {
              // Create unique keys for deduplication
              const keys = [
                p.purchaseId,
                p.txHash,
                p.orderId,
                `${p.tokenKey}:${new Date(p.purchaseDateIso).getTime()}:${p.priceGun}`,
              ].filter(Boolean);

              for (const key of keys) {
                if (key && seen.has(key)) {
                  return false;
                }
              }

              // Add all keys to seen set
              keys.forEach(key => key && seen.add(key));
              return true;
            });

            marketplaceCandidatesCount = dedupedPurchases.length;

            if (debugMode) {
              console.debug('[NFTDetailModal] Merged marketplace candidates:', {
                tokenKey,
                tokenPurchasesCount,
                viewerWalletMatchingTokenCount: viewerWalletMatchingToken.length,
                currentOwnerMatchingTokenCount: currentOwnerMatchingToken.length,
                totalBeforeDedupe: allPurchases.length,
                afterDedupe: dedupedPurchases.length,
                acquiredAt: acquiredAt.toISOString(),
              });
            }

            if (dedupedPurchases.length > 0) {
              // Calculate candidate time range for debug
              const sortedByDate = [...dedupedPurchases].sort(
                (a, b) => new Date(a.purchaseDateIso).getTime() - new Date(b.purchaseDateIso).getTime()
              );
              marketplaceCandidateTimes = {
                min: sortedByDate[0].purchaseDateIso,
                max: sortedByDate[sortedByDate.length - 1].purchaseDateIso,
              };
            }

            // =========================================================
            // MATCHING ALGORITHM
            // Priority 1: Exact txHash match
            // Priority 2: Closest timestamp within ±10 minutes + identity tiebreaker
            // =========================================================
            let matchedPurchase: MarketplacePurchase | null = null;

            // Priority 1: Exact txHash match (if we have acquisition txHash)
            // Note: We'd need to pass txHash from transfer events for this
            // For now, this is a placeholder for future enhancement

            // Priority 2: Time-window matching with identity tiebreaker
            if (!matchedPurchase && dedupedPurchases.length > 0) {
              // Filter to purchases within ±10 minutes of acquisition
              const candidatesInWindow = dedupedPurchases.filter(p => {
                const timeDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                return timeDiff <= TIME_WINDOW_MS;
              });

              if (debugMode) {
                console.debug('[NFTDetailModal] Candidates in time window:', {
                  windowMinutes: MATCH_WINDOW_MINUTES,
                  acquiredAt: acquiredAt.toISOString(),
                  candidatesInWindow: candidatesInWindow.length,
                  candidates: candidatesInWindow.map(c => ({
                    purchaseId: c.purchaseId,
                    purchaseDate: c.purchaseDateIso,
                    timeDiffMs: Math.abs(new Date(c.purchaseDateIso).getTime() - acquiredAt.getTime()),
                    buyer: c.buyerAddress,
                    priceGun: c.priceGun,
                  })),
                });
              }

              if (candidatesInWindow.length === 1) {
                // Single candidate - use it
                matchedPurchase = candidatesInWindow[0];
                marketplaceMatchMethod = 'timeWindow';
              } else if (candidatesInWindow.length > 1) {
                // Multiple candidates - prefer where buyer matches viewerWallet or currentOwner
                const identityMatches = candidatesInWindow.filter(p => {
                  const buyerLower = p.buyerAddress.toLowerCase();
                  return buyerLower === viewerWalletLower || buyerLower === currentOwnerLower;
                });

                if (identityMatches.length >= 1) {
                  // Take closest to acquisition time among identity matches
                  matchedPurchase = identityMatches.reduce((closest, p) => {
                    const closestDiff = Math.abs(new Date(closest.purchaseDateIso).getTime() - acquiredAt.getTime());
                    const pDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                    return pDiff < closestDiff ? p : closest;
                  });
                  marketplaceMatchMethod = 'timeWindow';
                } else {
                  // No identity match - take closest by time
                  matchedPurchase = candidatesInWindow.reduce((closest, p) => {
                    const closestDiff = Math.abs(new Date(closest.purchaseDateIso).getTime() - acquiredAt.getTime());
                    const pDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                    return pDiff < closestDiff ? p : closest;
                  });
                  marketplaceMatchMethod = 'timeWindow';
                }
              }
            }

            // If matched, populate price fields
            if (matchedPurchase) {
              purchasePriceGun = matchedPurchase.priceGun;
              purchaseDate = matchedPurchase.purchaseDateIso ? new Date(matchedPurchase.purchaseDateIso) : acquiredAt; // Prefer marketplace timestamp, fallback to blockchain
              marketplaceTxHash = matchedPurchase.txHash;
              marketplaceOrderId = matchedPurchase.orderId || matchedPurchase.purchaseId;
              marketplacePurchaseId = matchedPurchase.purchaseId;
              marketplaceMatchedTimestamp = matchedPurchase.purchaseDateIso;

              // Calculate USD value from historical GUN price
              if (purchasePriceGun && purchaseDate) {
                try {
                  const historicalPrice = await coinGeckoService.getHistoricalGunPrice(purchaseDate);
                  if (historicalPrice) {
                    purchasePriceUsd = purchasePriceGun * historicalPrice;
                  }
                } catch (priceError) {
                  console.warn('[NFTDetailModal] Failed to get historical GUN price:', priceError);
                }
              }

              if (debugMode) {
                console.debug('[NFTDetailModal] Marketplace match found:', {
                  tokenKey,
                  matchMethod: marketplaceMatchMethod,
                  matchedPurchase,
                  purchasePriceGun,
                  purchasePriceUsd,
                });
              }
            }
            } // end else (marketplace configured)
          } catch (marketplaceError) {
            console.warn('[NFTDetailModal] Marketplace matching failed (non-blocking):', marketplaceError);
          }
        }

        // Update debug data with marketplace matching results
        setDebugData(prev => ({
          ...prev,
          tokenPurchasesCount,
          walletPurchasesCount_viewerWallet,
          walletPurchasesCount_currentOwner,
          walletPurchasesTimeRange_viewerWallet,
          walletPurchasesTimeRange_currentOwner,
          marketplaceCandidatesCount,
          marketplaceCandidateTimes,
          marketplaceMatchMethod,
          marketplaceMatchedTxHash: marketplaceTxHash,
          marketplaceMatchedOrderId: marketplaceOrderId,
          marketplaceMatchedPurchaseId: marketplacePurchaseId,
          marketplaceMatchedTimestamp,
        }));

        // =====================================================================
        // STEP 4: Determine acquisition source and build final data
        // Explicitly venue-driven mapping from holding acquisition (RPC)
        // =====================================================================

        // Legacy marketplace service match (for backwards compatibility)
        const hasMarketplaceServiceMatch = purchasePriceGun !== undefined;

        // Determine price source and acquisition type based on venue
        let derivedPriceSource: PriceSource;
        let finalPurchasePriceGun: number | undefined;
        let finalPurchasePriceUsd: number | undefined;
        let finalDecodeCostGun: number | undefined;
        let finalDecodeCostUsd: number | undefined;
        let finalPurchaseDate: Date | undefined;
        let finalMarketplaceTxHash: string | undefined;
        let finalIsFreeTransfer: boolean;
        let finalAcquisitionType: AcquisitionType;

        // =====================================================================
        // VENUE-DRIVEN MAPPING
        // A) mint/decoder -> MINT type, decodeCostGun, no purchasePriceGun
        // B) opensea -> PURCHASE type, purchasePriceGun, marketplaceTxHash
        // C) in_game_marketplace -> PURCHASE type, purchasePriceGun, marketplaceTxHash
        // D) otg_marketplace -> PURCHASE type, purchasePriceGun, marketplaceTxHash
        // E) transfer -> TRANSFER type, no cost fields
        // F) unknown/fallback -> use legacy logic or defaults
        // =====================================================================

        if (acquisitionVenue === 'decode' || acquisitionVenue === 'mint' || acquisitionVenue === 'decoder' || acquisitionVenue === 'system_mint') {
          // A) DECODE/MINT: In-game hex decode (mint from zero address) - use decode cost fields, not purchase price
          // 'decode' = new venue for in-game hex decodes
          // 'mint' = legacy venue (kept for backwards compatibility)
          // 'decoder' = legacy decoder contract
          // 'system_mint' = system-initiated mint (mintForUser) - decode fee paid off-chain
          derivedPriceSource = costGunFromChain > 0 ? 'onchain' : 'transfers';
          finalAcquisitionType = 'MINT';
          // Decode cost (NOT purchase price)
          finalDecodeCostGun = costGunFromChain > 0 ? costGunFromChain : undefined;
          // Purchase price is explicitly null for decodes - never show purchasePriceGun
          finalPurchasePriceGun = undefined;
          finalPurchasePriceUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // Decodes have NO marketplace tx hash - only acquisitionTxHash
          finalMarketplaceTxHash = undefined;
          // For decodes, isFreeTransfer means no decode cost was paid
          finalIsFreeTransfer = (finalDecodeCostGun ?? 0) === 0;

          // Calculate USD from historical GUN price for decode cost
          if (finalDecodeCostGun && finalPurchaseDate) {
            try {
              const historicalPrice = await coinGeckoService.getHistoricalGunPrice(finalPurchaseDate);
              if (historicalPrice) {
                finalDecodeCostUsd = finalDecodeCostGun * historicalPrice;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for decode cost:', priceError);
            }
          }

          if (debugMode) {
            console.debug('[NFTDetailModal] Decode (in-game) acquisition:', {
              costGunFromChain,
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              decodeCostGun: finalDecodeCostGun,
              decodeCostUsd: finalDecodeCostUsd,
            });
          }
        } else if (acquisitionVenue === 'opensea') {
          // B) OPENSEA PURCHASE: Marketplace purchase with RPC cost
          derivedPriceSource = 'onchain';
          finalAcquisitionType = 'PURCHASE';
          finalPurchasePriceGun = costGunFromChain > 0 ? costGunFromChain : undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // OpenSea purchases have marketplace tx hash
          finalMarketplaceTxHash = acquisitionTxHash ?? undefined;
          finalIsFreeTransfer = false;

          // Calculate USD from historical GUN price
          if (finalPurchasePriceGun && finalPurchaseDate) {
            try {
              const historicalPrice = await coinGeckoService.getHistoricalGunPrice(finalPurchaseDate);
              if (historicalPrice) {
                finalPurchasePriceUsd = finalPurchasePriceGun * historicalPrice;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for OpenSea purchase:', priceError);
            }
          }

          if (debugMode) {
            console.debug('[NFTDetailModal] OpenSea purchase:', {
              costGunFromChain,
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              purchasePriceGun: finalPurchasePriceGun,
              purchasePriceUsd: finalPurchasePriceUsd,
            });
          }
        } else if (acquisitionVenue === 'in_game_marketplace') {
          // C) IN-GAME MARKETPLACE PURCHASE: Marketplace purchase with RPC cost
          derivedPriceSource = 'onchain';
          finalAcquisitionType = 'PURCHASE';
          finalPurchasePriceGun = costGunFromChain > 0 ? costGunFromChain : undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // In-game marketplace purchases have marketplace tx hash
          finalMarketplaceTxHash = acquisitionTxHash ?? undefined;
          finalIsFreeTransfer = false;

          // Calculate USD from historical GUN price
          if (finalPurchasePriceGun && finalPurchaseDate) {
            try {
              const historicalPrice = await coinGeckoService.getHistoricalGunPrice(finalPurchaseDate);
              if (historicalPrice) {
                finalPurchasePriceUsd = finalPurchasePriceGun * historicalPrice;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for in-game marketplace purchase:', priceError);
            }
          }

          if (debugMode) {
            console.debug('[NFTDetailModal] In-game marketplace purchase:', {
              costGunFromChain,
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              purchasePriceGun: finalPurchasePriceGun,
              purchasePriceUsd: finalPurchasePriceUsd,
            });
          }
        } else if (acquisitionVenue === 'otg_marketplace') {
          // D) OTG MARKETPLACE PURCHASE: Legacy marketplace with RPC cost
          derivedPriceSource = 'onchain';
          finalAcquisitionType = 'PURCHASE';
          finalPurchasePriceGun = costGunFromChain > 0 ? costGunFromChain : undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // OTG marketplace purchases have marketplace tx hash
          finalMarketplaceTxHash = acquisitionTxHash ?? undefined;
          finalIsFreeTransfer = false;

          // Calculate USD from historical GUN price
          if (finalPurchasePriceGun && finalPurchaseDate) {
            try {
              const historicalPrice = await coinGeckoService.getHistoricalGunPrice(finalPurchaseDate);
              if (historicalPrice) {
                finalPurchasePriceUsd = finalPurchasePriceGun * historicalPrice;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for OTG marketplace purchase:', priceError);
            }
          }

          if (debugMode) {
            console.debug('[NFTDetailModal] OTG Marketplace purchase:', {
              costGunFromChain,
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              purchasePriceGun: finalPurchasePriceGun,
              purchasePriceUsd: finalPurchasePriceUsd,
            });
          }
        } else if (acquisitionVenue === 'transfer') {
          // E) TRANSFER: No price data, no marketplace tx
          derivedPriceSource = 'transfers';
          finalAcquisitionType = 'TRANSFER';
          finalPurchasePriceGun = undefined;
          finalPurchasePriceUsd = undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // Transfers have NO marketplace tx hash - only acquisitionTxHash
          finalMarketplaceTxHash = undefined;
          finalIsFreeTransfer = true;

          if (debugMode) {
            console.debug('[NFTDetailModal] Transfer acquisition:', {
              venue: acquisitionVenue,
              txHash: acquisitionTxHash,
              fromAddress,
            });
          }
        } else if (hasMarketplaceServiceMatch) {
          // F1) Legacy: Marketplace service match - use marketplace data
          derivedPriceSource = 'onchain';
          finalAcquisitionType = acquisitionType;
          finalPurchasePriceGun = purchasePriceGun;
          finalPurchasePriceUsd = purchasePriceUsd;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = purchaseDate;
          finalMarketplaceTxHash = marketplaceTxHash;
          finalIsFreeTransfer = false;

          if (debugMode) {
            console.debug('[NFTDetailModal] Legacy marketplace service match:', {
              purchasePriceGun,
              purchasePriceUsd,
              marketplaceTxHash,
            });
          }
        } else if (hasTransferData) {
          // F2) Fallback: Has transfer data but unknown venue
          derivedPriceSource = 'transfers';
          finalAcquisitionType = acquisitionType;
          finalPurchasePriceGun = undefined;
          finalPurchasePriceUsd = undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          finalMarketplaceTxHash = undefined;
          finalIsFreeTransfer = acquisitionType === 'TRANSFER';

          if (debugMode) {
            console.debug('[NFTDetailModal] Unknown venue with transfer data:', {
              venue: acquisitionVenue,
              acquisitionType,
              fromAddress,
            });
          }
        } else {
          // F3) No acquisition data
          derivedPriceSource = 'none';
          finalAcquisitionType = 'UNKNOWN';
          finalPurchasePriceGun = undefined;
          finalPurchasePriceUsd = undefined;
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = undefined;
          finalMarketplaceTxHash = undefined;
          finalIsFreeTransfer = true;

          if (debugMode) {
            console.debug('[NFTDetailModal] No acquisition data');
          }
        }

        // Build fresh acquisition object - no merging with prior state
        const freshAcquisition: AcquisitionData = {
          priceSource: derivedPriceSource,
          acquisitionVenue: acquisitionVenue,

          // Transfer-derived fields
          acquiredAt: hasTransferData ? acquiredAt : undefined,
          fromAddress: hasTransferData ? fromAddress : undefined,
          acquisitionType: hasTransferData ? finalAcquisitionType : undefined,
          acquisitionTxHash: acquisitionTxHash ?? undefined,

          // Marketplace purchase price fields (OpenSea, OTG Marketplace, etc.)
          purchasePriceGun: finalPurchasePriceGun,
          purchasePriceUsd: finalPurchasePriceUsd,
          purchaseDate: finalPurchaseDate,
          marketplaceTxHash: finalMarketplaceTxHash,

          // Decode/Mint cost fields (in-game, NOT marketplace)
          decodeCostGun: finalDecodeCostGun,
          decodeCostUsd: finalDecodeCostUsd,

          // Legacy compatibility
          transferredFrom: (hasTransferData && finalAcquisitionType === 'TRANSFER') ? fromAddress : undefined,
          isFreeTransfer: finalIsFreeTransfer,
        };

        if (debugMode) {
          console.debug('[NFTDetailModal] Fresh acquisition object built:', {
            tokenId,
            tokenKey,
            hasTransferData,
            acquisitionVenue,
            finalAcquisitionType,
            hasMarketplaceServiceMatch,
            marketplaceCandidatesCount,
            marketplaceMatchMethod,
            freshAcquisition,
            isBackgroundRefresh,
          });
        }

        // =====================================================================
        // RESOLVED ACQUISITION: Build candidates and select best (no downgrades)
        // =====================================================================

        // Build candidates from all available sources
        const candidateFromHolding = buildCandidateFromHoldingRaw(acquisition, currentGunPrice ?? undefined);

        // Build candidate from the fresh acquisition data we just constructed
        const candidateFromFresh: Partial<ResolvedAcquisition> = {
          acquisitionType: finalAcquisitionType,
          venue: acquisitionVenue ?? null,
          acquiredAt: acquiredAt?.toISOString() ?? null,
          costGun: finalPurchasePriceGun ?? finalDecodeCostGun ?? null,
          costUsd: finalPurchasePriceUsd ?? finalDecodeCostUsd ?? null,
          txHash: acquisitionTxHash ?? finalMarketplaceTxHash ?? null,
          fromAddress: fromAddress ?? null,
          source: derivedPriceSource === 'onchain' ? 'onchain' : 'holdingAcquisitionRaw',
        };

        // Build candidate from localStorage cache (if available)
        const cachedData = cacheResult.hit && 'value' in cacheResult ? cacheResult.value : null;
        const candidateFromCache = buildCandidateFromCache(cachedData ?? null);

        // Build candidate from transfer derivation (lowest priority fallback)
        const candidateFromTransfer = buildCandidateFromTransfer(
          acquiredAt,
          finalAcquisitionType,
          fromAddress ?? undefined,
          acquisitionTxHash ?? undefined
        );

        // Select best candidate by score
        const newResolved = selectBestAcquisition([
          candidateFromHolding,
          candidateFromFresh,
          candidateFromCache,
          candidateFromTransfer,
        ]);

        if (debugMode) {
          console.debug('[NFTDetailModal] Resolved acquisition candidates:', {
            tokenId,
            candidateFromHolding: candidateFromHolding ? scoreAcquisitionCandidate(candidateFromHolding) : null,
            candidateFromFresh: scoreAcquisitionCandidate(candidateFromFresh),
            candidateFromCache: candidateFromCache ? scoreAcquisitionCandidate(candidateFromCache) : null,
            candidateFromTransfer: candidateFromTransfer ? scoreAcquisitionCandidate(candidateFromTransfer) : null,
            selectedScore: newResolved.qualityScore,
            selectedSource: newResolved.source,
          });
        }

        // Merge with existing resolved acquisition (prevent downgrades)
        const existingResolved = resolvedAcquisitions[tokenId] ?? null;
        const { result: finalResolved, wasUpdated: resolvedWasUpdated, reason: mergeReason } =
          mergeAcquisitionIfBetter(existingResolved, newResolved);

        if (debugMode) {
          console.debug('[NFTDetailModal] Resolved acquisition merge:', {
            tokenId,
            existingScore: existingResolved?.qualityScore ?? 'none',
            newScore: newResolved.qualityScore,
            wasUpdated: resolvedWasUpdated,
            mergeReason,
            finalScore: finalResolved.qualityScore,
          });
        }

        // Update debug with final price source and marketplace match info
        // Include comprehensive refresh diagnostics for debugging
        const refreshFinishedAt = new Date().toISOString();
        const refreshDecision = resolvedWasUpdated ? 'updated' : 'kept_existing_no_downgrade';
        const refreshResultSummary = resolvedWasUpdated
          ? `updated: score ${existingResolved?.qualityScore ?? 'none'} -> ${finalResolved.qualityScore} (${finalResolved.source})`
          : `kept existing: score ${existingResolved?.qualityScore ?? 'none'} >= new ${newResolved.qualityScore} (${mergeReason})`;

        setDebugData(prev => ({
          ...prev,
          priceSource: derivedPriceSource,
          marketplaceMatchedTxHash: marketplaceTxHash,
          // Mark if background refresh caused an update
          backgroundRefreshUpdated: isBackgroundRefresh && resolvedWasUpdated,
          // Enhanced refresh diagnostics
          ...(isBackgroundRefresh ? {
            refreshFinishedAtIso: refreshFinishedAt,
            refreshError: null,
            refreshResultSummary,
            refreshExistingScore: existingResolved?.qualityScore ?? null,
            refreshNewScore: newResolved.qualityScore,
            refreshDecision,
          } : {}),
        }));

        // Always update resolved acquisition state (it handles its own no-downgrade logic)
        setResolvedAcquisitions(prev => ({
          ...prev,
          [tokenId]: finalResolved,
        }));

        // Update legacy itemPurchaseData for backwards compatibility
        if (resolvedWasUpdated) {
          // Store FRESH data in component state - completely replace, no merging
          setItemPurchaseData(prev => ({
            ...prev,
            [tokenId]: freshAcquisition,
          }));

          // Persist to localStorage using new versioned cache system
          setCachedNFTDetail(walletAddress, tokenKey, {
            purchasePriceGun: freshAcquisition.purchasePriceGun,
            purchasePriceUsd: freshAcquisition.purchasePriceUsd,
            purchaseDate: freshAcquisition.purchaseDate?.toISOString(),
            transferredFrom: freshAcquisition.transferredFrom,
            isFreeTransfer: freshAcquisition.isFreeTransfer,
            acquisitionVenue: acquisitionVenue,
            acquisitionTxHash: acquisitionTxHash ?? undefined,
          });

          if (debugMode) {
            console.debug('[NFTDetailModal] Cached to localStorage:', {
              tokenKey,
              cacheKey: fullCacheKey,
              isBackgroundRefresh,
            });
          }
        } else if (debugMode && isBackgroundRefresh) {
          console.debug('[NFTDetailModal] Background refresh prevented downgrade:', {
            tokenId,
            tokenKey,
            reason: mergeReason,
          });
        }
      } catch (error) {
        // HARDENING: Silent exit on AbortError (user switched tokens or modal closed)
        if (isAbortError(error)) {
          if (debugMode) {
            console.debug('[NFTDetailModal] Main fetch aborted (AbortError) for token:', tokenId);
          }
          return;
        }

        // HARDENING: Check abort signal in catch block
        if (abortController.signal.aborted) {
          if (debugMode) {
            console.debug('[NFTDetailModal] Skipping error state update - fetch was aborted:', tokenId);
          }
          return;
        }

        // HARDENING: Async safety - skip state update if unmounted or token changed
        if (!isMountedRef.current || activeItem?.tokenId !== tokenId) {
          if (debugMode) {
            console.debug('[NFTDetailModal] Skipping error state update - unmounted or token changed:', {
              isMounted: isMountedRef.current,
              startedTokenId: tokenId,
              currentTokenId: activeItem?.tokenId,
            });
          }
          return;
        }

        console.error('Error loading NFT details:', error);

        // HARDENING: Update per-token status to error
        const errorMessage = error instanceof Error ? error.message : String(error);
        setHoldingAcqStatusByTokenId(prev => ({ ...prev, [tokenId]: 'error' }));
        setHoldingAcqErrorByTokenId(prev => ({ ...prev, [tokenId]: errorMessage }));
        setListingsStatusByTokenId(prev => ({ ...prev, [tokenId]: 'error' }));
        setListingsErrorByTokenId(prev => ({ ...prev, [tokenId]: errorMessage }));

        // Record error in refresh diagnostics
        if (isBackgroundRefresh) {
          setDebugData(prev => ({
            ...prev,
            refreshFinishedAtIso: new Date().toISOString(),
            refreshError: errorMessage,
            refreshResultSummary: `error: ${errorMessage.slice(0, 100)}`,
            refreshDecision: 'error',
          }));
        }
      } finally {
        // HARDENING: Clean up AbortController reference
        if (abortControllersRef.current[abortKey] === abortController) {
          delete abortControllersRef.current[abortKey];
        }

        // Mark fetch as complete and update timestamp
        fetchStateRef.current.fetchInProgress = false;
        fetchStateRef.current.lastFetchTimestamp = Date.now();

        // Only clear loading if this was NOT a background refresh
        if (!isBackgroundRefresh) {
          setLoadingDetails(false);
        }
      }
    };

    // Run loadItemDetails - pass whether this is a background refresh
    loadItemDetails(cacheRenderedFirst);
    // Note: listingsData removed from deps - it's fetched inside and shouldn't trigger re-runs
  }, [isOpen, nft, walletAddress, activeItem, debugMode, noCacheMode]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Get current item's purchase data
  const currentPurchaseData = activeItem ? itemPurchaseData[activeItem.tokenId] : undefined;
  // Get resolved acquisition (deterministic, no-downgrade)
  const currentResolvedAcquisition = activeItem ? resolvedAcquisitions[activeItem.tokenId] : undefined;

  // Copy debug data to clipboard
  const handleCopyDebugData = useCallback(() => {
    const debugOutput = {
      tokenKey: debugData.tokenKey,
      cacheKey: debugData.cacheKey,
      cacheHit: debugData.cacheHit,
      cacheReason: debugData.cacheReason,
      priceSource: debugData.priceSource,
      noCacheEnabled: debugData.noCacheEnabled,
      cacheBypassed: debugData.cacheBypassed,
      cacheRenderedFirst: debugData.cacheRenderedFirst,
      backgroundRefreshAttempted: debugData.backgroundRefreshAttempted,
      backgroundRefreshUpdated: debugData.backgroundRefreshUpdated,
      // Enhanced refresh diagnostics
      refreshDiagnostics: {
        startedAt: debugData.refreshStartedAtIso,
        finishedAt: debugData.refreshFinishedAtIso,
        error: debugData.refreshError,
        resultSummary: debugData.refreshResultSummary,
        existingScore: debugData.refreshExistingScore,
        newScore: debugData.refreshNewScore,
        decision: debugData.refreshDecision,
      },
      metadataDebug: nft?.metadataDebug ?? null,
      // Resolved acquisition (deterministic, no-downgrade)
      resolvedAcquisition: currentResolvedAcquisition ?? null,
      // Legacy acquisition data
      acquisition: {
        priceSource: currentPurchaseData?.priceSource ?? 'none',
        acquisitionVenue: currentPurchaseData?.acquisitionVenue ?? null,
        acquiredAt: toIsoStringSafe(currentPurchaseData?.acquiredAt) ?? null,
        fromAddress: currentPurchaseData?.fromAddress ?? null,
        acquisitionType: currentPurchaseData?.acquisitionType ?? null,
        acquisitionTxHash: currentPurchaseData?.acquisitionTxHash ?? null,
        purchasePriceGun: currentPurchaseData?.purchasePriceGun ?? null,
        purchasePriceUsd: currentPurchaseData?.purchasePriceUsd ?? null,
        purchaseDate: toIsoStringSafe(currentPurchaseData?.purchaseDate) ?? null,
        marketplaceTxHash: currentPurchaseData?.marketplaceTxHash ?? null,
        decodeCostGun: currentPurchaseData?.decodeCostGun ?? null,
        decodeCostUsd: currentPurchaseData?.decodeCostUsd ?? null,
        transferredFrom: currentPurchaseData?.transferredFrom ?? null,
        isFreeTransfer: currentPurchaseData?.isFreeTransfer ?? null,
      },
      holdingAcquisitionRaw,
      transferDerivation: {
        derivedAcquiredAt: debugData.derivedAcquiredAt ?? null,
        derivedAcquisitionType: debugData.derivedAcquisitionType ?? null,
      },
      marketplaceMatching: {
        viewerWallet: debugData.viewerWallet,
        currentOwner: debugData.currentOwner,
        endpointBaseUrl: debugData.marketplaceEndpointBaseUrl,
        network: debugData.marketplaceNetwork,
        configured: debugData.marketplaceConfigured,
        serverProxyUsed: debugData.serverProxyUsed,
        testConnection: debugData.marketplaceTestConnection ?? null,
        matchWindowMinutes: debugData.matchWindowMinutes,
        tokenPurchasesCount: debugData.tokenPurchasesCount,
        walletPurchasesCount_viewerWallet: debugData.walletPurchasesCount_viewerWallet,
        walletPurchasesTimeRange_viewerWallet: debugData.walletPurchasesTimeRange_viewerWallet ?? null,
        walletPurchasesCount_currentOwner: debugData.walletPurchasesCount_currentOwner,
        walletPurchasesTimeRange_currentOwner: debugData.walletPurchasesTimeRange_currentOwner ?? null,
        candidatesCount: debugData.marketplaceCandidatesCount,
        candidateTimes: debugData.marketplaceCandidateTimes ?? null,
        matchMethod: debugData.marketplaceMatchMethod,
        matchedPurchaseId: debugData.marketplaceMatchedPurchaseId ?? null,
        matchedOrderId: debugData.marketplaceMatchedOrderId ?? null,
        matchedTimestamp: debugData.marketplaceMatchedTimestamp ?? null,
        matchedTxHash: debugData.marketplaceMatchedTxHash ?? null,
      },
      gunUsdRate: currentGunPrice ?? null,
      gunPriceTimestamp: toIsoStringSafe(debugData.gunPriceTimestamp) ?? null,
      transferEventCount: debugData.transferEventCount,
      transferQueryInfo: debugData.transferQueryInfo ?? null,
      marketplaceMatches: debugData.marketplaceMatches,
      openSeaError: debugData.openSeaError ?? null,
      listingsData,
      // Computed market inputs (single source of truth for hero + position label)
      marketInputs: computeMarketInputs(listingsData, nft?.floorPrice, nft?.ceilingPrice),
      // Active token ID for context
      activeTokenId: activeItem?.tokenId ?? null,
    };

    navigator.clipboard.writeText(JSON.stringify(debugOutput, null, 2))
      .then(() => {
        setDebugCopied(true);
        setTimeout(() => setDebugCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy debug data:', err);
      });
  }, [debugData, nft, activeItem, currentPurchaseData, currentResolvedAcquisition, holdingAcquisitionRaw, currentGunPrice, listingsData]);

  // Filter traits to exclude "None" values
  const filteredTraits = useMemo(() => {
    if (!nft?.traits) return {};
    return Object.fromEntries(
      Object.entries(nft.traits).filter(([, value]) =>
        value && value.toLowerCase() !== 'none'
      )
    );
  }, [nft?.traits]);

  // Find related items (skins/attachments) for weapons
  const relatedItems = useMemo(() => {
    if (!nft || allNfts.length === 0) return [];
    return findRelatedItems(nft, allNfts);
  }, [nft, allNfts]);

  // Check if this NFT is a weapon with related items
  const hasRelatedItems = nft && isWeapon(nft) && relatedItems.length > 0;

  // Early return after all hooks
  if (!nft) return null;

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Format chain name for display
  const getChainDisplayName = (chain: string) => {
    if (chain === 'avalanche') return 'GUNZ';
    return chain.toUpperCase();
  };

  // =============================================================================
  // Canonical cost basis from resolved acquisition (single source of truth)
  // Uses normalizeCostBasis helper for consistent validation
  // =============================================================================
  const costBasisGun: number | null = (() => {
    // Transfers have no cost basis
    if (!currentResolvedAcquisition || currentResolvedAcquisition.acquisitionType === 'TRANSFER') {
      return null;
    }
    const rawCost = currentResolvedAcquisition.costGun;
    const normalized = normalizeCostBasis(rawCost);

    // HARDENING: warnOnce if we filtered out an anomalous value
    if (rawCost !== null && rawCost !== undefined && normalized === null) {
      warnOnce(`costBasis:${activeItem?.tokenId ?? 'unknown'}`, 'Anomalous cost basis filtered:', rawCost);
    }

    return normalized;
  })();

  // =============================================================================
  // Canonical market inputs (single source of truth for hero + position label)
  // Memoized to prevent recomputation on every render
  // =============================================================================
  const marketInputs = useMemo(
    () => computeMarketInputs(listingsData, nft.floorPrice, nft.ceilingPrice),
    [listingsData, nft.floorPrice, nft.ceilingPrice]
  );

  // Market reference values for display (uses marketInputs)
  const marketRef = {
    hasMarketData: marketInputs.ref !== null,
    gunValue: marketInputs.ref,
    usdValue: marketInputs.ref !== null && currentGunPrice ? marketInputs.ref * currentGunPrice : undefined,
    dataQuality: marketInputs.dataQuality,
  };

  // Calculate position of a value on the range bar (0-100%)
  const getPositionOnRange = (value: number, low: number, high: number): number => {
    if (high === low) return 50;
    const position = ((value - low) / (high - low)) * 100;
    // Clamp between 2% and 98% to keep markers visible
    return Math.max(2, Math.min(98, position));
  };

  // Check if we have acquisition data to show
  const hasAcquisitionData = currentPurchaseData?.purchaseDate ||
    currentPurchaseData?.purchasePriceGun !== undefined ||
    currentPurchaseData?.isFreeTransfer;

  // Per-token holdingAcq status (for UI feedback)
  const activeTokenId = activeItem?.tokenId ?? '';
  const holdingAcqStatus = holdingAcqStatusByTokenId[activeTokenId] ?? 'idle';
  const holdingAcqError = holdingAcqErrorByTokenId[activeTokenId] ?? null;

  // Check if we have any details to show in accordion
  const hasDetails = hasAcquisitionData || Object.keys(filteredTraits).length > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Modal Container - flex row to allow related items panel */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-stretch gap-0 pointer-events-auto">
          {/* Main Modal */}
          <div
            className={`relative w-full min-w-[360px] max-w-[440px] max-h-[85vh] bg-[#0d0d0d] rounded-2xl overflow-hidden flex flex-col transform transition-all duration-300 ${
              isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
            } ${hasRelatedItems && relatedItemsExpanded ? 'rounded-r-none' : ''}`}
            style={{
              boxShadow: hasRelatedItems && relatedItemsExpanded ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
          {/* ===== 1) ModalHeader ===== */}
          <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.12]">
            <h2 className="text-base font-semibold text-white">NFT Details</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white transition p-1.5 -mr-1.5 rounded-lg hover:bg-white/5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-premium overscroll-contain [-webkit-overflow-scrolling:touch] select-none [scrollbar-gutter:stable]">
            <div className="p-4 space-y-4">

              {/* ===== 2) IdentitySection ===== */}
              <div className="space-y-3">
                {/* NFT Image */}
                {sortedItems.length > 1 ? (
                  // Multiple items - grid view
                  <div className="grid grid-cols-2 gap-2">
                    {sortedItems.map((item, index) => {
                      const isActive = index === activeItemIndex;
                      return (
                        <button
                          key={item.tokenId}
                          onClick={() => setActiveItemIndex(index)}
                          className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                            isActive ? 'ring-1 opacity-100' : 'opacity-50 hover:opacity-75'
                          }`}
                          style={{
                            borderColor: isActive ? item.colors.border : 'transparent',
                            boxShadow: isActive ? `0 0 5px ${item.colors.border}` : 'none',
                          }}
                        >
                          {loadingDetails && isActive ? (
                            <div className="w-full h-full bg-[#1a1a1a] animate-pulse" />
                          ) : nft.image ? (
                            <Image
                              src={nft.image}
                              alt={`${nft.name} #${item.mintNumber}`}
                              fill
                              className="object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] text-gray-600 text-xs">
                              No Image
                            </div>
                          )}
                          {/* Mint badge */}
                          <div
                            className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                            style={{ backgroundColor: isActive ? item.colors.primary : 'rgba(0,0,0,0.7)' }}
                          >
                            #{item.mintNumber}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Single image - responsive: 180px on small screens, 220px otherwise
                  <div className="relative mx-auto max-h-[180px] sm:max-h-[220px]">
                    <div
                      className="relative aspect-square rounded-xl overflow-hidden mx-auto max-h-[180px] sm:max-h-[220px] max-w-[180px] sm:max-w-[220px]"
                      style={{
                        border: `1px solid ${activeItem?.colors.border}`,
                        boxShadow: `0 0 5px ${activeItem?.colors.border}`,
                      }}
                    >
                      {loadingDetails ? (
                        <div className="w-full h-full bg-[#1a1a1a] animate-pulse" />
                      ) : nft.image ? (
                        <Image
                          src={nft.image}
                          alt={nft.name}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] text-gray-600">
                          No Image
                        </div>
                      )}
                      {/* Mint badge */}
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold text-white"
                        style={{ backgroundColor: activeItem?.colors.primary }}
                      >
                        #{activeItem?.mintNumber}
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata below image */}
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white">{nft.name}</h3>
                  {/* Subtitle: description if available, otherwise collection name */}
                  {(() => {
                    const descriptionText = (nft?.description ?? '').trim();
                    const subtitle = descriptionText.length > 0 ? descriptionText : nft.collection;
                    return (
                      <p className="text-sm text-white/60 leading-snug line-clamp-2 mt-0.5">
                        {subtitle}
                      </p>
                    );
                  })()}
                  <p className="text-[11px] text-white/60 mt-1">
                    Mint #{activeItem?.mintNumber} · Chain: {getChainDisplayName(nft.chain)}
                  </p>
                </div>
              </div>

              {/* ===== 2.5) YOUR POSITION Section ===== */}
              {walletAddress && costBasisGun !== null && (() => {
                // Compute USD values for position tracking
                const costBasisUsdAtAcquisition = currentPurchaseData?.purchasePriceUsd
                  ?? currentPurchaseData?.decodeCostUsd
                  ?? currentResolvedAcquisition?.costUsd
                  ?? null;

                const currentValueUsd = costBasisGun !== null && currentGunPrice !== null
                  ? costBasisGun * currentGunPrice
                  : null;

                const unrealizedUsd = (currentValueUsd !== null && costBasisUsdAtAcquisition !== null)
                  ? currentValueUsd - costBasisUsdAtAcquisition
                  : null;

                const unrealizedPct = (unrealizedUsd !== null && costBasisUsdAtAcquisition !== null && costBasisUsdAtAcquisition > 0)
                  ? (unrealizedUsd / costBasisUsdAtAcquisition) * 100
                  : null;

                // Status pill based on acquisition type
                const acquisitionType = currentResolvedAcquisition?.acquisitionType;
                const getStatusPill = () => {
                  if (acquisitionType === 'MINT') {
                    return { text: 'Decoded', style: 'bg-emerald-500/20 text-emerald-300' };
                  }
                  if (acquisitionType === 'PURCHASE') {
                    return { text: 'Acquired', style: 'bg-emerald-500/20 text-emerald-300' };
                  }
                  if (acquisitionType === 'TRANSFER') {
                    return { text: 'Transferred', style: 'bg-white/10 text-white/50' };
                  }
                  return null;
                };

                const statusPill = getStatusPill();

                // Unrealized line color
                const getUnrealizedColor = () => {
                  if (unrealizedUsd === null) return 'text-white/60';
                  if (unrealizedUsd > 0.01) return 'text-emerald-300';
                  if (unrealizedUsd < -0.01) return 'text-rose-300';
                  return 'text-white/60';
                };

                // Format unrealized display
                const formatUnrealized = () => {
                  if (unrealizedUsd === null || unrealizedPct === null) return null;
                  const sign = unrealizedUsd >= 0 ? '+' : '';
                  const usdStr = `${sign}$${Math.abs(unrealizedUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  const pctStr = `(${sign}${unrealizedPct.toFixed(1)}%)`;
                  return `${usdStr} ${pctStr}`;
                };

                return (
                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: 'rgba(0, 255, 200, 0.06)' }}
                  >
                    {/* Header row: YOUR POSITION + Status pill */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/65">
                        Your Position
                      </p>
                      {/* Status pill */}
                      {statusPill && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusPill.style}`}>
                          {statusPill.text}
                        </span>
                      )}
                    </div>

                    {loadingDetails ? (
                      // Loading skeleton
                      <div className="space-y-2">
                        <div className="h-8 w-28 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-36 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-40 bg-white/10 rounded animate-pulse" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Current USD value */}
                        <p className="text-[26px] font-bold text-white">
                          {currentValueUsd !== null
                            ? `$${currentValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '—'}
                        </p>

                        {/* Cost basis in GUN */}
                        <p className="text-[13px] text-white/70">
                          Cost basis: {costBasisGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                        </p>

                        {/* USD at acquisition */}
                        {costBasisUsdAtAcquisition !== null && (
                          <p className="text-[13px] text-white/50">
                            At acquisition: ${costBasisUsdAtAcquisition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}

                        {/* Unrealized P&L */}
                        {formatUnrealized() && (
                          <p className={`text-[13px] ${getUnrealizedColor()}`}>
                            Unrealized (GUN): {formatUnrealized()}
                          </p>
                        )}

                        {/* Explanation text */}
                        <p className="text-[11px] text-white/40 mt-2 leading-relaxed">
                          Based on your acquisition cost (GUN) valued at today&apos;s GUN price.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ===== 3) ValueHeroSection ===== */}
              {walletAddress && (() => {
                // Compute position label using canonical sources (costBasisGun + marketInputs)
                const positionLabel = getPositionLabel({
                  acquisitionPriceGun: costBasisGun,
                  marketRefGun: marketInputs.ref,
                  dataQuality: marketInputs.dataQuality,
                });

                // Position pill styling based on state
                const getPositionPillStyles = () => {
                  switch (positionLabel.state) {
                    case 'UP':
                      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20';
                    case 'DOWN':
                      return 'bg-rose-500/10 text-rose-300 border border-rose-500/20';
                    case 'FLAT':
                      return 'bg-white/5 text-white/70 border border-white/10';
                    default:
                      return 'bg-transparent text-white/60 border border-white/10';
                  }
                };

                // Position pill text
                const getPositionPillText = () => {
                  switch (positionLabel.state) {
                    case 'UP': return 'Up';
                    case 'DOWN': return 'Down';
                    case 'FLAT': return 'Flat';
                    case 'NO_COST_BASIS': return 'No cost basis';
                    case 'NO_MARKET_REF': return 'No market reference';
                  }
                };

                // Position pill icon
                const getPositionIcon = () => {
                  switch (positionLabel.state) {
                    case 'UP':
                      return <span className="text-[10px]">↗</span>;
                    case 'DOWN':
                      return <span className="text-[10px]">↘</span>;
                    case 'FLAT':
                      return <span className="text-[10px]">–</span>;
                    default:
                      return <span className="text-[10px]">•</span>;
                  }
                };

                // Tooltip text
                const getTooltipText = () => {
                  if (positionLabel.state === 'NO_COST_BASIS') {
                    return "We can't compute your position without an acquisition cost.";
                  }
                  if (positionLabel.state === 'NO_MARKET_REF') {
                    return "No active listings found. Market reference may be unavailable in illiquid markets.";
                  }
                  let tooltip = "Based on observed listings (low–high). Illiquid markets can be noisy.";
                  if (positionLabel.dataQuality) {
                    tooltip += ` Data quality: ${positionLabel.dataQuality.charAt(0).toUpperCase() + positionLabel.dataQuality.slice(1)} (based on price spread).`;
                  }
                  return tooltip;
                };

                return (
                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: 'rgba(0, 255, 200, 0.06)' }}
                  >
                    {/* Header row: Market Reference + Position pill */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/65">
                        Market Reference
                      </p>
                      {/* Position pill */}
                      <div
                        className={`h-6 px-2.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 cursor-help ${getPositionPillStyles()}`}
                        title={getTooltipText()}
                      >
                        {getPositionIcon()}
                        {getPositionPillText()}
                      </div>
                    </div>

                    {loadingDetails ? (
                      // Loading skeleton
                      <div className="space-y-2">
                        <div className="h-7 w-32 bg-white/10 rounded animate-pulse" />
                        <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
                        <div className="h-3 w-40 bg-white/10 rounded animate-pulse" />
                      </div>
                    ) : marketRef.hasMarketData ? (
                      <div className="space-y-1">
                        <p className="text-[22px] font-semibold text-white">
                          ≈ ${marketRef.usdValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'} USD
                        </p>
                        <p className="text-[13px] font-medium text-white/85">
                          ≈ {marketRef.gunValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                        </p>
                        {/* Unrealized P/L percent line */}
                        {positionLabel.pnlPct !== null && (
                          <p className={`text-xs ${
                            positionLabel.state === 'UP' ? 'text-emerald-300' :
                            positionLabel.state === 'DOWN' ? 'text-rose-300' :
                            'text-white/70'
                          }`}>
                            Unrealized: {positionLabel.pnlPct >= 0 ? '+' : ''}{(positionLabel.pnlPct * 100).toFixed(1)}%
                          </p>
                        )}
                        {/* Data Quality - neutral styling, spread-based only */}
                        {positionLabel.dataQuality && (
                          <p
                            className="text-[11px] text-white/60 mt-2 inline-flex items-center gap-1 cursor-help"
                            title="Based on observed price range only. Listings are sparse and may not reflect actual sale prices."
                          >
                            Data Quality:{' '}
                            <span className="capitalize">{positionLabel.dataQuality}</span>
                            <svg className="w-3 h-3 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </p>
                        )}
                      </div>
                    ) : (
                      // No market data state
                      <div className="space-y-1">
                        <p className="text-base font-medium text-white/85">No active listings found</p>
                        <p className="text-xs text-white/50">
                          This is an illiquid market; reference values may be unavailable.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ===== 4) MarketReferenceSection (Observed Range Visualization) ===== */}
              <NFTDetailObservedMarketRange
                show={!!walletAddress}
                loading={loadingDetails}
                marketInputs={marketInputs}
                costBasisGun={costBasisGun}
                getPositionOnRange={getPositionOnRange}
                listingsStatus={listingsStatusByTokenId[debugData.tokenKey ?? ''] ?? 'idle'}
                listingsError={listingsErrorByTokenId[debugData.tokenKey ?? ''] ?? null}
              />

              {/* ===== 5) DetailsAccordion ===== */}
              {hasDetails && (
                <div className="border-t border-white/[0.12] pt-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDetailsExpanded(v => !v);
                    }}
                    className="w-full flex items-center justify-between py-2 text-xs text-white/50 hover:text-white/70 transition"
                  >
                    <span>{detailsExpanded ? 'Hide details' : 'View details'}</span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${detailsExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {detailsExpanded && (
                    <div className="pt-3 pb-1">
                      {/* Two-column card layout: Acquisition + Traits */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        {/* ===== Acquisition Card ===== */}
                        {hasAcquisitionData && (
                          <NFTDetailAcquisitionCard
                            status={holdingAcqStatus}
                            error={holdingAcqError}
                            data={currentPurchaseData}
                            fallbackTxHash={holdingAcquisitionRaw?.txHash ?? undefined}
                            marketplaceConfigured={debugData.marketplaceConfigured}
                            formatDate={formatDate}
                            getVenueDisplayLabel={getVenueDisplayLabel}
                          />
                        )}

                        {/* ===== Traits Card ===== */}
                        <NFTDetailTraitsSection filteredTraits={filteredTraits} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ===== Debug Section (only visible with ?debugNft=1) ===== */}
              <NFTDetailDebugPanel
                show={debugMode}
                expanded={debugExpanded}
                copied={debugCopied}
                debugData={debugData}
                metadataDebug={nft?.metadataDebug as MetadataDebugData | undefined}
                currentPurchaseDataJson={JSON.stringify({
                  priceSource: currentPurchaseData?.priceSource ?? 'none',
                  acquisitionVenue: currentPurchaseData?.acquisitionVenue ?? null,
                  acquiredAt: toIsoStringSafe(currentPurchaseData?.acquiredAt) ?? null,
                  fromAddress: currentPurchaseData?.fromAddress ?? null,
                  acquisitionType: currentPurchaseData?.acquisitionType ?? null,
                  acquisitionTxHash: currentPurchaseData?.acquisitionTxHash ?? null,
                  purchasePriceGun: currentPurchaseData?.purchasePriceGun ?? null,
                  purchasePriceUsd: currentPurchaseData?.purchasePriceUsd ?? null,
                  purchaseDate: toIsoStringSafe(currentPurchaseData?.purchaseDate) ?? null,
                  marketplaceTxHash: currentPurchaseData?.marketplaceTxHash ?? null,
                  decodeCostGun: currentPurchaseData?.decodeCostGun ?? null,
                  decodeCostUsd: currentPurchaseData?.decodeCostUsd ?? null,
                  transferredFrom: currentPurchaseData?.transferredFrom ?? null,
                  isFreeTransfer: currentPurchaseData?.isFreeTransfer ?? null,
                }, null, 2)}
                currentResolvedAcquisition={currentResolvedAcquisition as ResolvedAcquisitionData | undefined}
                holdingAcquisitionRaw={holdingAcquisitionRaw as HoldingAcquisitionData | null}
                currentGunPrice={currentGunPrice}
                listingsDataJson={JSON.stringify(listingsData, null, 2)}
                listingsStatus={listingsStatusByTokenId[debugData.tokenKey ?? ''] ?? 'idle'}
                listingsError={listingsErrorByTokenId[debugData.tokenKey ?? ''] ?? null}
                holdingAcqStatus={holdingAcqStatusByTokenId[debugData.tokenKey ?? ''] ?? 'idle'}
                holdingAcqError={holdingAcqErrorByTokenId[debugData.tokenKey ?? ''] ?? null}
                listingsMapSize={Object.keys(listingsStatusByTokenId).length}
                holdingAcqMapSize={Object.keys(holdingAcqStatusByTokenId).length}
                onToggleExpanded={() => setDebugExpanded(v => !v)}
                onCopyDebugData={handleCopyDebugData}
                toIsoStringSafe={toIsoStringSafe}
              />
            </div>
          </div>

          {/* ===== 6) ModalFooter ===== */}
          <div className="h-14 flex-shrink-0 flex items-center justify-center px-4 border-t border-white/[0.12]">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-10 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition"
            >
              Close
            </button>
          </div>

        </div>

          {/* Enter Armory Button - positioned outside modal overflow */}
          {hasRelatedItems && (
            <button
              onClick={() => setRelatedItemsExpanded(!relatedItemsExpanded)}
              className={`relative self-start mt-[140px] w-10 h-32 bg-gradient-to-r from-[#1a1a1a] to-[#252525] border border-l-0 border-white/20 rounded-r-xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-[#64ffff] hover:border-[#64ffff]/50 transition-all duration-300 z-10 group ${
                relatedItemsExpanded ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : 'opacity-100 hover:translate-x-1'
              }`}
              title={`Armory - ${relatedItems.length} modifications available`}
            >
              {/* Vertical "ARMORY" text */}
              <span
                className="text-[9px] font-bold tracking-widest uppercase text-gray-500 group-hover:text-[#64ffff] transition-colors whitespace-nowrap"
                style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              >
                ARMORY
              </span>
              {/* Animated arrow */}
              <svg
                className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {/* Item count badge */}
              <span className="absolute -top-2 -right-1 w-5 h-5 bg-[#64ffff] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {relatedItems.length}
              </span>
            </button>
          )}

          {/* ===== Weapon Lab Panel ===== */}
          {hasRelatedItems && (
            <div
              className={`relative max-h-[85vh] bg-[#0d0d0d] rounded-r-2xl overflow-hidden flex flex-col transform transition-all duration-300 origin-left ${
                relatedItemsExpanded
                  ? 'w-[320px] opacity-100 scale-x-100'
                  : 'w-0 opacity-0 scale-x-0'
              }`}
              style={{
                boxShadow: relatedItemsExpanded ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : 'none',
              }}
            >
              {/* Panel Header */}
              <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.12]">
                <h3 className="text-sm font-semibold text-white">
                  Weapon Lab
                </h3>
                <button
                  onClick={() => setRelatedItemsExpanded(false)}
                  className="text-gray-400 hover:text-white transition p-1 rounded hover:bg-white/5 flex items-center gap-1 text-xs"
                  title="Exit Armory"
                >
                  <span className="text-[10px] text-gray-500">Exit Armory</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto scrollbar-premium">
                {/* Available Modifications Section */}
                <div className="p-3">
                  <h4 className="text-xs font-semibold text-[#64ffff] uppercase tracking-wider mb-2">
                    Available Modifications
                  </h4>
                  <div className="space-y-2">
                    {relatedItems.map((item) => {
                      const itemColors = getRarityColorForNft(item);
                      const itemRarity = item.traits?.['RARITY'] || item.traits?.['Rarity'] || 'Unknown';
                      const itemClass = item.traits?.['CLASS'] || item.traits?.['Class'] || '';
                      const quantity = item.quantity || 1;

                      return (
                        <div
                          key={item.tokenId}
                          className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
                          style={{
                            borderLeft: `3px solid ${itemColors.primary}`,
                          }}
                        >
                          {/* Thumbnail */}
                          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-black/50">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" title={item.name}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-[10px] font-semibold uppercase"
                                style={{ color: itemColors.primary }}
                              >
                                {itemRarity}
                              </span>
                              <span className="text-[10px] text-gray-500">
                                {itemClass === 'Weapon Skin' ? 'Skin' : itemClass}
                              </span>
                            </div>
                          </div>

                          {/* Quantity Badge */}
                          {quantity > 1 && (
                            <div className="flex-shrink-0 px-2 py-0.5 bg-[#96aaff]/20 text-[#96aaff] text-xs font-semibold rounded">
                              ×{quantity}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weapon Prototypes Section */}
                <div className="p-3 border-t border-white/[0.08]">
                  <h4 className="text-xs font-semibold text-[#96aaff] uppercase tracking-wider mb-1">
                    Weapon Prototypes
                  </h4>
                  <p className="text-[10px] text-gray-500 mb-3">
                    Configure, upgrade, and prototype weapons
                  </p>
                  <div className="flex items-center justify-center py-6 text-gray-600 text-xs">
                    <span className="text-center">Coming soon</span>
                  </div>
                </div>
              </div>

              {/* Panel Footer with summary */}
              <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.12] text-xs text-gray-500">
                {(() => {
                  const skins = relatedItems.filter(i => (i.traits?.['CLASS'] || i.traits?.['Class']) === 'Weapon Skin');
                  const accessories = relatedItems.filter(i => (i.traits?.['CLASS'] || i.traits?.['Class']) === 'Accessory');
                  const parts = [];
                  if (skins.length > 0) parts.push(`${skins.length} skin${skins.length > 1 ? 's' : ''}`);
                  if (accessories.length > 0) parts.push(`${accessories.length} attachment${accessories.length > 1 ? 's' : ''}`);
                  return parts.join(', ') || 'No modifications';
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
