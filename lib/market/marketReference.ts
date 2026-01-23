/**
 * Market Reference Calculation Module
 *
 * Computes market reference values from listing data with quality scoring.
 * Premium v1: Uses both spread ratio AND listing count for quality.
 */

// Quality levels for market reference data
export type MarketDataQuality = 'strong' | 'fair' | 'limited';

// Method used to compute market reference
export type MarketRefMethod = 'midpoint' | 'single_bound' | 'none';

// Result of market reference computation
export interface MarketReferenceResult {
  /** Computed market reference in GUN (null if no data) */
  refGun: number | null;
  /** Low bound from listings (null if unavailable) */
  lowGun: number | null;
  /** High bound from listings (null if unavailable) */
  highGun: number | null;
  /** Method used to compute reference */
  method: MarketRefMethod;
  /** Data quality level (null if no market data) */
  quality: MarketDataQuality | null;
  /** Human-readable explanation of quality score */
  qualityReason?: string;
}

// Input for market reference computation
export interface ComputeMarketReferenceInput {
  listingLow: number | null | undefined;
  listingHigh: number | null | undefined;
  listingCount?: number | null | undefined;
}

/**
 * Compute market reference from listing data.
 *
 * Rules:
 * - If both low & high exist: ref = midpoint, method='midpoint'
 * - If only one exists: ref = that value, method='single_bound'
 * - If none: ref=null, method='none'
 *
 * Quality scoring (premium v1):
 * - Uses BOTH spread ratio AND listing count when available
 * - spread ratio = (high-low) / max(low, epsilon)
 * - strong: spread <= 25% AND listingCount >= 5
 * - fair:   spread <= 60% AND listingCount >= 2
 * - limited: otherwise (including listingCount < 2)
 * - If listingCount is missing, falls back to spread-only with qualityReason
 */
export function computeMarketReference(
  input: ComputeMarketReferenceInput
): MarketReferenceResult {
  const { listingLow, listingHigh, listingCount } = input;
  const epsilon = 1e-9;

  // Normalize inputs
  const hasLow =
    listingLow !== null &&
    listingLow !== undefined &&
    !isNaN(listingLow) &&
    listingLow >= 0;
  const hasHigh =
    listingHigh !== null &&
    listingHigh !== undefined &&
    !isNaN(listingHigh) &&
    listingHigh >= 0;
  const hasCount =
    listingCount !== null &&
    listingCount !== undefined &&
    !isNaN(listingCount);

  const lowGun = hasLow ? listingLow : null;
  const highGun = hasHigh ? listingHigh : null;

  // No data case
  if (!hasLow && !hasHigh) {
    return {
      refGun: null,
      lowGun: null,
      highGun: null,
      method: 'none',
      quality: null,
      qualityReason: undefined,
    };
  }

  // Compute reference value
  let refGun: number;
  let method: MarketRefMethod;

  if (hasLow && hasHigh) {
    refGun = (listingLow! + listingHigh!) / 2;
    method = 'midpoint';
  } else if (hasLow) {
    refGun = listingLow!;
    method = 'single_bound';
  } else {
    refGun = listingHigh!;
    method = 'single_bound';
  }

  // Compute quality
  let quality: MarketDataQuality;
  let qualityReason: string;

  if (hasLow && hasHigh) {
    // We have both bounds - can compute spread
    const spreadRatio =
      (listingHigh! - listingLow!) / Math.max(listingLow!, epsilon);
    const spreadPct = Math.round(spreadRatio * 100);

    if (hasCount) {
      // Premium quality scoring with listing count
      if (spreadRatio <= 0.25 && listingCount! >= 5) {
        quality = 'strong';
        qualityReason = `Tight spread (${spreadPct}%) with ${listingCount} listings`;
      } else if (spreadRatio <= 0.60 && listingCount! >= 2) {
        quality = 'fair';
        qualityReason = `Moderate spread (${spreadPct}%) with ${listingCount} listings`;
      } else {
        quality = 'limited';
        if (listingCount! < 2) {
          qualityReason = `Only ${listingCount} listing${listingCount === 1 ? '' : 's'} (${spreadPct}% spread)`;
        } else {
          qualityReason = `Wide spread (${spreadPct}%) across ${listingCount} listings`;
        }
      }
    } else {
      // Fallback: spread-only quality (listing count unknown)
      if (spreadRatio <= 0.25) {
        quality = 'strong';
        qualityReason = `Tight spread (${spreadPct}%); listing count unknown`;
      } else if (spreadRatio <= 0.60) {
        quality = 'fair';
        qualityReason = `Moderate spread (${spreadPct}%); listing count unknown`;
      } else {
        quality = 'limited';
        qualityReason = `Wide spread (${spreadPct}%); listing count unknown`;
      }
    }
  } else {
    // Single bound only - limited quality
    quality = 'limited';
    qualityReason = hasCount
      ? `Single ${hasLow ? 'low' : 'high'} bound only (${listingCount} listing${listingCount === 1 ? '' : 's'})`
      : `Single ${hasLow ? 'low' : 'high'} bound only`;
  }

  return {
    refGun,
    lowGun,
    highGun,
    method,
    quality,
    qualityReason,
  };
}

