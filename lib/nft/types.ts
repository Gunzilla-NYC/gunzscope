/**
 * NFT Detail Types
 *
 * Shared types for NFT detail display, market reference, and position tracking.
 * These are extracted for use across components and helpers.
 */

// =============================================================================
// Fetch Status Types
// =============================================================================

/** Per-token fetch status tracking */
export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// =============================================================================
// Market Data Types
// =============================================================================

/** Market data quality levels (spread-based) */
export type DataQualityLevel = 'strong' | 'fair' | 'limited';

/** Position label states */
export type PositionState = 'UP' | 'DOWN' | 'FLAT' | 'NO_COST_BASIS' | 'NO_MARKET_REF';

/** Result of position label calculation */
export interface PositionLabelResult {
  state: PositionState;
  pnlPct: number | null;
  pnlGun: number | null;
  marketRefGun: number | null;
  dataQuality: DataQualityLevel | null;
}

/** Input for getPositionLabel */
export interface GetPositionLabelInput {
  acquisitionPriceGun: number | null | undefined;
  marketRefGun: number | null | undefined;
  dataQuality: DataQualityLevel | null;
}

/** Market inputs computed from listings and NFT metadata */
export interface MarketInputs {
  low: number | null;
  high: number | null;
  ref: number | null; // market reference used for hero + position calculations
  dataQuality: DataQualityLevel | null; // spread-based only, requires both bounds
}
