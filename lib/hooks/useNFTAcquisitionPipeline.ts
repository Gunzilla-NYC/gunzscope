'use client';

import { useState, useEffect, useRef } from 'react';
import { NFT, MarketplacePurchase, AcquisitionVenue } from '@/lib/types';
import { AvalancheService, NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';
import { usePortfolioConnectedWallets } from '@/lib/contexts/PortfolioContext';
import { OpenSeaService } from '@/lib/api/opensea';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { resolveHistoricalGunPrice } from '@/lib/pricing/resolveHistoricalGunPrice';
import {
  FetchStatus,
  TOKEN_MAP_SOFT_CAP,
  isAbortError,
  FIFOKeyTracker,
} from '@/lib/nft/nftDetailHelpers';
import {
  buildTokenKey,
  buildNftDetailCacheKey,
  getCachedNFTDetail,
  setCachedNFTDetail,
} from '@/lib/utils/nftCache';
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

  // For transfers, use senderCostGun (the sender's original purchase price) if available.
  // When using sender data, also use their original date and mark as PURCHASE (they paid).
  const usingSenderData = holding.venue === 'transfer'
    && (!holding.costGun || holding.costGun <= 0)
    && (holding.senderCostGun != null && holding.senderCostGun > 0);

  const costGun = usingSenderData
    ? holding.senderCostGun!
    : (holding.costGun && holding.costGun > 0 ? holding.costGun : (holding.costGun ?? null));

  // When using sender data, use their original purchase date (not the transfer date)
  const acquiredAt = usingSenderData
    ? (holding.senderAcquiredAtIso ?? holding.acquiredAtIso ?? null)
    : (holding.acquiredAtIso ?? null);

  // When using sender data, this was originally a PURCHASE (not a free transfer)
  const finalAcquisitionType = usingSenderData ? 'PURCHASE' as AcquisitionType : acquisitionType;

  // costUsd is intentionally null here — this candidate only has on-chain GUN data.
  // Historical USD is computed by the pipeline via CoinGecko lookups in candidateFromFresh.
  // Using today's GUN price here would overwrite the correct historical cost basis.

  return {
    acquisitionType: finalAcquisitionType,
    venue: usingSenderData ? (holding.senderVenue ?? holding.venue ?? null) : (holding.venue ?? null),
    acquiredAt,
    costGun,
    costUsd: null,
    txFeeGun: holding.txFeeGun ?? null,
    senderTxFeeGun: usingSenderData ? (holding.senderTxFeeGun ?? null) : null,
    txHash: usingSenderData ? (holding.senderTxHash ?? holding.txHash ?? null) : (holding.txHash ?? null),
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
        txFeeGun: candidate.txFeeGun ?? null,
        senderTxFeeGun: candidate.senderTxFeeGun ?? null,
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
    txFeeGun: null,
    senderTxFeeGun: null,
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

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for the NFTDetailModal acquisition pipeline.
 * Manages acquisition data fetching, caching, marketplace matching,
 * and resolved acquisition scoring.
 */
export function useNFTAcquisitionPipeline(
  nft: NFT | null,
  activeItem: ItemData | undefined,
  isOpen: boolean,
  options: UseNFTAcquisitionPipelineOptions,
): UseNFTAcquisitionPipelineResult {
  const { walletAddress, debugMode, noCacheMode, currentGunPrice, updateDebugData } = options;
  const connectedWallets = usePortfolioConnectedWallets();

  // =========================================================================
  // State
  // =========================================================================
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [itemPurchaseData, setItemPurchaseData] = useState<Record<string, AcquisitionData>>({});
  const [resolvedAcquisitions, setResolvedAcquisitions] = useState<Record<string, ResolvedAcquisition>>({});
  const [listingsByTokenId, setListingsByTokenId] = useState<Record<string, {
    lowest?: number;
    highest?: number;
    average?: number;
  } | null>>({});
  const [holdingAcquisitionRawByTokenId, setHoldingAcquisitionRawByTokenId] = useState<Record<string, NFTHoldingAcquisition | null>>({});
  const [listingsStatusByTokenId, setListingsStatusByTokenId] = useState<Record<string, FetchStatus>>({});
  const [listingsErrorByTokenId, setListingsErrorByTokenId] = useState<Record<string, string | null>>({});
  const [holdingAcqStatusByTokenId, setHoldingAcqStatusByTokenId] = useState<Record<string, FetchStatus>>({});
  const [holdingAcqErrorByTokenId, setHoldingAcqErrorByTokenId] = useState<Record<string, string | null>>({});

  // =========================================================================
  // Refs
  // =========================================================================
  // Ref mirroring resolvedAcquisitions for stale-closure protection in async callbacks.
  const resolvedAcquisitionsRef = useRef(resolvedAcquisitions);
  resolvedAcquisitionsRef.current = resolvedAcquisitions;

  const fetchStateRef = useRef<{
    lastFetchedTokenKey: string | null;
    lastFetchTimestamp: number;
    fetchInProgress: boolean;
  }>({
    lastFetchedTokenKey: null,
    lastFetchTimestamp: 0,
    fetchInProgress: false,
  });
  const STALE_THRESHOLD_MS = 10 * 60 * 1000;
  const abortControllersRef = useRef<Record<string, AbortController | undefined>>({});
  const listingsKeyTrackerRef = useRef(new FIFOKeyTracker(TOKEN_MAP_SOFT_CAP));
  const holdingAcqKeyTrackerRef = useRef(new FIFOKeyTracker(TOKEN_MAP_SOFT_CAP));
  const isMountedRef = useRef(true);

  // =========================================================================
  // Cleanup effect
  // =========================================================================
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      Object.values(abortControllersRef.current).forEach(controller => controller?.abort());
      abortControllersRef.current = {};
    };
  }, []);

  // =========================================================================
  // Reset effect — resets all pipeline state when modal opens
  // =========================================================================
  useEffect(() => {
    if (isOpen) {
      Object.values(abortControllersRef.current).forEach(controller => controller?.abort());
      abortControllersRef.current = {};
      setItemPurchaseData({});
      setResolvedAcquisitions({});
      setListingsByTokenId({});
      setHoldingAcquisitionRawByTokenId({});
      setListingsStatusByTokenId({});
      setListingsErrorByTokenId({});
      setHoldingAcqStatusByTokenId({});
      setHoldingAcqErrorByTokenId({});
      listingsKeyTrackerRef.current.reset();
      holdingAcqKeyTrackerRef.current.reset();
      fetchStateRef.current = {
        lastFetchedTokenKey: null,
        lastFetchTimestamp: 0,
        fetchInProgress: false,
      };
    }
  }, [isOpen]);

  // =========================================================================
  // Derived values (before effect — captured in effect closure)
  // =========================================================================
  const listingsData = activeItem ? listingsByTokenId[activeItem.tokenId] ?? null : null;
  const holdingAcquisitionRaw = activeItem ? holdingAcquisitionRawByTokenId[activeItem.tokenId] ?? null : null;

  // =========================================================================
  // Monolithic acquisition pipeline effect
  // =========================================================================
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
      return;
    }

    // For same token: only refresh if stale (unless noCache mode forces refresh)
    if (isSameToken && !isStale && !noCacheMode && itemPurchaseData[tokenId]) {
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

        // Offer fill detection
        isOfferFill: cachedData.isOfferFill,
      };

      setItemPurchaseData(prev => ({
        ...prev,
        [tokenId]: restoredAcquisition,
      }));

      // Patch up missing USD: if GUN price is known but USD isn't, resolve via waterfall
      // This fires asynchronously and updates state when ready (non-blocking)
      if (cachedData.purchasePriceGun && cachedData.purchasePriceGun > 0 && !cachedData.purchasePriceUsd) {
        const priceDate = cachedData.purchaseDate ? new Date(cachedData.purchaseDate) : undefined;
        if (priceDate) {
          resolveHistoricalGunPrice(priceDate).then(result => {
            if (result) {
              const usd = cachedData.purchasePriceGun! * result.rate;
              setItemPurchaseData(prev => ({
                ...prev,
                [tokenId]: { ...prev[tokenId], purchasePriceUsd: usd },
              }));
            }
          }).catch(() => { /* non-blocking */ });
        }
      }

      // CRITICAL: Build resolvedAcquisition from cache immediately so UI doesn't show null
      // This ensures the modal shows correct acquisition data before background refresh completes
      const candidateFromCacheImmediate = buildCandidateFromCache(cachedData);
      if (candidateFromCacheImmediate) {
        const resolvedFromCache = selectBestAcquisition([candidateFromCacheImmediate]);
        // Update BOTH state and ref — ref is needed because the async loadItemDetails
        // runs before React re-renders, so the closure-captured state is stale.
        resolvedAcquisitionsRef.current = { ...resolvedAcquisitionsRef.current, [tokenId]: resolvedFromCache };
        setResolvedAcquisitions(prev => ({
          ...prev,
          [tokenId]: resolvedFromCache,
        }));
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

      try {
        const avalancheService = new AvalancheService();
        const openSeaService = new OpenSeaService();

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
          return;
        }

        // Async safety: check if still mounted and token hasn't changed
        if (!isMountedRef.current || activeItem?.tokenId !== tokenId) {
          return;
        }

        // HARDENING: FIFO eviction for holdingAcquisitionRaw map
        const holdingKeysToEvict = holdingAcqKeyTrackerRef.current.track(tokenId);

        // Store raw acquisition result for debug panel (per-token, prevents cross-token leakage)
        setHoldingAcquisitionRawByTokenId(prev => {
          const next = { ...prev, [tokenId]: acquisition };
          // Remove evicted keys
          holdingKeysToEvict.forEach(key => delete next[key]);
          return next;
        });

        // HARDENING: Update acquisition status to success
        setHoldingAcqStatusByTokenId(prev => ({ ...prev, [tokenId]: 'success' }));

        // Extract acquisition-derived fields
        const hasAcquisitionData = acquisition !== null && acquisition.owned;
        const acquiredAt = acquisition?.acquiredAtIso ? new Date(acquisition.acquiredAtIso) : undefined;
        const fromAddress = acquisition?.fromAddress;
        const acquisitionVenue = acquisition?.venue;
        const acquisitionTxHash = acquisition?.txHash;
        const costGunFromChain = acquisition?.costGun ?? 0;

        // Diagnostic: always log transfer acquisition results
        if (acquisitionVenue === 'transfer') {
          console.warn(`[DetailModal] Transfer acquisition for tokenId=${tokenId}:`, {
            costGun: acquisition?.costGun,
            senderCostGun: acquisition?.senderCostGun,
            fromAddress,
            senderVenue: acquisition?.senderVenue,
            isNull: acquisition === null,
          });
        }

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
              return;
            }

            const lowest = listings.lowest ?? undefined;
            const highest = listings.highest ?? undefined;
            const average = lowest !== undefined && highest !== undefined
              ? (lowest + highest) / 2
              : lowest ?? highest;

            marketplaceMatchCount = (lowest !== undefined ? 1 : 0) + (highest !== undefined ? 1 : 0);

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
                  const priceResult = await resolveHistoricalGunPrice(purchaseDate);
                  if (priceResult) {
                    purchasePriceUsd = purchasePriceGun * priceResult.rate;
                  }
                } catch (priceError) {
                  console.warn('[NFTDetailModal] Failed to get historical GUN price:', priceError);
                }
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
        // STEP 3.5: OpenSea sale price cross-check / fallback
        // For offer fills: always query as cross-check (wGUN on-chain extraction
        // can be inaccurate in batch fulfillments). For regular purchases: only
        // query when on-chain returned 0. For transfers: trace original purchase.
        // =====================================================================
        let openSeaSalePriceGun: number | undefined;
        let openSeaSaleDate: Date | undefined;

        const isOfferFillAcquisition = acquisition?.isOfferFill === true;
        // Always cross-check with OpenSea API for OpenSea purchases.
        // On-chain tx.value can be a batch total (multiple items in one tx),
        // while the API returns per-item prices. The safety net in the price
        // determination section compares both to detect batch overcounting.
        const needsOpenSeaFallback = hasTransferData && (
          (acquisitionVenue === 'opensea') ||
          (acquisitionVenue === 'transfer' && fromAddress && costGunFromChain === 0)
        );

        if (needsOpenSeaFallback) {
          try {
            const saleTokenId = activeItem?.tokenId || '';

            // HARDENING: Check for abort signal before network call
            if (!abortController.signal.aborted) {
              const saleEvents = await openSeaService.getSaleEvents(nftContractAddress, saleTokenId, 'avalanche');

              // HARDENING: Check abort signal after network call
              if (!abortController.signal.aborted && saleEvents && saleEvents.length > 0) {
                // For OpenSea purchases: match by buyer = current wallet
                // For transfers: match by buyer = sender (previous owner)
                const matchAddress = acquisitionVenue === 'opensea'
                  ? walletAddress?.toLowerCase()
                  : fromAddress?.toLowerCase();

                if (matchAddress) {
                  const matchingSale = saleEvents.find(sale =>
                    sale.buyerAddress?.toLowerCase() === matchAddress
                  );
                  if (matchingSale) {
                    const effectivePrice = matchingSale.priceGUN > 0
                      ? matchingSale.priceGUN : matchingSale.priceWGUN;
                    if (effectivePrice > 0) {
                      openSeaSalePriceGun = effectivePrice;
                      openSeaSaleDate = matchingSale.eventTimestamp
                        ? new Date(matchingSale.eventTimestamp) : undefined;

                    }
                  }
                }
              }
            }
          } catch (openSeaSaleError) {
            // Always log — silent failures hide root cause of "—" cost basis
            console.warn('[NFTDetailModal] OpenSea sale fallback failed:', openSeaSaleError);
          }
        }

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
        let finalTransferType: 'self' | 'gift' | undefined;
        let finalAcquisitionType: AcquisitionType;
        let lastPriceConfidence: 'exact' | 'daily' | 'estimated' | undefined;
        let lastPriceSource: 'cache' | 'coingecko' | 'defillama' | 'estimated' | undefined;

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
              const priceResult = await resolveHistoricalGunPrice(finalPurchaseDate);
              if (priceResult) {
                finalDecodeCostUsd = finalDecodeCostGun * priceResult.rate;
                lastPriceConfidence = priceResult.confidence;
                lastPriceSource = priceResult.source;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for decode cost:', priceError);
            }
          }

        } else if (acquisitionVenue === 'opensea') {
          // B) OPENSEA PURCHASE: Marketplace purchase with RPC cost, or OpenSea sales API fallback
          derivedPriceSource = 'onchain';
          finalAcquisitionType = 'PURCHASE';
          // Price priority for OpenSea purchases:
          // 1. OpenSea sales API (per-item authoritative)
          // 2. Enrichment data from gallery (per-item, from orchestrator)
          // 3. On-chain cost (may be batch total for multi-item Seaport txs)
          const enrichmentPriceGun = nft?.purchasePriceGun && nft.purchasePriceGun > 0
            ? nft.purchasePriceGun : undefined;
          finalPurchasePriceGun = openSeaSalePriceGun ?? enrichmentPriceGun
            ?? (costGunFromChain > 0 ? costGunFromChain : undefined);
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // OpenSea purchases have marketplace tx hash
          finalMarketplaceTxHash = acquisitionTxHash ?? undefined;
          finalIsFreeTransfer = false;

          // Calculate USD from historical GUN price
          if (finalPurchasePriceGun && finalPurchaseDate) {
            try {
              const priceResult = await resolveHistoricalGunPrice(finalPurchaseDate);
              if (priceResult) {
                finalPurchasePriceUsd = finalPurchasePriceGun * priceResult.rate;
                lastPriceConfidence = priceResult.confidence;
                lastPriceSource = priceResult.source;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for OpenSea purchase:', priceError);
            }
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
              const priceResult = await resolveHistoricalGunPrice(finalPurchaseDate);
              if (priceResult) {
                finalPurchasePriceUsd = finalPurchasePriceGun * priceResult.rate;
                lastPriceConfidence = priceResult.confidence;
                lastPriceSource = priceResult.source;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for in-game marketplace purchase:', priceError);
            }
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
              const priceResult = await resolveHistoricalGunPrice(finalPurchaseDate);
              if (priceResult) {
                finalPurchasePriceUsd = finalPurchasePriceGun * priceResult.rate;
                lastPriceConfidence = priceResult.confidence;
                lastPriceSource = priceResult.source;
              }
            } catch (priceError) {
              console.warn('[NFTDetailModal] Failed to get historical GUN price for OTG marketplace purchase:', priceError);
            }
          }

        } else if (acquisitionVenue === 'transfer') {
          // E) TRANSFER: Check if we found original purchase price via OpenSea
          finalAcquisitionType = 'TRANSFER';
          finalDecodeCostGun = undefined;
          finalDecodeCostUsd = undefined;
          finalPurchaseDate = acquiredAt;
          // Transfers have NO marketplace tx hash - only acquisitionTxHash
          finalMarketplaceTxHash = undefined;

          // Classify: self-transfer (own wallet) vs gift (external sender)
          const senderLower = fromAddress?.toLowerCase();
          const isSelfTransfer = senderLower
            ? connectedWallets.some(w => w === senderLower)
            : false;
          finalTransferType = isSelfTransfer ? 'self' : 'gift';

          if (openSeaSalePriceGun !== undefined) {
            // Found original purchase price via OpenSea sales API (cross-wallet transfer)
            derivedPriceSource = 'onchain';
            finalPurchasePriceGun = openSeaSalePriceGun;
            finalIsFreeTransfer = false;
            // Use ORIGINAL purchase date (when sender bought it), not the transfer date
            finalPurchaseDate = openSeaSaleDate ?? acquiredAt;

            // Calculate USD from historical GUN price at original purchase date
            const priceDate = openSeaSaleDate ?? acquiredAt;
            if (finalPurchasePriceGun && priceDate) {
              try {
                const priceResult = await resolveHistoricalGunPrice(priceDate);
                if (priceResult) {
                  finalPurchasePriceUsd = finalPurchasePriceGun * priceResult.rate;
                  lastPriceConfidence = priceResult.confidence;
                  lastPriceSource = priceResult.source;
                }
              } catch (priceError) {
                console.warn('[NFTDetailModal] Failed to get historical GUN price for transfer:', priceError);
              }
            }
          } else if (costGunFromChain > 0) {
            // On-chain cost found (e.g. wGUN payment in a cross-wallet transfer)
            // but no OpenSea sale match — use the chain-extracted cost
            derivedPriceSource = 'onchain';
            finalPurchasePriceGun = costGunFromChain;
            finalIsFreeTransfer = false;

            // Calculate USD from historical GUN price at transfer date
            if (acquiredAt) {
              try {
                const priceResult = await resolveHistoricalGunPrice(acquiredAt);
                if (priceResult) {
                  finalPurchasePriceUsd = finalPurchasePriceGun * priceResult.rate;
                  lastPriceConfidence = priceResult.confidence;
                  lastPriceSource = priceResult.source;
                }
              } catch (priceError) {
                console.warn('[NFTDetailModal] Failed to get historical GUN price for transfer with chain cost:', priceError);
              }
            }
          } else if (acquisition?.senderCostGun && acquisition.senderCostGun > 0) {
            // Sender cost from RPC chain tracing — the sender's original purchase price.
            // Covers cases where OpenSea API didn't return data but the RPC successfully
            // traced the sender's purchase transaction (e.g., cross-wallet transfers).
            derivedPriceSource = 'onchain';
            finalPurchasePriceGun = acquisition.senderCostGun;
            finalIsFreeTransfer = false;
            // Use sender's original purchase date if available
            finalPurchaseDate = acquisition.senderAcquiredAtIso
              ? new Date(acquisition.senderAcquiredAtIso)
              : acquiredAt;

            // Calculate USD from historical GUN price at sender's purchase date
            const senderPriceDate = finalPurchaseDate ?? acquiredAt;
            if (senderPriceDate) {
              try {
                const priceResult = await resolveHistoricalGunPrice(senderPriceDate);
                if (priceResult) {
                  finalPurchasePriceUsd = finalPurchasePriceGun * priceResult.rate;
                  lastPriceConfidence = priceResult.confidence;
                  lastPriceSource = priceResult.source;
                }
              } catch (priceError) {
                console.warn('[NFTDetailModal] Failed to get historical GUN price for sender cost:', priceError);
              }
            }
          } else {
            // No original purchase price found — genuine free transfer
            derivedPriceSource = 'transfers';
            finalPurchasePriceGun = undefined;
            finalPurchasePriceUsd = undefined;
            finalIsFreeTransfer = true;
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

        }

        // Universal fallback: if we have a GUN cost but no USD value,
        // calculate it from the historical GUN price at acquisition date.
        // Covers: transfers with traced original purchase, cached data missing USD, etc.
        if (finalPurchasePriceGun !== undefined && finalPurchasePriceGun > 0 && finalPurchasePriceUsd === undefined) {
          const priceDate = finalPurchaseDate ?? acquiredAt;
          if (priceDate) {
            try {
              const priceResult = await resolveHistoricalGunPrice(priceDate);
              if (priceResult) {
                finalPurchasePriceUsd = finalPurchasePriceGun * priceResult.rate;
                lastPriceConfidence = priceResult.confidence;
                lastPriceSource = priceResult.source;
              }
            } catch {
              // Non-blocking — USD value will remain undefined
            }
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

          // Offer fill detection
          isOfferFill: acquisition?.isOfferFill,

          // Historical price resolution metadata
          priceConfidence: lastPriceConfidence,
          historicalPriceSource: lastPriceSource,

          // Legacy compatibility
          transferredFrom: (hasTransferData && finalAcquisitionType === 'TRANSFER') ? fromAddress : undefined,
          isFreeTransfer: finalIsFreeTransfer,
          transferType: finalTransferType,
        };

        // =====================================================================
        // RESOLVED ACQUISITION: Build candidates and select best (no downgrades)
        // =====================================================================

        // Build candidates from all available sources
        const candidateFromHolding = buildCandidateFromHoldingRaw(acquisition);

        // Build candidate from the fresh acquisition data we just constructed
        const candidateFromFresh: Partial<ResolvedAcquisition> = {
          acquisitionType: finalAcquisitionType,
          venue: acquisitionVenue ?? null,
          acquiredAt: acquiredAt?.toISOString() ?? null,
          costGun: finalPurchasePriceGun ?? finalDecodeCostGun ?? null,
          costUsd: finalPurchasePriceUsd ?? finalDecodeCostUsd ?? null,
          txFeeGun: acquisition?.txFeeGun ?? null,
          senderTxFeeGun: acquisition?.senderTxFeeGun ?? null,
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

        // Merge with existing resolved acquisition (prevent downgrades)
        // Read from REF (not closure) to get the latest state including cache render
        const existingResolved = resolvedAcquisitionsRef.current[tokenId] ?? null;
        const { result: finalResolved, wasUpdated: resolvedWasUpdated, reason: mergeReason } =
          mergeAcquisitionIfBetter(existingResolved, newResolved);

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
            transferType: freshAcquisition.transferType,
            acquisitionVenue: acquisitionVenue,
            acquisitionTxHash: acquisitionTxHash ?? undefined,
            isOfferFill: freshAcquisition.isOfferFill,
          });

        }
      } catch (error) {
        // HARDENING: Silent exit on AbortError (user switched tokens or modal closed)
        if (isAbortError(error)) {
          return;
        }

        // HARDENING: Check abort signal in catch block
        if (abortController.signal.aborted) {
          return;
        }

        // HARDENING: Async safety - skip state update if unmounted or token changed
        if (!isMountedRef.current || activeItem?.tokenId !== tokenId) {
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

  // =========================================================================
  // Derived values (after effect)
  // =========================================================================
  const currentPurchaseData = activeItem ? itemPurchaseData[activeItem.tokenId] : undefined;
  const currentResolvedAcquisition = activeItem ? resolvedAcquisitions[activeItem.tokenId] : undefined;

  return {
    loadingDetails,
    currentPurchaseData,
    currentResolvedAcquisition,
    holdingAcquisitionRaw,
    listingsData,
    itemPurchaseData,
    resolvedAcquisitions,
    listingsStatusByTokenId,
    listingsErrorByTokenId,
    holdingAcqStatusByTokenId,
    holdingAcqErrorByTokenId,
  };
}
