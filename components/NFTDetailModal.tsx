'use client';

// =============================================================================
// TODO: REMAINING HARDENING PHASES
// =============================================================================
// Phase 7 — Historical USD conversion:
//   - Requires API/provider changes: price-at-time for GUN/USD
//   - Fallback rules + caching strategy for historical prices
// =============================================================================

import { NFT, MarketplacePurchase, AcquisitionVenue } from '@/lib/types';
import dynamic from 'next/dynamic';
import { NFTImage } from '@/components/ui/NFTImage';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { AvalancheService, NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';
import { OpenSeaService } from '@/lib/api/opensea';
import { CoinGeckoService } from '@/lib/api/coingecko';
import { useGunPrice } from '@/lib/hooks/useGunPrice';
import { useNFTDetailDebug } from '@/lib/hooks/useNFTDetailDebug';
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
  getVenueDisplayLabel,
  getRarityColorForNft,
  findRelatedItems,
} from '@/lib/nft/nftDetailHelpers';

// =============================================================================
// Import extracted presentational subcomponents
// =============================================================================
import {
  NFTDetailObservedMarketRange,
  NFTDetailQuickStats,
  NFTDetailTraitPills,
  type HoldingAcquisitionData,
  type ResolvedAcquisitionData,
  type MetadataDebugData,
} from '@/components/nft-detail';
import { LockedWeaponIndicator } from '@/components/weapon';

// Dynamic import for NFTDetailDebugPanel - only loaded when debugMode is active
const NFTDetailDebugPanel = dynamic(
  () => import('@/components/nft-detail/NFTDetailDebugPanel').then(mod => ({ default: mod.NFTDetailDebugPanel })),
  { ssr: false, loading: () => null }
);
import { isWeaponLocked, isWeapon, getFunctionalTier } from '@/lib/weapon';
import TierBadge from '@/components/ui/TierBadge';
import { RARITY_COLORS, RARITY_ORDER, DEFAULT_RARITY_COLORS } from '@/lib/utils/rarityColors';
import { gunzExplorerTxUrl } from '@/lib/explorer';

