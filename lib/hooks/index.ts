/**
 * Hooks barrel exports
 *
 * Portfolio hooks: data fetching and state management for portfolio page.
 * NFT Detail hooks: decomposed from NFTDetailModal for testability.
 */

// Wallet data fetching hook
export {
  useWalletDataFetcher,
  type WalletFetchResult,
  type WalletDataFetcherState,
  type UseWalletDataFetcherOptions,
} from './useWalletDataFetcher';

// NFT enrichment orchestration hook
export {
  useNFTEnrichmentOrchestrator,
  type UseNFTEnrichmentOptions,
  type UseNFTEnrichmentResult,
} from './useNFTEnrichmentOrchestrator';

// Wallet aggregation hook (for multi-wallet portfolios)
export {
  useWalletAggregation,
  mergeWalletData,
  type UseWalletAggregationOptions,
} from './useWalletAggregation';

// Orchestration hook (composes all of the above)
export {
  usePortfolioPage,
  type UsePortfolioPageOptions,
  type UsePortfolioPageResult,
} from './usePortfolioPage';

// ---------------------------------------------------------------------------
// NFT Detail Modal hooks
// ---------------------------------------------------------------------------

// GUN price fetching
export { useGunPrice } from './useGunPrice';

// Debug panel state management
export {
  useNFTDetailDebug,
  type CopyDebugParams,
  type UseNFTDetailDebugResult,
} from './useNFTDetailDebug';

// Acquisition data pipeline (biggest hook — owns caching, fetching, scoring)
export {
  useNFTAcquisitionPipeline,
  type ItemData,
  type UseNFTAcquisitionPipelineOptions,
  type UseNFTAcquisitionPipelineResult,
} from './useNFTAcquisitionPipeline';

// Weapon compatibility analysis
export {
  useWeaponCompatibility,
  type UseWeaponCompatibilityResult,
} from './useWeaponCompatibility';
