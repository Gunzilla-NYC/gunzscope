'use client';

import { NFT } from '@/lib/types';
import dynamic from 'next/dynamic';
import { NFTImage } from '@/components/ui/NFTImage';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useGunPrice } from '@/lib/hooks/useGunPrice';
import { useNFTDetailDebug } from '@/lib/hooks/useNFTDetailDebug';


// =============================================================================
// Import pure helpers from dedicated module (extracted for testability)
// =============================================================================
import {
  normalizeCostBasis,
  warnOnce,
  toIsoStringSafe,
  computeMarketInputs,
  findRelatedItems,
} from '@/lib/nft/nftDetailHelpers';
import {
  useNFTAcquisitionPipeline,
  type ItemData,
} from '@/lib/hooks/useNFTAcquisitionPipeline';

// =============================================================================
// Import extracted presentational subcomponents
// =============================================================================
import { NFTDetailPositionCard } from '@/components/nft-detail/NFTDetailPositionCard';
import { WeaponLabPanel } from '@/components/nft-detail/WeaponLabPanel';
import { NFTDetailTraitPills } from '@/components/nft-detail/NFTDetailTraitPills';
import { getItemOrigin } from '@/lib/data/itemOrigins';
import type { HoldingAcquisitionData, ResolvedAcquisitionData, MetadataDebugData } from '@/components/nft-detail/types';
import LockedWeaponIndicator from '@/components/weapon/LockedWeaponIndicator';

// Dynamic import for NFTDetailDebugPanel - only loaded when debugMode is active
const NFTDetailDebugPanel = dynamic(
  () => import('@/components/nft-detail/NFTDetailDebugPanel').then(mod => ({ default: mod.NFTDetailDebugPanel })),
  { ssr: false, loading: () => null }
);
import { isWeaponLocked, isWeapon, getFunctionalTier } from '@/lib/weapon/weaponCompatibility';
import TierBadge from '@/components/ui/TierBadge';
import { RARITY_COLORS, RARITY_ORDER, DEFAULT_RARITY_COLORS } from '@/lib/utils/rarityColors';
import { gunzExplorerTxUrl } from '@/lib/explorer';
import InfoTooltip from '@/components/ui/InfoTooltip';



// =============================================================================
// Pure helpers — hoisted to module scope (no closure dependencies)
// =============================================================================
function formatDate(date?: Date): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getChainDisplayName(chain: string): string {
  if (chain === 'avalanche') return 'GUNZ';
  return chain.toUpperCase();
}

interface NFTDetailModalProps {
  nft: NFT | null;
  isOpen: boolean;
  onClose: () => void;
  walletAddress?: string;
  /** All NFTs in the wallet - used for finding related items (skins/attachments) */
  allNfts?: NFT[];
}



