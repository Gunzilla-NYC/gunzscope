/**
 * Portfolio Hooks
 *
 * These hooks encapsulate the portfolio page's data fetching and state management.
 * They can be used individually or composed via usePortfolioPage.
 *
 * Integration path for portfolio page refactoring:
 *
 * 1. Replace inline state with usePortfolioPage hook:
 *    ```
 *    const {
 *      walletData,
 *      gunPrice,
 *      portfolioResult,
 *      isLoading,
 *      fetchWallet,
 *      ...
 *    } = usePortfolioPage({ initialAddress: address });
 *    ```
 *
 * 2. Wire up contextValue from hook return values:
 *    ```
 *    const contextValue: PortfolioContextValue = useMemo(() => ({
 *      walletData,
 *      address: walletData?.address ?? null,
 *      gunPrice,
 *      // ... other fields directly from hook
 *    }), [walletData, gunPrice, ...]);
 *    ```
 *
 * 3. Remove extracted functions:
 *    - fetchSingleWallet → useWalletDataFetcher
 *    - enrichNFTsInBackground, enrichSingleNFT → useNFTEnrichmentOrchestrator
 *    - mergeWalletData → useWalletAggregation
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
