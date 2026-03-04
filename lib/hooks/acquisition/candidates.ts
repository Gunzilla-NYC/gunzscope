import { AcquisitionVenue } from '@/lib/types';
import { NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';
import { AcquisitionType, ResolvedAcquisition } from './types';

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
export function scoreAcquisitionCandidate(candidate: Partial<ResolvedAcquisition>): { score: number; reasons: string[] } {
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
export function buildCandidateFromHoldingRaw(
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
export function buildCandidateFromCache(
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
export function buildCandidateFromTransfer(
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
export function selectBestAcquisition(
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
export function mergeAcquisitionIfBetter(
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