export default function NFTDetailModal({ nft, isOpen, onClose, walletAddress, allNfts = [] }: NFTDetailModalProps) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
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

  // Reset UI state when modal opens (pipeline state is managed by the hook)
  useEffect(() => {
    if (isOpen) {
      setActiveItemIndex(0);
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
      const colors = RARITY_COLORS[rarity || ''] || DEFAULT_RARITY_COLORS;
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
      const colors = RARITY_COLORS[rarity || ''] || DEFAULT_RARITY_COLORS;
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

  // Get currently active item (memoized to prevent unnecessary hook re-triggers)
  const activeItem = useMemo(
    () => sortedItems[activeItemIndex] || sortedItems[0],
    [sortedItems, activeItemIndex]
  );

  // =========================================================================
  // Acquisition pipeline hook — manages all data fetching, caching, and resolution
  // =========================================================================
  const {
    loadingDetails,
    currentPurchaseData,
    currentResolvedAcquisition,
    holdingAcquisitionRaw,
    listingsData,
    listingsStatusByTokenId,
    listingsErrorByTokenId,
    holdingAcqStatusByTokenId,
    holdingAcqErrorByTokenId,
  } = useNFTAcquisitionPipeline(nft, activeItem, isOpen, {
    walletAddress,
    debugMode,
    noCacheMode,
    currentGunPrice,
    updateDebugData,
  });


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


  // =============================================================================
  // Canonical cost basis from resolved acquisition (single source of truth)
  // Uses normalizeCostBasis helper for consistent validation
  // =============================================================================
  // Batch purchase detection (before costBasisGun — needed to choose cost source)
  const isBatchPurchase = useMemo(() => {
    const txHash = currentPurchaseData?.acquisitionTxHash
      || currentResolvedAcquisition?.txHash;
    if (!txHash || allNfts.length === 0) return false;
    return allNfts.filter(n => n.acquisitionTxHash === txHash).length > 1;
  }, [currentPurchaseData?.acquisitionTxHash, currentResolvedAcquisition?.txHash, allNfts]);

  const costBasisGun: number | null = useMemo(() => {
    if (!currentResolvedAcquisition) return null;
    // Free transfers have no cost basis; transfers with a known cost (e.g. traced
    // original purchase price) DO have one — fall through to the normal extraction.
    if (currentResolvedAcquisition.acquisitionType === 'TRANSFER') {
      const tracedCost = currentPurchaseData?.purchasePriceGun;
      if (tracedCost !== undefined && tracedCost > 0) {
        return tracedCost;
      }
      return null;
    }

    // For batch Seaport purchases: prefer enrichment (per-item accurate from API).
    // On-chain tx.value and resolved acquisition costGun are batch totals.
    if (currentResolvedAcquisition.acquisitionType === 'PURCHASE' && isBatchPurchase) {
      const enrichmentCost = normalizeCostBasis(nft.purchasePriceGun);
      if (enrichmentCost !== null) return enrichmentCost;
    }

    // Primary: pipeline's purchasePriceGun (applies venue-specific corrections)
    const pipelineCost = normalizeCostBasis(currentPurchaseData?.purchasePriceGun);
    if (pipelineCost !== null) return pipelineCost;

    // For MINT types: prefer decodeCostGun from pipeline
    const decodeCost = normalizeCostBasis(currentPurchaseData?.decodeCostGun);
    if (decodeCost !== null) return decodeCost;

    // Resolved acquisition costGun (raw on-chain — accurate for single-item txs)
    const rawCost = currentResolvedAcquisition.costGun;
    const normalized = normalizeCostBasis(rawCost);
    if (rawCost !== null && rawCost !== undefined && normalized === null) {
      warnOnce(`costBasis:${activeItem?.tokenId ?? 'unknown'}`, 'Anomalous cost basis filtered:', rawCost);
    }
    if (normalized !== null) return normalized;

    // Last resort: enrichment orchestrator data from gallery
    return normalizeCostBasis(nft.purchasePriceGun);
  }, [currentResolvedAcquisition, currentPurchaseData, isBatchPurchase, nft.purchasePriceGun, activeItem?.tokenId]);

  // =============================================================================
  // Batch purchase detection — find sibling items from the same transaction
  // =============================================================================
  const batchInfo = useMemo(() => {
    const txHash = currentPurchaseData?.acquisitionTxHash
      || currentResolvedAcquisition?.txHash;
    if (!txHash || allNfts.length === 0) return null;

    const currentTokenId = activeItem?.tokenId;
    const siblings = allNfts.filter(n =>
      n.acquisitionTxHash === txHash && n.tokenId !== currentTokenId
    );
    if (siblings.length === 0) return null;

    const siblingGun = siblings.reduce((sum, n) => sum + (n.purchasePriceGun ?? 0), 0);
    const totalGun = siblingGun + (costBasisGun ?? 0);

    return {
      count: siblings.length + 1,
      siblings,
      totalGun,
    };
  }, [currentPurchaseData?.acquisitionTxHash, currentResolvedAcquisition?.txHash, allNfts, activeItem?.tokenId, costBasisGun]);

  // =============================================================================
  // Canonical market inputs (single source of truth for hero + position label)
  // Memoized to prevent recomputation on every render
  // =============================================================================
  const marketInputs = useMemo(
    () => computeMarketInputs(listingsData, nft.floorPrice, nft.ceilingPrice, {
      currentLowestListing: nft.currentLowestListing,
      comparableSalesMedian: nft.comparableSalesMedian,
      rarityFloor: nft.rarityFloor,
    }),
    [listingsData, nft.floorPrice, nft.ceilingPrice, nft.currentLowestListing, nft.comparableSalesMedian, nft.rarityFloor]
  );

  // Market reference values for display (uses marketInputs)
  const marketRef = useMemo(() => ({
    hasMarketData: marketInputs.ref !== null,
    gunValue: marketInputs.ref,
    usdValue: marketInputs.ref !== null && currentGunPrice ? marketInputs.ref * currentGunPrice : undefined,
    dataQuality: marketInputs.dataQuality,
  }), [marketInputs, currentGunPrice]);

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
                    originShortName={getItemOrigin(nft.name)?.shortName}
                    originCategory={getItemOrigin(nft.name)?.category}
                  />
                </div>
              </div>

              {/* ===== 2.5) YOUR POSITION Section ===== */}
              {walletAddress && (
                <NFTDetailPositionCard
                  nft={nft}
                  costBasisGun={costBasisGun}
                  currentPurchaseData={currentPurchaseData}
                  currentResolvedAcquisition={currentResolvedAcquisition}
                  holdingAcquisitionRaw={holdingAcquisitionRaw}
                  currentGunPrice={currentGunPrice}
                  marketInputs={marketInputs}
                  marketRef={marketRef}
                  loadingDetails={loadingDetails}
                  batchInfo={batchInfo}
                  priceConfidence={currentPurchaseData?.priceConfidence}
                />
              )}

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
            <WeaponLabPanel
              relatedItems={relatedItems}
              relatedItemsExpanded={relatedItemsExpanded}
              onClose={() => setRelatedItemsExpanded(false)}
            />
          )}
        </div>
      </div>

    </>,
    document.body
  );
}
