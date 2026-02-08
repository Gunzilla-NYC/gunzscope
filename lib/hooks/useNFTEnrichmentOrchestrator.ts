'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { NFT, EnrichmentProgress } from '@/lib/types';
import { AvalancheService } from '@/lib/blockchain/avalanche';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { OpenSeaService } from '@/lib/api/opensea';
import { getCachedNFT, setCachedNFT, needsReEnrichment, buildTokenKey } from '@/lib/utils/nftCache';

// =============================================================================
// Constants
// =============================================================================

const ENRICHMENT_BATCH_SIZE = 3;
const ENRICHMENT_BATCH_DELAY_MS = 1500;
const PRIORITY_ABOVE_FOLD_COUNT = 12;

// NFT contract address (hardcoded fallback for client-side)
const NFT_CONTRACT_ADDRESS = '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';

// =============================================================================
// Types
// =============================================================================

interface EnrichmentResult {
  nft: NFT;
  fetchSucceeded: boolean;
}

export interface UseNFTEnrichmentOptions {
  priorityCount?: number;
  batchSize?: number;
  batchDelayMs?: number;
  enabled?: boolean;
}

export interface UseNFTEnrichmentResult {
  enrichedNFTs: NFT[];
  progress: EnrichmentProgress | null;
  isEnriching: boolean;
  startEnrichment: (
    nfts: NFT[],
    walletAddress: string,
    avalancheService: AvalancheService,
    marketplaceService: GameMarketplaceService | null,
    updateCallback: (enrichedNFTs: NFT[]) => void
  ) => void;
  cancelEnrichment: () => void;
  retryEnrichment: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
  ]);
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for orchestrating NFT enrichment with caching, batching, and progress tracking.
 */