const getDefaultRarityColors = () => DEFAULT_RARITY_COLORS;

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

  // Only update if incoming has STRICTLY better score
  // This prevents overwriting good data with equal-score but potentially worse data
  // (e.g., cache has PURCHASE with price, refresh returns equal score but different fields)
  if (incoming.qualityScore > current.qualityScore) {
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
  // GUN price hook - fetches current GUN/USD rate when modal opens
  const { gunPrice: currentGunPrice, timestamp: gunPriceTimestamp } = useGunPrice(isOpen);
  const [relatedItemsExpanded, setRelatedItemsExpanded] = useState(false);

  // Debug mode: enabled via ?debugNft=1 URL parameter
  // No-cache mode: enabled via ?noCache=1 - bypasses all cache reads for fresh data
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debugNft') === '1';
  const noCacheMode = searchParams.get('noCache') === '1';
  // Debug state hook - manages debug data, copy-to-clipboard, and reset
  const {
    debugData,
    debugExpanded,
    debugCopied,
    updateDebugData,
    resetDebugData,
    setDebugExpanded,
    handleCopyDebugData,
  } = useNFTDetailDebug(gunPriceTimestamp);

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

  // Debug state is managed by useNFTDetailDebug hook (declared above)

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
      // Reset debug data (debugExpanded persists — handled inside hook)
      resetDebugData(noCacheMode);

    }
  }, [isOpen, noCacheMode]);

  // Build sorted list of items (by rarity desc, then mint number asc)
  const sortedItems: ItemData[] = useMemo(() => {
    if (!nft) {
      return [];
    }

    const defaultRarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'];

    if (!nft.tokenIds || nft.tokenIds.length <= 1) {
      const rarity = defaultRarity;
      const colors = RARITY_COLORS[rarity || ''] || getDefaultRarityColors();
      return [{
        tokenId: nft.tokenId,
        mintNumber: nft.mintNumber || nft.tokenId,
        rarity,
        index: 0,
        colors,
      }];
    }

    // Create items array — use per-item rarity from groupedRarities when available
    const items: ItemData[] = nft.tokenIds.map((tokenId, index) => {
      const rarity = nft.groupedRarities?.[index] || defaultRarity;
      const colors = RARITY_COLORS[rarity || ''] || getDefaultRarityColors();
      return {
        tokenId,
        mintNumber: nft.mintNumbers?.[index] || tokenId,
        rarity,
        index,
        colors,
      };
    });

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
    updateDebugData({
      tokenKey,
      cacheKey: fullCacheKey,
    });

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
      updateDebugData({
        cacheHit: true,
        cacheReason: 'fresh_data',
        priceSource: itemPurchaseData[tokenId].priceSource,
        cacheRenderedFirst: true,
        backgroundRefreshAttempted: false,
      });
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
      updateDebugData({
        cacheHit: true,
        cacheReason: 'component_state',
        priceSource: itemPurchaseData[tokenId].priceSource,
        cacheRenderedFirst: true,
      });
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
      updateDebugData({
        cacheHit: true,
        cacheReason: 'localStorage',
        priceSource: cachedPriceSource,
        cacheRenderedFirst: true,
      });
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
        updateDebugData({
          cacheBypassed: true,
          cacheReason: 'noCache_mode',
        });
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
        updateDebugData({
          backgroundRefreshAttempted: true,
          refreshStartedAtIso: new Date().toISOString(),
          refreshFinishedAtIso: null,
          refreshError: null,
          refreshResultSummary: null,
          refreshDecision: null,
        });
      } else {
        updateDebugData({
          cacheHit: false,
          cacheReason: cacheResult.reason || 'fetching',
        });
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
          updateDebugData({
            refreshError: 'acquisition_null_or_timeout',
            refreshResultSummary: 'acquisition fetch returned null (timeout or no data) - keeping existing',
          });
        }

        // Backward compatibility aliases
        const hasTransferData = hasAcquisitionData;
        const totalLogsFound = hasAcquisitionData ? 1 : 0;
        // For currentOwner lookup in marketplace matching (will be determined from acquisition)
        const currentOwnerFromAcquisition = acquisition?.owned ? walletAddress : null;

        // Map venue to acquisition type for backward compatibility
        let acquisitionType: AcquisitionType;
        if (acquisition?.isMint || acquisitionVenue === 'mint' || acquisitionVenue === 'decode' || acquisitionVenue === 'decoder' || acquisitionVenue === 'system_mint') {
          acquisitionType = 'MINT';
        } else if (hasAcquisitionData) {
          acquisitionType = 'TRANSFER';
        } else {
          acquisitionType = 'UNKNOWN';
        }

        // Update debug transfer event count and query info
        updateDebugData({
          transferEventCount: totalLogsFound,
          derivedAcquiredAt: acquiredAt?.toISOString(),
          derivedAcquisitionType: acquisitionType,
          acquisitionVenue,
          acquisitionTxHash: acquisitionTxHash ?? undefined,
        });

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
            updateDebugData({
              marketplaceMatches: marketplaceMatchCount,
              openSeaError: listings.error,
            });

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

            updateDebugData({
              marketplaceMatches: 0,
              openSeaError: errorMsg,
            });

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
            updateDebugData({
              viewerWallet: viewerWalletLower,
              currentOwner: currentOwnerLower,
              marketplaceEndpointBaseUrl: endpointInfo.baseUrl,
              marketplaceNetwork: endpointInfo.network,
              matchWindowMinutes: MATCH_WINDOW_MINUTES,
              marketplaceConfigured: endpointInfo.isConfigured,
              serverProxyUsed: endpointInfo.serverProxyUsed,
            });

            // Check if marketplace is configured before making API calls
            if (!endpointInfo.isConfigured) {
              // Run testConnection for debug info (helps diagnose configuration issues)
              const testResult = await marketplaceService.testConnection();
              updateDebugData({
                marketplaceTestConnection: testResult,
              });

              if (debugMode) {
                console.debug('[NFTDetailModal] Marketplace not configured:', {
                  endpointInfo,
                  testResult,
                });
              }

              // Skip all marketplace retrieval - we'll show "Marketplace data unavailable" in UI
            } else {
              // =========================================================
              // DUAL RETRIEVAL STRATEGY (PARALLELIZED)
              // 1. Fetch by token
              // 2. Fetch by wallet (for both viewerWallet AND currentOwner)
              // 3. Merge and dedupe all results
              // All three queries run in parallel for faster loading
              // =========================================================

              // Build fetch options for wallet queries
              const walletFetchOptions = {
                fromDate: new Date(acquiredAt.getTime() - 24 * 60 * 60 * 1000), // 24h before
                toDate: new Date(acquiredAt.getTime() + 24 * 60 * 60 * 1000),   // 24h after
                limit: 100,
              };

              // Execute all three queries in parallel
              const [tokenPurchases, viewerWalletPurchases, currentOwnerPurchases] = await Promise.all([
                // Strategy A: Fetch purchases for this specific token
                marketplaceService.getPurchasesForToken(tokenKey),
                // Strategy B: Fetch purchases for viewerWallet (user's wallet)
                viewerWalletLower
                  ? marketplaceService.getPurchasesForWallet(viewerWalletLower, walletFetchOptions)
                  : Promise.resolve([]),
                // Strategy C: Fetch purchases for currentOwner (if different from viewerWallet)
                (currentOwnerLower && currentOwnerLower !== viewerWalletLower)
                  ? marketplaceService.getPurchasesForWallet(currentOwnerLower, walletFetchOptions)
                  : Promise.resolve([]),
              ]);

              // Update counts
              tokenPurchasesCount = tokenPurchases.length;
              walletPurchasesCount_viewerWallet = viewerWalletPurchases.length;
              walletPurchasesCount_currentOwner = currentOwnerPurchases.length;

              // Calculate time ranges for viewer wallet purchases
              if (viewerWalletPurchases.length > 0) {
                const sorted = [...viewerWalletPurchases].sort(
                  (a, b) => new Date(a.purchaseDateIso).getTime() - new Date(b.purchaseDateIso).getTime()
                );
                walletPurchasesTimeRange_viewerWallet = {
                  min: sorted[0].purchaseDateIso,
                  max: sorted[sorted.length - 1].purchaseDateIso,
                };
              }

              // Calculate time ranges for current owner purchases
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
                console.debug('[NFTDetailModal] Parallel fetch results:', {
                  tokenPurchases: { tokenKey, count: tokenPurchasesCount },
                  viewerWallet: { wallet: viewerWalletLower, count: walletPurchasesCount_viewerWallet, timeRange: walletPurchasesTimeRange_viewerWallet },
                  currentOwner: { wallet: currentOwnerLower, count: walletPurchasesCount_currentOwner, timeRange: walletPurchasesTimeRange_currentOwner },
                });
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
        updateDebugData({
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
        });

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

        updateDebugData({
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
        });

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
          updateDebugData({
            refreshFinishedAtIso: new Date().toISOString(),
            refreshError: errorMessage,
            refreshResultSummary: `error: ${errorMessage.slice(0, 100)}`,
            refreshDecision: 'error',
          });
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

  const isLockedWeapon = useMemo(() => {
    if (!nft) return false;
    return isWeapon(nft) && isWeaponLocked(nft);
  }, [nft]);

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

  // Render via portal to document.body so the modal sits above all page content
  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop — solid dark overlay, no blur (blur causes mouse lag from GPU recompositing) */}
      <div
        className={`fixed inset-0 z-40 bg-black/80 transition-opacity duration-300 ${
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
            className={`relative w-full min-w-[432px] max-w-[440px] max-h-[85vh] bg-[var(--gs-dark-1)] rounded-2xl overflow-hidden flex flex-col transition-[opacity,transform] duration-300 ${
              isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
            } ${hasRelatedItems && relatedItemsExpanded ? 'rounded-r-none' : ''}`}
            style={{
              boxShadow: hasRelatedItems && relatedItemsExpanded ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
          {/* ===== 1) ModalHeader ===== */}
          <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.06]">
            <h2 className="font-display text-base font-semibold uppercase tracking-wide text-white">NFT Details</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-gray-400 hover:text-white transition p-1.5 -mr-1.5 rounded-lg hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-lime)]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--gs-dark-1)]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content Area - hidden scrollbar to prevent any width shift */}
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden overscroll-contain [-webkit-overflow-scrolling:touch] select-none">
            <div className="p-4 space-y-4">

              {/* ===== 2) IdentitySection ===== */}
              <div className="space-y-3 animate-[fade-in-up_0.4s_ease-out]">
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
                            isActive ? 'ring-1 opacity-100' : 'opacity-60 hover:opacity-80'
                          }`}
                          style={{
                            border: isActive ? `1px solid ${item.colors.border}` : `1px solid ${item.colors.primary}40`,
                            boxShadow: isActive ? `0 0 5px ${item.colors.border}` : 'none',
                          }}
                        >
                          {loadingDetails && isActive ? (
                            <div className="w-full h-full bg-[var(--gs-dark-2)] animate-pulse" />
                          ) : (
                            <NFTImage
                              src={nft.image}
                              alt={`${nft.name} #${item.mintNumber}`}
                              fill
                              className="object-cover"
                            />
                          )}
                          {/* Mint badge — rarity-colored text, transparent fill, colored border */}
                          <div
                            className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-caption font-semibold"
                            style={{
                              color: item.colors.primary,
                              backgroundColor: `${item.colors.primary}18`,
                              border: `1px solid ${item.colors.primary}60`,
                            }}
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
                        <div className="w-full h-full bg-[var(--gs-dark-2)] animate-pulse" />
                      ) : (
                        <NFTImage
                          src={nft.image}
                          alt={nft.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Metadata below image */}
                <div className="text-center">
                  <h3 className="font-display text-lg font-semibold uppercase tracking-wide text-white">{nft.name}</h3>
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
                  <p className="text-data text-white/60 mt-1">
                    Chain: {getChainDisplayName(nft.chain)}
                  </p>
                  {nft.typeSpec?.Item?.rarity && (
                    <TierBadge tier={getFunctionalTier(nft)} className="mt-2" />
                  )}
                  {/* Inline trait pills */}
                  <NFTDetailTraitPills
                    mintNumber={activeItem?.mintNumber}
                    rarity={activeItem?.rarity || filteredTraits['Rarity']}
                    rarityColor={sortedItems.length > 1 ? activeItem?.colors.primary : undefined}
                    itemClass={filteredTraits['Class']}
                    platform={filteredTraits['Platform']}
                  />
                </div>
              </div>

              {/* ===== 2.25) Quick Stats Row ===== */}
              {walletAddress && (
                <NFTDetailQuickStats
                  costBasisGun={costBasisGun}
                  costBasisUsd={currentPurchaseData?.purchasePriceUsd ?? currentPurchaseData?.decodeCostUsd ?? null}
                  marketValueGun={marketInputs.ref}
                  marketValueUsd={marketInputs.ref !== null && currentGunPrice ? marketInputs.ref * currentGunPrice : null}
                  unrealizedUsd={(() => {
                    const costUsd = currentPurchaseData?.purchasePriceUsd ?? currentPurchaseData?.decodeCostUsd ?? null;
                    const marketUsd = marketInputs.ref !== null && currentGunPrice ? marketInputs.ref * currentGunPrice : null;
                    if (costUsd === null || marketUsd === null) return null;
                    return marketUsd - costUsd;
                  })()}
                  unrealizedPct={(() => {
                    const costUsd = currentPurchaseData?.purchasePriceUsd ?? currentPurchaseData?.decodeCostUsd ?? null;
                    const marketUsd = marketInputs.ref !== null && currentGunPrice ? marketInputs.ref * currentGunPrice : null;
                    if (costUsd === null || marketUsd === null || costUsd <= 0) return null;
                    return ((marketUsd - costUsd) / costUsd) * 100;
                  })()}
                  isLoading={loadingDetails}
                />
              )}

              {/* ===== 2.5) YOUR POSITION Section ===== */}
              {walletAddress && (() => {
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
                    return { text: 'Decoded', style: 'bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]' };
                  }
                  if (acquisitionType === 'PURCHASE') {
                    return { text: 'Acquired', style: 'bg-[var(--gs-lime)]/20 text-[var(--gs-lime)]' };
                  }
                  if (acquisitionType === 'TRANSFER') {
                    return { text: 'Transferred', style: 'bg-white/10 text-white/60' };
                  }
                  return { text: 'DEBUG: UNKNOWN', style: 'bg-pink-500/20 text-pink-400' };
                };

                const statusPill = getStatusPill();

                // Unrealized line color
                const getUnrealizedColor = () => {
                  if (unrealizedUsd === null) return 'text-white/60';
                  if (unrealizedUsd > 0.01) return 'text-[var(--gs-lime)]';
                  if (unrealizedUsd < -0.01) return 'text-[var(--gs-loss)]';
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
                    className="rounded-xl p-4 animate-[fade-in-up_0.4s_ease-out_0.1s_both]"
                    style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}
                  >
                    {/* Header row: YOUR POSITION + Status pill */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                        Your Position
                      </p>
                      {/* Status pill */}
                      <span className={`text-caption font-semibold px-2 py-0.5 rounded-full ${statusPill.style}`}>
                        {statusPill.text}
                      </span>
                    </div>

                    {loadingDetails ? (
                      // Loading skeleton - brand shimmer
                      <div className="space-y-2">
                        <div className="h-8 w-28 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer" />
                        <div className="h-4 w-36 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.1s]" />
                        <div className="h-4 w-32 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.2s]" />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {/* Current USD value */}
                        <p className={`font-display text-[26px] font-bold tabular-nums ${currentValueUsd !== null ? 'text-white' : 'text-pink-400'}`}>
                          {currentValueUsd !== null
                            ? `$${currentValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'DEBUG: no USD value'}
                        </p>

                        {/* Cost basis in GUN */}
                        <p className={`text-[13px] ${costBasisGun !== null ? 'text-white/70' : 'text-pink-400'}`}>
                          Cost basis: {costBasisGun !== null
                            ? `${costBasisGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN`
                            : 'DEBUG: no cost data'}
                        </p>

                        {/* USD at acquisition */}
                        <p className={`text-[13px] ${costBasisUsdAtAcquisition !== null ? 'text-white/60' : 'text-pink-400'}`}>
                          {costBasisUsdAtAcquisition !== null
                            ? `At acquisition: $${costBasisUsdAtAcquisition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'DEBUG: no USD at acquisition'}
                        </p>

                        {/* Unrealized P&L */}
                        <p className={`text-[13px] ${formatUnrealized() ? getUnrealizedColor() : 'text-pink-400'}`}>
                          {formatUnrealized()
                            ? `Unrealized (GUN): ${formatUnrealized()}`
                            : 'DEBUG: no P&L data'}
                        </p>

                        {/* Explanation text */}
                        <p className="text-data text-white/60 mt-2 leading-relaxed">
                          Based on your acquisition cost (GUN) valued at today&apos;s GUN price.
                        </p>

                        {/* Acquisition Summary - always shown, DEBUG for missing */}
                        <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                          {/* Source */}
                          <div className="flex items-center justify-between">
                            <span className="text-data uppercase tracking-wider text-white/60">Source</span>
                            {currentPurchaseData?.acquisitionVenue && currentPurchaseData.acquisitionVenue !== 'unknown' ? (
                              <span className={`text-[13px] font-medium ${
                                currentPurchaseData.acquisitionVenue === 'opensea' ? 'text-blue-400' :
                                currentPurchaseData.acquisitionVenue === 'otg_marketplace' ? 'text-[var(--gs-purple)]' :
                                currentPurchaseData.acquisitionVenue === 'decode' || currentPurchaseData.acquisitionVenue === 'decoder' ? 'text-[var(--gs-lime)]' :
                                'text-white/90'
                              }`}>
                                {getVenueDisplayLabel(currentPurchaseData.acquisitionVenue, (currentPurchaseData.decodeCostGun ?? 0) > 0)}
                              </span>
                            ) : (
                              <span className="text-[13px] font-medium text-pink-400">DEBUG: no source</span>
                            )}
                          </div>
                          {/* Acquired date */}
                          <div className="flex items-center justify-between">
                            <span className="text-data uppercase tracking-wider text-white/60">Acquired</span>
                            {currentPurchaseData?.purchaseDate ? (
                              <span className="text-[13px] font-medium text-white/90 tabular-nums">
                                {formatDate(currentPurchaseData.purchaseDate)}
                              </span>
                            ) : (
                              <span className="text-[13px] font-medium text-pink-400">DEBUG: no date</span>
                            )}
                          </div>
                          {/* Transaction link */}
                          {(currentPurchaseData?.marketplaceTxHash || currentPurchaseData?.acquisitionTxHash || holdingAcquisitionRaw?.txHash) ? (
                            <div className="flex items-center justify-between">
                              <span className="text-data uppercase tracking-wider text-white/60">Transaction</span>
                              <a
                                href={gunzExplorerTxUrl(currentPurchaseData?.marketplaceTxHash || currentPurchaseData?.acquisitionTxHash || holdingAcquisitionRaw?.txHash || '')}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[13px] font-medium text-[var(--gs-lime)] hover:text-[var(--gs-purple)] transition inline-flex items-center gap-1"
                              >
                                View
                                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <span className="text-data uppercase tracking-wider text-white/60">Transaction</span>
                              <span className="text-[13px] font-medium text-pink-400">DEBUG: no tx hash</span>
                            </div>
                          )}
                        </div>
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
                      return 'bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20';
                    case 'DOWN':
                      return 'bg-[var(--gs-loss)]/10 text-[var(--gs-loss)] border border-[var(--gs-loss)]/20';
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
                      return <span className="text-caption">↗</span>;
                    case 'DOWN':
                      return <span className="text-caption">↘</span>;
                    case 'FLAT':
                      return <span className="text-caption">–</span>;
                    default:
                      return <span className="text-caption">•</span>;
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
                    className="rounded-xl p-4 animate-[fade-in-up_0.4s_ease-out_0.15s_both]"
                    style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}
                  >
                    {/* Header row: Market Reference + Position pill */}
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-mono text-caption font-normal uppercase tracking-[1.5px] text-[var(--gs-gray-3)]">
                        Market Reference
                      </p>
                      {/* Position pill */}
                      <div
                        role="status"
                        aria-label={`Position: ${getPositionPillText()}`}
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
                        <p className="font-display text-[22px] font-semibold text-white tabular-nums">
                          ≈ ${marketRef.usdValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'} USD
                        </p>
                        <p className="text-[13px] font-medium text-white/85">
                          ≈ {marketRef.gunValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                        </p>
                        {/* Unrealized P/L percent line */}
                        {positionLabel.pnlPct !== null && (
                          <p className={`text-xs ${
                            positionLabel.state === 'UP' ? 'text-[var(--gs-lime)]' :
                            positionLabel.state === 'DOWN' ? 'text-[var(--gs-loss)]' :
                            'text-white/70'
                          }`}>
                            Unrealized: {positionLabel.pnlPct >= 0 ? '+' : ''}{(positionLabel.pnlPct * 100).toFixed(1)}%
                          </p>
                        )}
                        {/* Data Quality - neutral styling, spread-based only */}
                        {positionLabel.dataQuality && (
                          <p
                            className="text-data text-white/60 mt-2 inline-flex items-center gap-1 cursor-help"
                            title="Based on observed price range only. Listings are sparse and may not reflect actual sale prices."
                          >
                            Data Quality:{' '}
                            <span className="capitalize">{positionLabel.dataQuality}</span>
                            <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </p>
                        )}
                      </div>
                    ) : (
                      // No market data state
                      <div className="space-y-1">
                        <p className="text-base font-medium text-white/85">No active listings found</p>
                        <p className="text-xs text-white/60">
                          This is an illiquid market; reference values may be unavailable.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ===== 4) MarketReferenceSection (Observed Range Visualization) ===== */}
              <div className="animate-[fade-in-up_0.4s_ease-out_0.2s_both]">
                <NFTDetailObservedMarketRange
                  show={!!walletAddress}
                  loading={loadingDetails}
                  marketInputs={marketInputs}
                  costBasisGun={costBasisGun}
                  getPositionOnRange={getPositionOnRange}
                  listingsStatus={listingsStatusByTokenId[debugData.tokenKey ?? ''] ?? 'idle'}
                  listingsError={listingsErrorByTokenId[debugData.tokenKey ?? ''] ?? null}
                />
              </div>


              {/* Locked Weapon Indicator */}
              {isLockedWeapon && (
                <div className="mt-4">
                  <LockedWeaponIndicator />
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
                onCopyDebugData={() => handleCopyDebugData({
                  nft,
                  activeTokenId: activeItem?.tokenId,
                  currentPurchaseData,
                  currentResolvedAcquisition,
                  holdingAcquisitionRaw,
                  currentGunPrice,
                  listingsData,
                })}
                toIsoStringSafe={toIsoStringSafe}
              />
            </div>
          </div>

          {/* ===== 6) ModalFooter ===== */}
          <div className="h-14 flex-shrink-0 flex items-center justify-center px-4 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="w-full h-10 bg-white/10 hover:bg-white/15 text-white font-medium rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gs-lime)]/50"
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
                className="text-label font-bold tracking-widest uppercase text-gray-500 group-hover:text-[#64ffff] transition-colors whitespace-nowrap"
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
              <span className="absolute -top-2 -right-1 w-5 h-5 bg-[#64ffff] text-black text-caption font-bold rounded-full flex items-center justify-center">
                {relatedItems.length}
              </span>
            </button>
          )}

          {/* ===== Weapon Lab Panel ===== */}
          {hasRelatedItems && (
            <div
              className={`relative max-h-[85vh] bg-[var(--gs-dark-1)] rounded-r-2xl overflow-hidden flex flex-col transform transition-all duration-300 origin-left ${
                relatedItemsExpanded
                  ? 'w-[320px] opacity-100 scale-x-100'
                  : 'w-0 opacity-0 scale-x-0'
              }`}
              style={{
                boxShadow: relatedItemsExpanded ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : 'none',
              }}
            >
              {/* Panel Header */}
              <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Weapon Lab
                  </h3>
                  <span className="font-mono text-[8px] uppercase tracking-widest px-1 py-0.5 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30 bg-[var(--gs-purple)]/[0.06]">
                    Experimental
                  </span>
                </div>
                <button
                  onClick={() => setRelatedItemsExpanded(false)}
                  className="text-gray-400 hover:text-white transition p-1 rounded hover:bg-white/5 flex items-center gap-1 text-xs"
                  title="Exit Armory"
                >
                  <span className="text-caption text-gray-500">Exit Armory</span>
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
                            <NFTImage
                              src={item.image}
                              alt={item.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Item Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" title={item.name}>
                              {item.name}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span
                                className="text-caption font-semibold uppercase"
                                style={{ color: itemColors.primary }}
                              >
                                {itemRarity}
                              </span>
                              <span className="text-caption text-gray-500">
                                {itemClass === 'Weapon Skin' ? 'Skin' : itemClass}
                              </span>
                            </div>
                          </div>

                          {/* Quantity Badge */}
                          {quantity > 1 && (
                            <div
                              className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold"
                              style={{
                                color: '#96aaff',
                                backgroundColor: 'rgba(150, 170, 255, 0.09)',
                                border: '1px solid rgba(150, 170, 255, 0.38)',
                              }}
                            >
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
                  <p className="text-caption text-gray-500 mb-3">
                    Configure, upgrade, and prototype weapons
                  </p>
                  <div className="flex items-center justify-center py-6 text-gray-600 text-xs">
                    <span className="text-center">Coming soon</span>
                  </div>
                </div>
              </div>

              {/* Panel Footer with summary */}
              <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.06] text-xs text-gray-500">
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

    </>,
    document.body
  );
}
