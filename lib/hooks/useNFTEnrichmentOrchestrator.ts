'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { NFT, EnrichmentProgress } from '@/lib/types';
import { AvalancheService } from '@/lib/blockchain/avalanche';
import { GameMarketplaceService } from '@/lib/api/marketplace';
import { OpenSeaService } from '@/lib/api/opensea';
import { getCachedNFT, setCachedNFT, needsReEnrichment, buildTokenKey, LISTING_STALE_MS } from '@/lib/utils/nftCache';

// =============================================================================
// Constants
// =============================================================================

const ENRICHMENT_BATCH_SIZE = 6;
const ENRICHMENT_BATCH_DELAY_MS = 200;
const PRIORITY_ABOVE_FOLD_COUNT = 18;

// NFT contract address (hardcoded fallback for client-side)
const NFT_CONTRACT_ADDRESS = '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';

// Historical price entry with estimated flag
interface HistoricalPriceEntry {
  price: number;
  estimated: boolean;
}

/**
 * Batch-fetch historical GUN/USD prices for a set of dates.
 * Uses /api/price/history (same as modal) — server-cached 24h per date.
 * Returns a YYYY-MM-DD → { price, estimated } map.
 */
async function fetchGunPricesForDates(dates: Date[]): Promise<Map<string, HistoricalPriceEntry>> {
  const map = new Map<string, HistoricalPriceEntry>();
  // Deduplicate by YYYY-MM-DD
  const uniqueDates = new Map<string, Date>();
  for (const d of dates) {
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (!uniqueDates.has(key)) uniqueDates.set(key, d);
  }

  // Fetch in parallel batches — server caches each date for 24h,
  // so after first cold fetch subsequent calls are instant.
  const entries = Array.from(uniqueDates.entries());
  const BATCH_SIZE = 10;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async ([key, date]) => {
        const res = await fetch(`/api/price/history?coin=gunz&date=${date.toISOString()}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.price && data.price > 0) {
          return { key, price: data.price, estimated: !!data.estimated } as const;
        }
        return null;
      })
    );
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        map.set(result.value.key, { price: result.value.price, estimated: result.value.estimated });
      }
    }
  }
  return map;
}

/** Look up GUN/USD price for a date from a pre-fetched map. */
function lookupGunPrice(priceMap: Map<string, HistoricalPriceEntry>, date: Date): HistoricalPriceEntry | undefined {
  const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  return priceMap.get(key);
}

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
    updateCallback: (enrichedNFTs: NFT[]) => void,
    connectedWallets?: string[]
  ) => void;
  cancelEnrichment: () => void;
  retryEnrichment: () => void;
  /** Max observed mint number per baseName — prep for Tier 5 scarcity matching */
  scarcityMap: Map<string, number>;
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

  // Generation counter: increments on each startEnrichment call.
  // Stale enrichments (from a previous wallet or re-trigger) are silently ignored
  // when their captured generation doesn't match the current one.
  const generationRef = useRef(0);

  // Cumulative base: tracks total completed items across all startEnrichment calls
  // so that progress never goes backwards when a new page starts enriching
  const cumulativeBaseRef = useRef(0);

  // Scarcity tracking: max observed mint number per baseName (prep for Tier 5)
  const scarcityMapRef = useRef(new Map<string, number>());

  // Store last enrichment args for retry
  const lastArgsRef = useRef<{
    nfts: NFT[];
    walletAddress: string;
    avalancheService: AvalancheService;
    marketplaceService: GameMarketplaceService | null;
    updateCallback: (enrichedNFTs: NFT[]) => void;
    connectedWallets: string[];
  } | null>(null);

  /**
   * Enrich a single NFT with caching.
   */
  const enrichSingleNFT = useCallback(async (
    nft: NFT,
    walletAddress: string,
    nftContractAddress: string,
    avalancheService: AvalancheService,
    marketplaceService: GameMarketplaceService | null,
    connectedWallets: string[] = [],
    gunPriceMap: Map<string, HistoricalPriceEntry> = new Map()
  ): Promise<EnrichmentResult> => {
    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;

    // Check cache - only use if acquisition is complete
    // Marketplace purchases (opensea, in_game_marketplace) with no price are treated
    // as incomplete so the pipeline retries — the first run may have failed transiently
    // (RPC timeout, OpenSea rate limit) and cached costGun=0 permanently.
    const cached = getCachedNFT(walletAddress, primaryTokenId);
    const cachedPriceMissing = cached && (
      cached.purchasePriceGun === undefined ||
      cached.purchasePriceGun === null ||
      cached.purchasePriceGun === 0
    );
    // Treat cache as incomplete when price is missing and the pipeline should retry.
    // Retries: marketplace purchases, AND transfers where the sender's original
    // purchase might be traceable via blockchain (Strategy 2 in enrichSingleNFT).
    // Only skip retry for mints/decodes which have deterministic pricing.
    const isRetryableVenue = !cached?.acquisitionVenue ||
      ['opensea', 'in_game_marketplace', 'transfer'].includes(cached.acquisitionVenue);
    const cacheIncomplete = cachedPriceMissing && isRetryableVenue;

    if (cached && cached.hasAcquisition === true && !cacheIncomplete) {
      const groupedQuantity = nft.tokenIds && nft.tokenIds.length > 1 ? nft.tokenIds.length : undefined;

      // Check if listing data is stale (older than 4 hours)
      const listingStale = !cached.listingFetchedAt ||
        (Date.now() - new Date(cached.listingFetchedAt).getTime()) > LISTING_STALE_MS;

      let lowestListing = cached.currentLowestListing;
      let highestListing = cached.currentHighestListing;

      // Backfill purchasePriceUsd when missing, unknown, or upgrading estimated→real.
      // `undefined` means the flag was never set (legacy data) — treat as needing backfill.
      let backfilledUsd = cached.purchasePriceUsd;
      let backfilledEstimated = cached.purchasePriceUsdEstimated;
      if (cached.purchasePriceGun && cached.purchasePriceGun > 0 && cached.purchaseDate) {
        const shouldBackfill = !backfilledUsd || backfilledEstimated !== false;
        if (shouldBackfill) {
          const entry = lookupGunPrice(gunPriceMap, new Date(cached.purchaseDate));
          if (entry && entry.price > 0) {
            if (!backfilledUsd || (backfilledEstimated !== false && !entry.estimated)) {
              backfilledUsd = cached.purchasePriceGun * entry.price;
              backfilledEstimated = entry.estimated;
              setCachedNFT(walletAddress, primaryTokenId, {
                ...cached,
                purchasePriceUsd: backfilledUsd,
                purchasePriceUsdEstimated: backfilledEstimated,
              });
            }
          }
        }
      }

      // Re-fetch listing in background if stale (non-blocking, fast 5s timeout)
      if (listingStale) {
        withTimeout(
          new OpenSeaService().getNFTListings(nftContractAddress, primaryTokenId, 'avalanche'),
          5000
        ).then(listing => {
          if (listing) {
            lowestListing = listing.lowest ?? undefined;
            highestListing = listing.highest ?? undefined;
            // Update cache with fresh listing data
            setCachedNFT(walletAddress, primaryTokenId, {
              ...cached,
              currentLowestListing: lowestListing,
              currentHighestListing: highestListing,
              listingFetchedAt: new Date().toISOString(),
            });
          }
        }).catch(() => {});
      }

      // For grouped NFTs, sum costs across all individual tokenId caches.
      // Only set totalPurchasePriceGun when ALL items have a cached price —
      // partial sums would undercount and bypass the perItem × qty fallback.
      let totalPurchasePriceGun: number | undefined;
      if (nft.tokenIds && nft.tokenIds.length > 1) {
        let sum = 0;
        let count = 0;
        for (const tid of nft.tokenIds) {
          const itemCache = getCachedNFT(walletAddress, tid);
          if (itemCache?.purchasePriceGun !== undefined && itemCache.purchasePriceGun > 0) {
            sum += itemCache.purchasePriceGun;
            count++;
          }
        }
        if (count === nft.tokenIds.length) totalPurchasePriceGun = sum;
      }

      return {
        nft: {
          ...nft,
          quantity: groupedQuantity ?? cached.quantity ?? nft.quantity ?? 1,
          purchasePriceGun: cached.purchasePriceGun,
          totalPurchasePriceGun,
          purchasePriceUsd: backfilledUsd,
          purchasePriceUsdEstimated: backfilledEstimated,
          purchaseDate: cached.purchaseDate ? new Date(cached.purchaseDate) : undefined,
          transferredFrom: cached.transferredFrom,
          isFreeTransfer: cached.isFreeTransfer,
          transferType: cached.transferType,
          acquisitionVenue: cached.acquisitionVenue,
          acquisitionTxHash: cached.acquisitionTxHash,
          currentLowestListing: lowestListing,
          currentHighestListing: highestListing,
        },
        fetchSucceeded: true,
      };
    }

    const cachedQuantity = cached?.quantity;

    try {
      // Fetch quantity, acquisition details, and per-item listing in parallel
      const [quantity, acquisition, listing] = await Promise.all([
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
        // Per-item listing price from OpenSea (5s timeout, non-blocking)
        withTimeout(
          new OpenSeaService().getNFTListings(nftContractAddress, primaryTokenId, 'avalanche'),
          5000
        ).catch(() => null),
      ]);

      // Marketplace price lookup — intentionally cascading fallbacks:
      // token-based → wallet-based → OpenSea → transfer chain.
      // Each step only fires if previous didn't find a price.
      // TODO: Optimization item 7 skipped — cascade is deliberate, not parallelizable
      let marketplacePriceGun: number | undefined;
      let marketplacePurchaseDate: Date | undefined;

      // Primary strategy: token-based marketplace query (like modal's Strategy A)
      // Most precise — finds purchases for this exact token regardless of venue.
      if (marketplaceService && acquisition?.acquiredAtIso) {
        try {
          const tokenKey = buildTokenKey('avalanche', nftContractAddress, primaryTokenId);
          const tokenPurchases = await withTimeout(
            marketplaceService.getPurchasesForToken(tokenKey),
            5000
          );

          if (tokenPurchases && tokenPurchases.length > 0) {
            const acquiredAt = new Date(acquisition.acquiredAtIso);
            const MATCH_WINDOW_MS = 60 * 60 * 1000; // ±60 min

            const candidatesInWindow = tokenPurchases.filter(p => {
              const purchaseTime = new Date(p.purchaseDateIso).getTime();
              return Math.abs(purchaseTime - acquiredAt.getTime()) <= MATCH_WINDOW_MS;
            });

            if (candidatesInWindow.length > 0) {
              const walletLower = walletAddress.toLowerCase();
              const identityMatch = candidatesInWindow.find(
                p => p.buyerAddress?.toLowerCase() === walletLower
              );
              const closestMatch = !identityMatch
                ? candidatesInWindow.reduce((closest, p) => {
                    const cDiff = Math.abs(new Date(closest.purchaseDateIso).getTime() - acquiredAt.getTime());
                    const pDiff = Math.abs(new Date(p.purchaseDateIso).getTime() - acquiredAt.getTime());
                    return pDiff < cDiff ? p : closest;
                  })
                : undefined;

              const match = identityMatch ?? closestMatch;
              if (match && match.priceGun > 0) {
                marketplacePriceGun = match.priceGun;
                marketplacePurchaseDate = new Date(match.purchaseDateIso);
              }
            }
          }
        } catch {
          // Non-blocking — fall through to wallet-based strategies
        }
      }

      const isMarketplaceVenue = acquisition?.venue && [
        'opensea',
        'in_game_marketplace',
        'otg_marketplace',
      ].includes(acquisition.venue);

      // Fallback: wallet-based marketplace query (only when token-based didn't match)
      if (marketplacePriceGun === undefined && marketplaceService && isMarketplaceVenue && acquisition?.acquiredAtIso) {
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

            if (matchingSale) {
              const effectivePrice = matchingSale.priceGUN > 0 ? matchingSale.priceGUN : matchingSale.priceWGUN;
              if (effectivePrice > 0) {
                marketplacePriceGun = effectivePrice;
                marketplacePurchaseDate = matchingSale.eventTimestamp ? new Date(matchingSale.eventTimestamp) : undefined;
              }
            }
          }
        } catch {
          // Non-blocking
        }
      }

      // Cross-wallet transfer fallback: look up original purchase price
      // When an item was transferred for free from another wallet, trace
      // the acquisition chain backwards to find the most recent priced purchase.
      // Strategy A (OpenSea) is primary — single API call, handles multi-hop.
      // Strategy B (RPC sender cost) is fallback — covers non-OpenSea purchases.
      const isGenuineTransfer = acquisition?.venue === 'transfer'
        && !acquisition?.isMint
        && (acquisition?.costGun === 0 || !acquisition?.costGun)
        && acquisition?.fromAddress
        && acquisition.fromAddress !== '0x0000000000000000000000000000000000000000'
        && acquisition.fromAddress.toLowerCase() !== walletAddress.toLowerCase()
        && marketplacePriceGun === undefined;

      // Classify transfer type: self-transfer (own wallet) vs gift (external sender)
      let transferType: 'self' | 'gift' | undefined;
      if (isGenuineTransfer) {
        const senderLower = acquisition!.fromAddress!.toLowerCase();
        const isSelfTransfer = connectedWallets.some(w => w === senderLower);
        transferType = isSelfTransfer ? 'self' : 'gift';
      }

      // Walk the acquisition chain to find the original cost for ALL transfers.
      // transferType only affects display/totals, not whether we fetch prices.
      if (isGenuineTransfer) {
        const tokenId = nft.tokenIds?.[0] || nft.tokenId;
        const senderAddress = acquisition!.fromAddress!;
        const senderLower = senderAddress.toLowerCase();
        const acquisitionDate = acquisition!.acquiredAtIso
          ? new Date(acquisition!.acquiredAtIso)
          : undefined;

        // Strategy A (primary): OpenSea sales API — single call, handles multi-hop
        try {
          const openSeaService = new OpenSeaService();
          const saleEvents = await withTimeout(
            openSeaService.getSaleEvents(nftContractAddress, tokenId, 'avalanche'),
            10_000
          );

          if (saleEvents && saleEvents.length > 0) {
            // First try: exact match — sender was the buyer
            const senderSale = saleEvents.find(sale =>
              sale.buyerAddress?.toLowerCase() === senderLower
            );

            // Fallback: most recent sale before the transfer date (multi-hop)
            const dateSale = !senderSale && acquisitionDate
              ? saleEvents
                  .filter(sale => sale.eventTimestamp && sale.eventTimestamp < acquisitionDate)
                  .sort((a, b) => b.eventTimestamp.getTime() - a.eventTimestamp.getTime())[0]
              : undefined;

            const bestSale = senderSale ?? dateSale;

            if (bestSale) {
              const effectivePrice = bestSale.priceGUN > 0 ? bestSale.priceGUN : bestSale.priceWGUN;
              if (effectivePrice > 0) {
                marketplacePriceGun = effectivePrice;
                marketplacePurchaseDate = bestSale.eventTimestamp
                  ? new Date(bestSale.eventTimestamp)
                  : undefined;
              }
            }
          }
        } catch (osError) {
          console.warn(`[Enrichment] Strategy A (OpenSea) failed for tokenId=${tokenId}:`, osError);
        }

        // Strategy B (fallback): RPC inline sender cost from getNFTHoldingAcquisition
        if (marketplacePriceGun === undefined && acquisition!.senderCostGun && acquisition!.senderCostGun > 0) {
          marketplacePriceGun = acquisition!.senderCostGun;
          marketplacePurchaseDate = acquisition!.senderAcquiredAtIso
            ? new Date(acquisition!.senderAcquiredAtIso)
            : undefined;
        }
      }

      // Build enriched data
      const hasAcquisitionData = acquisition !== null && (
        acquisition.txHash !== undefined ||
        (typeof acquisition.costGun === 'number' && Number.isFinite(acquisition.costGun)) ||
        acquisition.acquiredAtIso !== undefined
      );

      // isFreeTransfer: true when chain cost is 0, NOT a mint, AND we didn't find a price via fallback
      const isFreeTransfer = acquisition?.costGun === 0 && !acquisition?.isMint && marketplacePriceGun === undefined;
      const finalQuantity = (nft.tokenIds && nft.tokenIds.length > 1) ? nft.tokenIds.length : (quantity ?? nft.quantity ?? 1);

      const finalPurchasePriceGun = marketplacePriceGun ?? acquisition?.costGun;
      // For free transfers, prefer sender's acquisition date over the transfer-to-wallet date
      const finalPurchaseDate = marketplacePurchaseDate
        ?? (isGenuineTransfer && acquisition?.senderAcquiredAtIso
            ? new Date(acquisition.senderAcquiredAtIso) : undefined)
        ?? (acquisition?.acquiredAtIso ? new Date(acquisition.acquiredAtIso) : undefined);

      // Compute USD from historical GUN price at acquisition date
      let purchasePriceUsd: number | undefined;
      let purchasePriceUsdEstimated = false;
      if (finalPurchasePriceGun && finalPurchasePriceGun > 0 && finalPurchaseDate) {
        // Try pre-fetched map first, then per-item API fallback for new dates
        let entry = lookupGunPrice(gunPriceMap, finalPurchaseDate);
        if (entry === undefined) {
          try {
            const res = await fetch(`/api/price/history?coin=gunz&date=${finalPurchaseDate.toISOString()}`);
            if (res.ok) {
              const data = await res.json();
              if (data?.price && data.price > 0) {
                entry = { price: data.price, estimated: !!data.estimated };
              }
            }
          } catch { /* non-blocking */ }
        }
        if (entry && entry.price > 0) {
          purchasePriceUsd = finalPurchasePriceGun * entry.price;
          purchasePriceUsdEstimated = entry.estimated;
        }
      }

      const enrichedData = {
        quantity: finalQuantity,
        purchasePriceGun: finalPurchasePriceGun,
        purchasePriceUsd,
        purchasePriceUsdEstimated,
        purchaseDate: finalPurchaseDate,
        transferredFrom: isFreeTransfer ? acquisition?.fromAddress : undefined,
        isFreeTransfer,
        transferType,
        acquisitionVenue: acquisition?.venue,
        acquisitionTxHash: acquisition?.txHash ?? undefined,
        currentLowestListing: listing?.lowest ?? undefined,
        currentHighestListing: listing?.highest ?? undefined,
      };

      // Cache the result
      const nowIso = new Date().toISOString();
      if (hasAcquisitionData) {
        const priceSource = marketplacePriceGun !== undefined ? 'marketplace' : (acquisition?.costGun !== undefined ? 'blockchain' : undefined);
        setCachedNFT(walletAddress, primaryTokenId, {
          quantity: enrichedData.quantity,
          purchasePriceGun: enrichedData.purchasePriceGun,
          purchasePriceUsd: enrichedData.purchasePriceUsd,
          purchasePriceUsdEstimated: enrichedData.purchasePriceUsdEstimated,
          purchaseDate: enrichedData.purchaseDate?.toISOString(),
          transferredFrom: enrichedData.transferredFrom,
          isFreeTransfer: enrichedData.isFreeTransfer,
          transferType: enrichedData.transferType,
          acquisitionVenue: enrichedData.acquisitionVenue,
          acquisitionTxHash: enrichedData.acquisitionTxHash,
          hasAcquisition: true,
          hasMarketplacePrice: marketplacePriceGun !== undefined,
          priceSource,
          cachedAtIso: nowIso,
          currentLowestListing: enrichedData.currentLowestListing,
          currentHighestListing: enrichedData.currentHighestListing,
          listingFetchedAt: listing ? nowIso : undefined,
        });
      } else if (quantity !== null && quantity !== undefined) {
        // No acquisition found on-chain — this is a resolved "unknown origin",
        // not a transient error. Cache as complete so we don't re-scan.
        setCachedNFT(walletAddress, primaryTokenId, {
          quantity: enrichedData.quantity,
          hasAcquisition: true,
          cachedAtIso: nowIso,
          currentLowestListing: enrichedData.currentLowestListing,
          currentHighestListing: enrichedData.currentHighestListing,
          listingFetchedAt: listing ? nowIso : undefined,
        });
      }

      return {
        nft: { ...nft, ...enrichedData },
        fetchSucceeded: true,
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
    updateCallback: (enrichedNFTs: NFT[]) => void,
    connectedWallets: string[] = []
  ) => {
    if (!enabled || nfts.length === 0) return;

    // Store args for retry
    lastArgsRef.current = { nfts, walletAddress, avalancheService, marketplaceService, updateCallback, connectedWallets };

    // Cancel any previous enrichment and bump generation
    cancelledRef.current = true;
    const gen = ++generationRef.current;
    cancelledRef.current = false;
    cumulativeBaseRef.current = 0;
    setIsEnriching(true);

    const nftContractAddress = NFT_CONTRACT_ADDRESS;

    // Collect unique purchase dates from cache, then batch-fetch historical GUN prices.
    // Uses /api/price/history per date (server-cached 24h) — same source as the modal.
    const purchaseDates: Date[] = [];
    for (const nft of nfts) {
      const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
      const cached = getCachedNFT(walletAddress, primaryTokenId);
      if (cached?.purchaseDate) purchaseDates.push(new Date(cached.purchaseDate));
    }
    const gunPriceMap = await fetchGunPricesForDates(purchaseDates);

    try {
      // Apply cached data immediately
      const nftsWithCache = nfts.map(nft => {
        const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
        const cached = getCachedNFT(walletAddress, primaryTokenId);
        if (cached) {
          const groupedQuantity = nft.tokenIds && nft.tokenIds.length > 1 ? nft.tokenIds.length : undefined;

          // For grouped NFTs, sum costs across all individual tokenId caches.
          // Only set when ALL items have a cached price to avoid partial sums.
          let totalPurchasePriceGun: number | undefined;
          if (nft.tokenIds && nft.tokenIds.length > 1) {
            let sum = 0;
            let count = 0;
            for (const tid of nft.tokenIds) {
              const itemCache = getCachedNFT(walletAddress, tid);
              if (itemCache?.purchasePriceGun !== undefined && itemCache.purchasePriceGun > 0) {
                sum += itemCache.purchasePriceGun;
                count++;
              }
            }
            if (count === nft.tokenIds.length) totalPurchasePriceGun = sum;
          }

          // Backfill purchasePriceUsd when missing, unknown, or upgrading estimated→real.
          let usdPrice = cached.purchasePriceUsd;
          let usdEstimated = cached.purchasePriceUsdEstimated;
          if (cached.purchasePriceGun && cached.purchasePriceGun > 0 && cached.purchaseDate) {
            const shouldBackfill = !usdPrice || usdEstimated !== false;
            if (shouldBackfill) {
              const entry = lookupGunPrice(gunPriceMap, new Date(cached.purchaseDate));
              if (entry && entry.price > 0) {
                if (!usdPrice || (usdEstimated !== false && !entry.estimated)) {
                  usdPrice = cached.purchasePriceGun * entry.price;
                  usdEstimated = entry.estimated;
                }
              }
            }
          }

          return {
            ...nft,
            quantity: groupedQuantity ?? cached.quantity ?? nft.quantity ?? 1,
            purchasePriceGun: cached.purchasePriceGun,
            purchasePriceUsd: usdPrice,
            purchasePriceUsdEstimated: usdEstimated,
            totalPurchasePriceGun,
            purchaseDate: cached.purchaseDate ? new Date(cached.purchaseDate) : undefined,
            transferredFrom: cached.transferredFrom,
            isFreeTransfer: cached.isFreeTransfer,
            transferType: cached.transferType,
            acquisitionVenue: cached.acquisitionVenue,
            acquisitionTxHash: cached.acquisitionTxHash,
            currentLowestListing: cached.currentLowestListing,
            currentHighestListing: cached.currentHighestListing,
          };
        }
        return nft;
      });

      if (gen !== generationRef.current) return;

      const cacheHits = nftsWithCache.filter(n => n.purchasePriceGun != null).length;
      console.log('[Enrichment] Cache application phase', {
        totalNfts: nfts.length,
        cacheHits,
        cacheMisses: nfts.length - cacheHits,
        walletAddress,
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

      const totalNftCount = nfts.length;
      const cachedCount = totalNftCount - nftsNeedingEnrichment.length;
      const base = cumulativeBaseRef.current;

      if (nftsNeedingEnrichment.length === 0) {
        if (gen !== generationRef.current) return;
        cumulativeBaseRef.current = base + totalNftCount;
        setProgress({ completed: base + totalNftCount, total: base + totalNftCount, phase: 'complete', failedCount: 0 });
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

      setProgress({ completed: base + cachedCount, total: base + totalNftCount, phase: 'enriching', failedCount: 0 });

      // Process in batches
      let failedCount = 0;
      const enrichedResults = new Map<string, NFT>();
      nftsWithCache.forEach(nft => {
        const key = nft.tokenIds?.[0] || nft.tokenId;
        enrichedResults.set(key, nft);
      });

      let completedCount = 0;

      for (let i = 0; i < orderedNftsToEnrich.length; i += batchSize) {
        if (cancelledRef.current || gen !== generationRef.current) break;

        const batch = orderedNftsToEnrich.slice(i, i + batchSize);

        // Process batch with per-NFT progress updates
        await Promise.all(
          batch.map(async (nft) => {
            const { nft: enrichedNFT, fetchSucceeded } = await enrichSingleNFT(nft, walletAddress, nftContractAddress, avalancheService, marketplaceService, connectedWallets, gunPriceMap);

            if (!fetchSucceeded) {
              failedCount++;
            }

            // Update per-NFT so the counter keeps moving during slow RPC calls
            const key = enrichedNFT.tokenIds?.[0] || enrichedNFT.tokenId;
            enrichedResults.set(key, enrichedNFT);
            completedCount++;
            if (!cancelledRef.current && gen === generationRef.current) {
              setProgress({ completed: base + cachedCount + completedCount, total: base + totalNftCount, phase: 'enriching', failedCount });
            }

            return enrichedNFT;
          })
        );

        // Push full batch update to callback
        if (!cancelledRef.current && gen === generationRef.current) {
          const updatedNFTs = nfts.map(nft => {
            const key = nft.tokenIds?.[0] || nft.tokenId;
            return enrichedResults.get(key) || nft;
          });
          updateCallback(updatedNFTs);
          setEnrichedNFTs(updatedNFTs);
        }

        if (i + batchSize < orderedNftsToEnrich.length && !cancelledRef.current && gen === generationRef.current) {
          await delay(batchDelayMs);
        }
      }

      if (gen !== generationRef.current) return;
      cumulativeBaseRef.current = base + totalNftCount;
      setProgress({ completed: base + totalNftCount, total: base + totalNftCount, phase: 'complete', failedCount });

      // Diagnostic summary — helps debug resolution gaps on large wallets
      {
        const allResults = Array.from(enrichedResults.values());
        const withDate = allResults.filter(n => n.purchaseDate).length;
        const withCostGun = allResults.filter(n => n.purchasePriceGun && n.purchasePriceGun > 0).length;
        const withCostUsd = allResults.filter(n => n.purchasePriceUsd && n.purchasePriceUsd > 0).length;
        const withListing = allResults.filter(n => n.currentLowestListing && n.currentLowestListing > 0).length;
        const freeTransfers = allResults.filter(n => n.isFreeTransfer).length;

        // Venue breakdown
        const venues: Record<string, number> = {};
        allResults.forEach(n => {
          const v = n.acquisitionVenue || 'unknown';
          venues[v] = (venues[v] || 0) + 1;
        });

        console.info(
          `[Enrichment Summary] ${walletAddress.slice(0, 8)}...\n` +
          `  Total: ${totalNftCount} | Cached: ${cachedCount} | Fresh: ${nftsNeedingEnrichment.length} | Failed: ${failedCount}\n` +
          `  Dates: ${withDate}/${totalNftCount} (${((withDate / totalNftCount) * 100).toFixed(1)}%)\n` +
          `  Cost GUN: ${withCostGun}/${totalNftCount} (${((withCostGun / totalNftCount) * 100).toFixed(1)}%)\n` +
          `  Cost USD: ${withCostUsd}/${totalNftCount} (${((withCostUsd / totalNftCount) * 100).toFixed(1)}%)\n` +
          `  Listings: ${withListing}/${totalNftCount} (${((withListing / totalNftCount) * 100).toFixed(1)}%)\n` +
          `  Free transfers: ${freeTransfers}\n` +
          `  Venues: ${Object.entries(venues).map(([v, c]) => `${v}=${c}`).join(', ')}`
        );
      }

      // Scarcity tracking: collect max mint number per baseName (prep for Tier 5)
      {
        const map = scarcityMapRef.current;
        map.clear();
        for (const nft of nfts) {
          const mintStr = nft.mintNumber;
          if (!mintStr || !nft.name) continue;
          const mint = parseInt(mintStr, 10);
          if (isNaN(mint) || mint <= 0) continue;
          const current = map.get(nft.name) ?? 0;
          if (mint > current) map.set(nft.name, mint);
        }
      }

      setIsEnriching(false);
    } catch (error) {
      console.error('[NFT Enrichment] Error:', error);
      if (gen === generationRef.current) {
        setIsEnriching(false);
      }
    }
  }, [enabled, priorityCount, batchSize, batchDelayMs, enrichSingleNFT]);

  /**
   * Cancel ongoing enrichment.
   */
  const cancelEnrichment = useCallback(() => {
    cancelledRef.current = true;
    cumulativeBaseRef.current = 0;
    setIsEnriching(false);
    setProgress(null);
  }, []);

  /**
   * Retry enrichment using the last arguments.
   */
  const retryEnrichment = useCallback(() => {
    const args = lastArgsRef.current;
    if (!args) return;
    startEnrichment(args.nfts, args.walletAddress, args.avalancheService, args.marketplaceService, args.updateCallback, args.connectedWallets);
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
    scarcityMap: scarcityMapRef.current,
  };
}