export function useNFTEnrichmentOrchestrator(
  options: UseNFTEnrichmentOptions = {}
): UseNFTEnrichmentResult {
  const {
    priorityCount = PRIORITY_ABOVE_FOLD_COUNT,
    batchSize = ENRICHMENT_BATCH_SIZE,
    batchDelayMs = ENRICHMENT_BATCH_DELAY_MS,
    enabled = true,
  } = options;

  // State
  const [enrichedNFTs, setEnrichedNFTs] = useState<NFT[]>([]);
  const [progress, setProgress] = useState<EnrichmentProgress | null>(null);
  const [isEnriching, setIsEnriching] = useState(false);

  // Cancellation ref
  const cancelledRef = useRef(false);

  // Store last enrichment args for retry
  const lastArgsRef = useRef<{
    nfts: NFT[];
    walletAddress: string;
    avalancheService: AvalancheService;
    marketplaceService: GameMarketplaceService | null;
    updateCallback: (enrichedNFTs: NFT[]) => void;
  } | null>(null);

  /**
   * Enrich a single NFT with caching.
   */
  const enrichSingleNFT = useCallback(async (
    nft: NFT,
    walletAddress: string,
    nftContractAddress: string,
    avalancheService: AvalancheService,
    marketplaceService: GameMarketplaceService | null
  ): Promise<EnrichmentResult> => {
    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;

    // Check cache - only use if acquisition is complete
    const cached = getCachedNFT(walletAddress, primaryTokenId);
    if (cached && cached.hasAcquisition === true) {
      const groupedQuantity = nft.tokenIds && nft.tokenIds.length > 1 ? nft.tokenIds.length : undefined;
      return {
        nft: {
          ...nft,
          quantity: groupedQuantity ?? cached.quantity ?? nft.quantity ?? 1,
          purchasePriceGun: cached.purchasePriceGun,
          purchaseDate: cached.purchaseDate ? new Date(cached.purchaseDate) : undefined,
          transferredFrom: cached.transferredFrom,
          isFreeTransfer: cached.isFreeTransfer,
          acquisitionVenue: cached.acquisitionVenue,
          acquisitionTxHash: cached.acquisitionTxHash,
        },
        fetchSucceeded: true,
      };
    }

    const cachedQuantity = cached?.quantity;

    try {
      // Fetch quantity and acquisition details in parallel
      const [quantity, acquisition] = await Promise.all([
        cachedQuantity !== undefined
          ? Promise.resolve(cachedQuantity)
          : nft.tokenIds && nft.tokenIds.length > 1
            ? Promise.resolve(nft.quantity || nft.tokenIds.length)
            : withTimeout(
                avalancheService.detectNFTQuantity(nftContractAddress, nft.tokenId, walletAddress),
                3000
              ),
        withTimeout(
          avalancheService.getNFTHoldingAcquisition(nftContractAddress, primaryTokenId, walletAddress),
          45000
        ),
      ]);

      // Marketplace price lookup
      let marketplacePriceGun: number | undefined;
      let marketplacePurchaseDate: Date | undefined;

      const isMarketplaceVenue = acquisition?.venue && [
        'opensea',
        'in_game_marketplace',
        'otg_marketplace',
      ].includes(acquisition.venue);

      if (marketplaceService && isMarketplaceVenue && acquisition?.acquiredAtIso) {
        try {
          const acquiredAt = new Date(acquisition.acquiredAtIso);
          const purchases = await withTimeout(
            marketplaceService.getPurchasesForWallet(walletAddress, {
              fromDate: new Date(acquiredAt.getTime() - 24 * 60 * 60 * 1000),
              toDate: new Date(acquiredAt.getTime() + 24 * 60 * 60 * 1000),
              limit: 20,
            }),
            5000
          );

          if (purchases && purchases.length > 0) {
            const tokenId = nft.tokenIds?.[0] || nft.tokenId;
            const matchingPurchases = purchases.filter(p => {
              const parts = p.tokenKey.split(':');
              return parts[2] === tokenId;
            });

            if (matchingPurchases.length > 0) {
              const matchedPurchase = matchingPurchases.reduce((closest, p) => {
                const closestDiff = Math.abs(new Date(closest.purchaseDateIso).getTime() - acquiredAt.getTime());
                const pDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                return pDiff < closestDiff ? p : closest;
              });

              marketplacePriceGun = matchedPurchase.priceGun;
              marketplacePurchaseDate = new Date(matchedPurchase.purchaseDateIso);
            }
          }
        } catch {
          // Non-blocking - continue with blockchain data only
        }
      }

      // OpenSea fallback
      if (acquisition?.venue === 'opensea' && marketplacePriceGun === undefined) {
        try {
          const openSeaService = new OpenSeaService();
          const tokenId = nft.tokenIds?.[0] || nft.tokenId;

          const saleEvents = await withTimeout(
            openSeaService.getSaleEvents(nftContractAddress, tokenId, 'avalanche'),
            8000
          );

          if (saleEvents && saleEvents.length > 0) {
            const walletLower = walletAddress.toLowerCase();
            const matchingSale = saleEvents.find(sale =>
              sale.buyerAddress?.toLowerCase() === walletLower
            );

            if (matchingSale && matchingSale.priceGUN > 0) {
              marketplacePriceGun = matchingSale.priceGUN;
              marketplacePurchaseDate = matchingSale.eventTimestamp ? new Date(matchingSale.eventTimestamp) : undefined;
            }
          }
        } catch {
          // Non-blocking
        }
      }

      // Build enriched data
      const hasAcquisitionData = acquisition !== null && (
        acquisition.txHash !== undefined ||
        (typeof acquisition.costGun === 'number' && Number.isFinite(acquisition.costGun)) ||
        acquisition.acquiredAtIso !== undefined
      );

      const isFreeTransfer = acquisition?.costGun === 0 && !acquisition?.isMint;
      const finalQuantity = (nft.tokenIds && nft.tokenIds.length > 1) ? nft.tokenIds.length : (quantity ?? nft.quantity ?? 1);

      const enrichedData = {
        quantity: finalQuantity,
        purchasePriceGun: marketplacePriceGun ?? acquisition?.costGun,
        purchaseDate: marketplacePurchaseDate ?? (acquisition?.acquiredAtIso ? new Date(acquisition.acquiredAtIso) : undefined),
        transferredFrom: isFreeTransfer ? acquisition?.fromAddress : undefined,
        isFreeTransfer,
        acquisitionVenue: acquisition?.venue,
        acquisitionTxHash: acquisition?.txHash ?? undefined,
      };

      // Cache the result
      if (hasAcquisitionData) {
        const priceSource = marketplacePriceGun !== undefined ? 'marketplace' : (acquisition?.costGun !== undefined ? 'blockchain' : undefined);
        setCachedNFT(walletAddress, primaryTokenId, {
          quantity: enrichedData.quantity,
          purchasePriceGun: enrichedData.purchasePriceGun,
          purchaseDate: enrichedData.purchaseDate?.toISOString(),
          transferredFrom: enrichedData.transferredFrom,
          isFreeTransfer: enrichedData.isFreeTransfer,
          acquisitionVenue: enrichedData.acquisitionVenue,
          acquisitionTxHash: enrichedData.acquisitionTxHash,
          hasAcquisition: true,
          hasMarketplacePrice: marketplacePriceGun !== undefined,
          priceSource,
          cachedAtIso: new Date().toISOString(),
        });
      } else if (quantity !== null && quantity !== undefined) {
        setCachedNFT(walletAddress, primaryTokenId, {
          quantity: enrichedData.quantity,
          hasAcquisition: false,
          cachedAtIso: new Date().toISOString(),
        });
      }

      return {
        nft: { ...nft, ...enrichedData },
        fetchSucceeded: acquisition !== null,
      };
    } catch (error) {
      console.error(`Error enriching NFT ${nft.tokenId}:`, error);
      return { nft, fetchSucceeded: false };
    }
  }, []);

  /**
   * Start background enrichment for a list of NFTs.
   */
  const startEnrichment = useCallback(async (
    nfts: NFT[],
    walletAddress: string,
    avalancheService: AvalancheService,
    marketplaceService: GameMarketplaceService | null,
    updateCallback: (enrichedNFTs: NFT[]) => void
  ) => {
    if (!enabled || nfts.length === 0) return;

    // Store args for retry
    lastArgsRef.current = { nfts, walletAddress, avalancheService, marketplaceService, updateCallback };

    cancelledRef.current = false;
    setIsEnriching(true);

    const nftContractAddress = NFT_CONTRACT_ADDRESS;

    try {
      // Apply cached data immediately
      const nftsWithCache = nfts.map(nft => {
        const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
        const cached = getCachedNFT(walletAddress, primaryTokenId);
        if (cached) {
          const groupedQuantity = nft.tokenIds && nft.tokenIds.length > 1 ? nft.tokenIds.length : undefined;
          return {
            ...nft,
            quantity: groupedQuantity ?? cached.quantity ?? nft.quantity ?? 1,
            purchasePriceGun: cached.purchasePriceGun,
            purchaseDate: cached.purchaseDate ? new Date(cached.purchaseDate) : undefined,
            transferredFrom: cached.transferredFrom,
            isFreeTransfer: cached.isFreeTransfer,
            acquisitionVenue: cached.acquisitionVenue,
            acquisitionTxHash: cached.acquisitionTxHash,
          };
        }
        return nft;
      });

      updateCallback(nftsWithCache);
      setEnrichedNFTs(nftsWithCache);

      // Find NFTs needing enrichment
      const nftsNeedingEnrichment = nftsWithCache.filter(nft => {
        const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
        const tokenKey = buildTokenKey('avalanche', nftContractAddress, primaryTokenId);
        const { needsRetry } = needsReEnrichment(walletAddress, tokenKey);
        return needsRetry;
      });

      if (nftsNeedingEnrichment.length === 0) {
        setProgress({ completed: 0, total: 0, phase: 'complete', failedCount: 0 });
        setIsEnriching(false);
        return;
      }

      // Sort by priority
      const priorityTokenIds = nfts.slice(0, priorityCount).map(nft => nft.tokenIds?.[0] || nft.tokenId);
      const prioritySet = new Set(priorityTokenIds);
      const priorityNfts = nftsNeedingEnrichment.filter(nft => {
        const tokenId = nft.tokenIds?.[0] || nft.tokenId;
        return prioritySet.has(tokenId);
      });
      const remainingNfts = nftsNeedingEnrichment.filter(nft => {
        const tokenId = nft.tokenIds?.[0] || nft.tokenId;
        return !prioritySet.has(tokenId);
      });
      const orderedNftsToEnrich = [...priorityNfts, ...remainingNfts];

      setProgress({ completed: 0, total: orderedNftsToEnrich.length, phase: 'enriching', failedCount: 0 });

      // Process in batches
      let failedCount = 0;
      const enrichedResults = new Map<string, NFT>();
      nftsWithCache.forEach(nft => {
        const key = nft.tokenIds?.[0] || nft.tokenId;
        enrichedResults.set(key, nft);
      });

      let completedCount = 0;

      for (let i = 0; i < orderedNftsToEnrich.length; i += batchSize) {
        if (cancelledRef.current) break;

        const batch = orderedNftsToEnrich.slice(i, i + batchSize);

        // Process batch with per-NFT progress updates
        await Promise.all(
          batch.map(async (nft) => {
            const { nft: enrichedNFT, fetchSucceeded } = await enrichSingleNFT(nft, walletAddress, nftContractAddress, avalancheService, marketplaceService);

            if (!fetchSucceeded) {
              failedCount++;
            }

            // Update per-NFT so the counter keeps moving during slow RPC calls
            const key = enrichedNFT.tokenIds?.[0] || enrichedNFT.tokenId;
            enrichedResults.set(key, enrichedNFT);
            completedCount++;
            if (!cancelledRef.current) {
              setProgress({ completed: completedCount, total: orderedNftsToEnrich.length, phase: 'enriching', failedCount });
            }

            return enrichedNFT;
          })
        );

        // Push full batch update to callback
        if (!cancelledRef.current) {
          const updatedNFTs = nfts.map(nft => {
            const key = nft.tokenIds?.[0] || nft.tokenId;
            return enrichedResults.get(key) || nft;
          });
          updateCallback(updatedNFTs);
          setEnrichedNFTs(updatedNFTs);
        }

        if (i + batchSize < orderedNftsToEnrich.length && !cancelledRef.current) {
          await delay(batchDelayMs);
        }
      }

      setProgress({ completed: orderedNftsToEnrich.length, total: orderedNftsToEnrich.length, phase: 'complete', failedCount });
      setIsEnriching(false);
    } catch (error) {
      console.error('[NFT Enrichment] Error:', error);
      setIsEnriching(false);
    }
  }, [enabled, priorityCount, batchSize, batchDelayMs, enrichSingleNFT]);

  /**
   * Cancel ongoing enrichment.
   */
  const cancelEnrichment = useCallback(() => {
    cancelledRef.current = true;
    setIsEnriching(false);
    setProgress(null);
  }, []);

  /**
   * Retry enrichment using the last arguments.
   */
  const retryEnrichment = useCallback(() => {
    const args = lastArgsRef.current;
    if (!args) return;
    startEnrichment(args.nfts, args.walletAddress, args.avalancheService, args.marketplaceService, args.updateCallback);
  }, [startEnrichment]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  return {
    enrichedNFTs,
    progress,
    isEnriching,
    startEnrichment,
    cancelEnrichment,
    retryEnrichment,
  };
}