/**
 * Cost basis source types for position calculation
 */
export type CostBasisSource = 'purchase' | 'decode' | 'none';

/**
 * Determine cost basis from acquisition data.
 *
 * Priority:
 * 1. purchasePriceGun if exists and > 0
 * 2. decodeCostGun if exists and > 0
 * 3. null (no cost basis - free transfer or unknown)
 */
export function determineCostBasis(input: {
  purchasePriceGun?: number | null;
  decodeCostGun?: number | null;
  isFreeTransfer?: boolean;
}): { costBasisGun: number | null; source: CostBasisSource } {
  const { purchasePriceGun, decodeCostGun, isFreeTransfer } = input;

  // Check purchase price first
  if (
    purchasePriceGun !== null &&
    purchasePriceGun !== undefined &&
    !isNaN(purchasePriceGun) &&
    purchasePriceGun > 0
  ) {
    return { costBasisGun: purchasePriceGun, source: 'purchase' };
  }

  // Check decode cost second
  if (
    decodeCostGun !== null &&
    decodeCostGun !== undefined &&
    !isNaN(decodeCostGun) &&
    decodeCostGun > 0
  ) {
    return { costBasisGun: decodeCostGun, source: 'decode' };
  }

  // No cost basis (free transfer or unknown)
  return { costBasisGun: null, source: 'none' };
}

/**
 * Format relative time from a date (e.g., "2 min ago", "1 hr ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'Unknown';

  const now = Date.now();
  const then = typeof date === 'string' ? new Date(date).getTime() : date.getTime();

  if (isNaN(then)) return 'Unknown';

  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr${diffHr > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;

  // Older than a week - show date
  const d = new Date(then);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// Position Label Computation
// ============================================================================

/** Position states for P/L display */
export type PositionState = 'UP' | 'DOWN' | 'FLAT' | 'NO_COST_BASIS' | 'NO_MARKET_REF';

/** Result of position label computation */
export interface PositionLabelResult {
  /** Current position state */
  state: PositionState;
  /** P/L percentage (null if no cost basis or market ref) */
  pnlPct: number | null;
  /** P/L in GUN (null if no cost basis or market ref) */
  pnlGun: number | null;
  /** Market reference value in GUN (from marketRef.refGun) */
  marketRefGun: number | null;
  /** Data quality level (from marketRef) */
  quality: MarketDataQuality | null;
  /** Human-readable quality explanation (from marketRef) */
  qualityReason?: string;
}

/** Input for position label computation */
export interface ComputePositionLabelInput {
  /** Cost basis in GUN (null if unknown or free transfer) */
  costBasisGun: number | null;
  /** Market reference result from computeMarketReference */
  marketRef: MarketReferenceResult;
  /** Deadband percentage for FLAT determination (default 0.03 = 3%) */
  deadbandPct?: number;
}

/**
 * Compute position label (UP/DOWN/FLAT) from cost basis and market reference.
 *
 * Rules:
 * - If marketRef.refGun is null => NO_MARKET_REF
 * - If costBasisGun is null or <= 0 => NO_COST_BASIS (still returns marketRefGun)
 * - FLAT if abs(pnlPct) < deadbandPct
 * - UP/DOWN based on sign of pnlPct
 *
 * Quality and qualityReason come directly from the marketRef.
 */
export function computePositionLabel(input: ComputePositionLabelInput): PositionLabelResult {
  const { costBasisGun, marketRef, deadbandPct = 0.03 } = input;
  const epsilon = 1e-9;

  // Extract market reference values
  const { refGun, quality, qualityReason } = marketRef;

  // No market reference case
  if (refGun === null) {
    return {
      state: 'NO_MARKET_REF',
      pnlPct: null,
      pnlGun: null,
      marketRefGun: null,
      quality: null,
      qualityReason: undefined,
    };
  }

  // Validate cost basis
  const hasValidCostBasis =
    costBasisGun !== null && !isNaN(costBasisGun) && costBasisGun > epsilon;

  // No cost basis case (but we have market ref)
  if (!hasValidCostBasis) {
    return {
      state: 'NO_COST_BASIS',
      pnlPct: null,
      pnlGun: null,
      marketRefGun: refGun,
      quality,
      qualityReason,
    };
  }

  // Compute P/L
  const pnlGun = refGun - costBasisGun;
  const pnlPct = pnlGun / Math.max(costBasisGun, epsilon);

  // Determine position state with deadband
  let state: PositionState;
  if (Math.abs(pnlPct) < deadbandPct) {
    state = 'FLAT';
  } else if (pnlPct >= deadbandPct) {
    state = 'UP';
  } else {
    state = 'DOWN';
  }

  return {
    state,
    pnlPct,
    pnlGun,
    marketRefGun: refGun,
    quality,
    qualityReason,
  };
}
