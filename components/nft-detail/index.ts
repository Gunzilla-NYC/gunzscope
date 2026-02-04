/**
 * NFT Detail Subcomponents
 *
 * RENDER ONLY: Purely presentational subcomponents.
 * All business logic, fetching, and state management remains in the parent.
 *
 * =============================================================================
 * GUARDRAILS (enforced via ESLint no-restricted-imports)
 * =============================================================================
 * These components must NOT import compute/derive helpers from nftDetailHelpers:
 *   - computeMarketInputs, getPositionLabel, normalizeCostBasis
 *   - toIsoStringSafe, warnOnce, FIFOKeyTracker, isAbortError, TOKEN_MAP_SOFT_CAP
 *
 * Why: The parent (NFTDetailModal) is the single source of truth for all
 * computed values. Subcomponents receive display-ready data via view-model props.
 *
 * Allowed imports:
 *   - Types from './types' (local view-model types)
 *   - Types from '@/lib/nft/types' (FetchStatus, MarketInputs, etc.)
 *   - Pure display utilities (e.g., gunzExplorerTxUrl from '@/lib/explorer')
 *
 * If ESLint blocks your import, refactor to pass the computed value from parent.
 * =============================================================================
 */

// Components
export { NFTDetailTraitsSection } from './NFTDetailTraitsSection';
export { NFTDetailAcquisitionCard } from './NFTDetailAcquisitionCard';
export { NFTDetailObservedMarketRange } from './NFTDetailObservedMarketRange';
export { NFTDetailDebugPanel } from './NFTDetailDebugPanel';
export { NFTDetailQuickStats } from './NFTDetailQuickStats';
export { NFTDetailTraitPills } from './NFTDetailTraitPills';

// View model types (for parent use)
export type {
  TraitsViewModel,
  AcquisitionCardViewModel,
  AcquisitionDisplayData,
  MarketRangeViewModel,
  FormatDateFn,
  GetVenueDisplayLabelFn,
  GetPositionOnRangeFn,
  // Debug panel types
  DebugPanelViewModel,
  DebugDataState,
  ResolvedAcquisitionData,
  HoldingAcquisitionData,
  MetadataDebugData,
  ToIsoStringSafeFn,
} from './types';
