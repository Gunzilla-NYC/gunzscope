'use client';

import { useState } from 'react';
import { NFT } from '@/lib/types';
import type { MarketInputs, DataQualityLevel } from '@/lib/nft/types';
import type { AcquisitionData, ResolvedAcquisition } from '@/lib/hooks/useNFTAcquisitionPipeline';
import type { NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';
import {
  getPositionLabel,
  getVenueDisplayLabel,
} from '@/lib/nft/nftDetailHelpers';
import { gunzExplorerTxUrl } from '@/lib/explorer';
import InfoTooltip from '@/components/ui/InfoTooltip';

// =============================================================================
// Pure helpers (module-level)
// =============================================================================

function formatDate(date?: Date): string {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// Props
// =============================================================================

export interface NFTDetailPositionCardProps {
  nft: NFT;
  costBasisGun: number | null;
  currentPurchaseData?: AcquisitionData;
  currentResolvedAcquisition?: ResolvedAcquisition;
  holdingAcquisitionRaw: NFTHoldingAcquisition | null;
  currentGunPrice: number | null;
  marketInputs: MarketInputs;
  marketRef: {
    hasMarketData: boolean;
    gunValue: number | null;
    usdValue: number | null | undefined;
    dataQuality: DataQualityLevel | null;
  };
  loadingDetails: boolean;
  batchInfo: {
    count: number;
    siblings: NFT[];
    totalGun: number;
  } | null;
  priceConfidence?: 'exact' | 'daily' | 'estimated';
}

// =============================================================================
// Component
// =============================================================================

export function NFTDetailPositionCard({
  nft,
  costBasisGun,
  currentPurchaseData,
  currentResolvedAcquisition,
  holdingAcquisitionRaw,
  currentGunPrice,
  marketInputs,
  marketRef,
  loadingDetails,
  batchInfo,
  priceConfidence,
}: NFTDetailPositionCardProps) {
  // ── Derived USD values ──
  const confirmedEnrichedUsd = nft.purchasePriceUsdEstimated === false
    && nft.purchasePriceUsd != null && nft.purchasePriceUsd > 0
    ? nft.purchasePriceUsd : null;
  const costBasisUsdAtAcquisition = confirmedEnrichedUsd
    ?? (currentPurchaseData?.purchasePriceUsd && currentPurchaseData.purchasePriceUsd > 0 ? currentPurchaseData.purchasePriceUsd : undefined)
    ?? (currentPurchaseData?.decodeCostUsd && currentPurchaseData.decodeCostUsd > 0 ? currentPurchaseData.decodeCostUsd : undefined)
    ?? (currentResolvedAcquisition?.costUsd && currentResolvedAcquisition.costUsd > 0 ? currentResolvedAcquisition.costUsd : undefined)
    ?? (nft.purchasePriceUsd && nft.purchasePriceUsd > 0 ? nft.purchasePriceUsd : null)
    ?? null;

  // ── xGUN P&L ──
  let xgunUnrealizedUsd: number | null = null;
  let xgunUnrealizedPct: number | null = null;
  if (costBasisUsdAtAcquisition !== null && costBasisUsdAtAcquisition > 0
    && costBasisGun !== null && costBasisGun > 0
    && currentGunPrice !== null && currentGunPrice > 0) {
    const Y = costBasisUsdAtAcquisition / costBasisGun;
    xgunUnrealizedUsd = costBasisGun * (currentGunPrice - Y);
    xgunUnrealizedPct = ((currentGunPrice - Y) / Y) * 100;
  }

  // ── Market Reference helpers ──
  const positionLabel = getPositionLabel({
    acquisitionPriceGun: costBasisGun,
    marketRefGun: marketInputs.ref,
    dataQuality: marketInputs.dataQuality,
  });

  const getPositionPillStyles = () => {
    switch (positionLabel.state) {
      case 'UP':
        return 'bg-[var(--gs-lime)]/10 text-[var(--gs-lime)] border border-[var(--gs-lime)]/20';
      case 'DOWN':
        return 'bg-[var(--gs-loss)]/10 text-[var(--gs-loss)] border border-[var(--gs-loss)]/20';
      case 'FLAT':
        return 'bg-white/5 text-white/70 border border-white/10';
      default:
        return 'bg-transparent text-white/60 border border-white/10';
    }
  };

  const getPositionPillText = () => {
    switch (positionLabel.state) {
      case 'UP': return 'Up';
      case 'DOWN': return 'Down';
      case 'FLAT': return 'Flat';
      case 'NO_COST_BASIS': return 'No cost basis';
      case 'NO_MARKET_REF': return 'No market ref';
    }
  };

  const getPositionIcon = () => {
    switch (positionLabel.state) {
      case 'UP': return <span className="text-caption">↗</span>;
      case 'DOWN': return <span className="text-caption">↘</span>;
      case 'FLAT': return <span className="text-caption">–</span>;
      default: return <span className="text-caption">•</span>;
    }
  };

  // ── Waterfall dropdown toggle ──
  const [waterfallExpanded, setWaterfallExpanded] = useState(false);

  const getTooltipText = () => {
    if (positionLabel.state === 'NO_COST_BASIS') {
      return "We can't compute your position without an acquisition cost.";
    }
    if (positionLabel.state === 'NO_MARKET_REF') {
      return "No active listings found. Market reference may be unavailable in illiquid markets.";
    }
    let tooltip = "Based on observed listings (low–high). Illiquid markets can be noisy.";
    if (positionLabel.dataQuality) {
      tooltip += ` Data quality: ${positionLabel.dataQuality.charAt(0).toUpperCase() + positionLabel.dataQuality.slice(1)} (based on price spread).`;
    }
    return tooltip;
  };

  return (
    <div
      className="rounded-xl p-4 animate-[fade-in-up_0.4s_ease-out_0.1s_both]"
    >
      {loadingDetails ? (
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer" />
          <div className="h-4 w-36 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.1s]" />
          <div className="h-4 w-32 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.2s]" />
        </div>
      ) : (
        <div>
          {/* ─── Track A: Your Deal (Cost Basis + GUN Appreciation) ─── */}
          {costBasisGun !== null && currentGunPrice !== null && (
            <div className="mt-4 bg-[var(--gs-dark-3)] border border-white/[0.06] rounded-lg border-l-[3px] p-5" style={{ borderLeftColor: 'var(--gs-lime)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-[var(--gs-lime)]">Your Deal</span>
                {batchInfo && (
                  <InfoTooltip wide>
                    <div className="space-y-2">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                        Batch Purchase ({batchInfo.count} items)
                      </p>
                      {batchInfo.totalGun > 0 && (
                        <p className="text-[11px] text-white/50">
                          Total: {batchInfo.totalGun.toLocaleString(undefined, { maximumFractionDigits: 2 })} GUN
                        </p>
                      )}
                      <div className="border-t border-white/10 pt-1.5 space-y-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[11px] text-[var(--gs-lime)] truncate max-w-[160px]">
                            {nft.name}{nft.mintNumber ? ` #${nft.mintNumber}` : ''}
                          </span>
                          <span className="text-[11px] text-white/70 tabular-nums whitespace-nowrap">
                            {costBasisGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
                          </span>
                        </div>
                        {batchInfo.siblings.map(s => (
                          <div key={s.tokenId} className="flex items-baseline justify-between gap-3">
                            <span className="text-[11px] text-white/50 truncate max-w-[160px]">
                              {s.name}{s.mintNumber ? ` #${s.mintNumber}` : ''}
                            </span>
                            <span className="text-[11px] text-white/40 tabular-nums whitespace-nowrap">
                              {s.purchasePriceGun
                                ? `${s.purchasePriceGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN`
                                : '\u2014'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </InfoTooltip>
                )}
              </div>

              {/* Cost Basis row */}
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">Cost Basis</span>
                <span className="font-display text-[14px] font-semibold text-white tabular-nums text-right">
                  {costBasisGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                  {costBasisUsdAtAcquisition !== null && (
                    <>
                      <span className="text-white/30 mx-0.5">&rarr;</span>
                      <span className="text-white/50">
                        ${costBasisUsdAtAcquisition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </>
                  )}
                  {priceConfidence === 'estimated' && (
                    <span className="inline-flex align-middle ml-0.5">
                      <InfoTooltip>
                        <p className="text-[10px] text-white/50">
                          Historical GUN price estimated from nearest available date.
                          Actual cost basis may differ slightly.
                        </p>
                      </InfoTooltip>
                    </span>
                  )}
                </span>
              </div>

              {/* Today's Value row */}
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">Today&apos;s Value</span>
                <span className="font-display text-[14px] font-semibold text-white tabular-nums text-right">
                  {costBasisGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                  <span className="text-white/30 mx-0.5">&rarr;</span>
                  <span className="text-white/50">
                    ${(costBasisGun * currentGunPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </span>
              </div>

              {/* Divider + P&L */}
              <div className="border-t border-white/[0.06] pt-3 mt-3">
                {xgunUnrealizedUsd !== null && xgunUnrealizedPct !== null ? (
                  <>
                    <div className="flex items-baseline justify-between">
                      <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">P&L</span>
                      <span className={`font-display text-[20px] font-bold tabular-nums text-right ${
                        xgunUnrealizedUsd > 0.01 ? 'text-[var(--gs-profit)]' :
                        xgunUnrealizedUsd < -0.01 ? 'text-[var(--gs-loss)]' :
                        'text-white/60'
                      }`}>
                        {xgunUnrealizedUsd >= 0 ? '+' : '\u2013'}${Math.abs(xgunUnrealizedUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {' '}
                        <span className="text-[13px] font-semibold">
                          ({xgunUnrealizedPct >= 0 ? '+' : ''}{xgunUnrealizedPct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <p className="text-[11px] font-light text-[var(--gs-gray-2)] italic mt-1 text-right">
                      The GUN you spent has appreciated since purchase
                    </p>
                  </>
                ) : (
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">Value</span>
                    <span className="font-display text-[20px] font-bold text-white tabular-nums text-right">
                      ${(costBasisGun * currentGunPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── Track B: Market Reality (Comparable Sales + Listings) ─── */}
          {(() => {
            // Use same waterfall as card's deriveCardData() so both views agree
            const marketValueGun = nft.comparableSalesMedian ?? nft.rarityFloor ?? nft.currentLowestListing;
            const exitGun = nft.marketExitGun ?? (marketValueGun && marketValueGun > 0 ? marketValueGun : null);
            const exitTierLabel = nft.marketExitTierLabel
              ?? (nft.comparableSalesMedian ? 'VIA SALES'
                : nft.rarityFloor ? 'RARITY'
                : nft.currentLowestListing ? 'LISTED'
                : null);
            const hasTrackB = exitGun != null && exitGun > 0;
            const hasMarket = marketRef.hasMarketData;
            // Sales-based tiers (1-4) get full Market Reality treatment; proxies (5-6) get dimmer Reference Estimate
            const SALES_LABELS = new Set(['EXACT', 'VIA SALES', 'VIA SKIN', 'VIA WEAPON']);
            const isSalesBased = exitTierLabel !== null && SALES_LABELS.has(exitTierLabel);

            if (!hasTrackB && !hasMarket) {
              return (
                <div className="mt-4 bg-[var(--gs-dark-3)] border border-white/[0.06] rounded-lg border-l-[3px] p-5" style={{ borderLeftColor: 'var(--gs-purple)' }}>
                  <span className="font-mono text-[10px] uppercase tracking-[2px] text-[var(--gs-purple)]">Market Reality</span>
                  <p className="text-[13px] font-medium text-white/85 mt-3">No market data available</p>
                  <p className="text-[11px] font-light text-[var(--gs-gray-2)] italic">This is an illiquid market; reference values may be unavailable.</p>
                </div>
              );
            }

            // ── Low-confidence treatment (rarity floor, collection floor, listed) ──
            if (hasTrackB && !isSalesBased) {
              const tierDisplayName = exitTierLabel === 'RARITY' ? 'Rarity Floor'
                : exitTierLabel === 'FLOOR' ? 'Collection Floor'
                : exitTierLabel === 'LISTED' ? 'Current Listing'
                : exitTierLabel === 'SIMILAR' ? 'Similar Scarcity'
                : 'Estimate';

              // Build all available waterfall tiers for the dropdown
              const waterfallTiers: Array<{ label: string; gun: number; isBest: boolean }> = [];
              if (nft.currentLowestListing && nft.currentLowestListing > 0) {
                waterfallTiers.push({ label: 'Current Listing', gun: nft.currentLowestListing, isBest: false });
              }
              if (nft.comparableSalesMedian && nft.comparableSalesMedian > 0) {
                waterfallTiers.push({ label: 'Comparable Sales', gun: nft.comparableSalesMedian, isBest: false });
              }
              if (nft.rarityFloor && nft.rarityFloor > 0) {
                waterfallTiers.push({ label: 'Rarity Floor', gun: nft.rarityFloor, isBest: false });
              }
              if (nft.floorPrice && nft.floorPrice > 0) {
                waterfallTiers.push({ label: 'Collection Floor', gun: nft.floorPrice, isBest: false });
              }
              // Mark the winning tier
              const bestTier = waterfallTiers.find(t => t.label === tierDisplayName);
              if (bestTier) bestTier.isBest = true;
              // Other tiers = everything except the best
              const otherTiers = waterfallTiers.filter(t => !t.isBest);

              return (
                <div className="mt-4 bg-[var(--gs-dark-3)] border border-white/[0.06] rounded-lg border-l-[3px] p-5 opacity-80" style={{ borderLeftColor: 'var(--gs-purple)' }}>
                  <span className="font-mono text-[10px] uppercase tracking-[2px] text-[var(--gs-purple)]/70 mb-3 block">Reference Estimate</span>

                  {/* Best estimate (primary) */}
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/30 shrink-0 w-[120px]">{tierDisplayName}</span>
                    <span className="font-display text-[14px] font-semibold text-white/70 tabular-nums text-right">
                      ~{Math.round(exitGun!).toLocaleString()} GUN
                      {currentGunPrice ? (
                        <>
                          <span className="text-white/20 mx-0.5">&rarr;</span>
                          <span className="text-white/40">
                            ${(exitGun! * currentGunPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </div>

                  {/* Waterfall dropdown — other available tiers */}
                  {otherTiers.length > 0 && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setWaterfallExpanded(prev => !prev)}
                        className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[1px] text-[var(--gs-purple)]/60 hover:text-[var(--gs-purple)] transition-colors"
                      >
                        <span className={`inline-block transition-transform duration-200 ${waterfallExpanded ? 'rotate-90' : ''}`}>&#9656;</span>
                        {otherTiers.length} other reference{otherTiers.length > 1 ? 's' : ''}
                      </button>

                      {waterfallExpanded && (
                        <div className="mt-2 space-y-1.5 pl-3 border-l border-white/[0.06]">
                          {otherTiers.map(tier => (
                            <div key={tier.label} className="flex items-baseline justify-between">
                              <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/20 shrink-0 w-[120px]">{tier.label}</span>
                              <span className="font-display text-[12px] text-white/40 tabular-nums text-right">
                                ~{Math.round(tier.gun).toLocaleString()} GUN
                                {currentGunPrice ? (
                                  <>
                                    <span className="text-white/15 mx-0.5">&rarr;</span>
                                    <span className="text-white/25">
                                      ${(tier.gun * currentGunPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </>
                                ) : null}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Warning */}
                  <div className="border-t border-white/[0.04] pt-2.5 mt-2.5">
                    <p className="text-[11px] text-white/40 inline-flex items-start gap-1.5">
                      <span className="text-[var(--gs-purple)]/60 shrink-0 mt-px">{'\u26A0'}</span>
                      <span>
                        Based on {exitTierLabel === 'RARITY' ? 'rarity tier average' : exitTierLabel === 'FLOOR' ? 'collection floor' : exitTierLabel === 'LISTED' ? 'current listing price' : 'statistical proxy'}, not actual sales.
                        <br />
                        <span className="text-white/30 italic">No comparable sales found for this item.</span>
                      </span>
                    </p>
                  </div>
                </div>
              );
            }

            // ── Full confidence treatment (sales-based tiers 1-4) ──
            // Compute Track B P&L
            let trackBPnlUsd: number | null = null;
            let trackBPnlPct: number | null = null;
            if (hasTrackB && costBasisUsdAtAcquisition !== null && costBasisUsdAtAcquisition > 0 && currentGunPrice) {
              const exitUsd = exitGun! * currentGunPrice;
              trackBPnlUsd = exitUsd - costBasisUsdAtAcquisition;
              trackBPnlPct = ((exitUsd - costBasisUsdAtAcquisition) / costBasisUsdAtAcquisition) * 100;
            }

            return (
              <div className="mt-4 bg-[var(--gs-dark-3)] border border-white/[0.06] rounded-lg border-l-[3px] p-5" style={{ borderLeftColor: 'var(--gs-purple)' }}>
                <span className="font-mono text-[10px] uppercase tracking-[2px] text-[var(--gs-purple)] mb-3 block">Market Reality</span>

                {loadingDetails ? (
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-white/10 rounded animate-pulse" />
                    <div className="h-5 w-24 bg-white/10 rounded animate-pulse" />
                    <div className="h-7 w-20 bg-white/10 rounded animate-pulse mt-2" />
                  </div>
                ) : (
                  <>
                    {/* Estimated Sale row */}
                    {hasTrackB && (
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">Estimated Sale</span>
                        <span className="font-display text-[14px] font-semibold text-white tabular-nums text-right">
                          ~{Math.round(exitGun!).toLocaleString()} GUN
                          {currentGunPrice ? (
                            <>
                              <span className="text-white/30 mx-0.5">&rarr;</span>
                              <span className="text-white/50">
                                ${(exitGun! * currentGunPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </div>
                    )}
                    {!hasTrackB && hasMarket && (
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">Estimated Sale</span>
                        <span className="font-display text-[14px] font-semibold text-white tabular-nums text-right">
                          ~{marketRef.gunValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                          {marketRef.usdValue != null && (
                            <>
                              <span className="text-white/30 mx-0.5">&rarr;</span>
                              <span className="text-white/50">
                                ${marketRef.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    )}

                    {/* VS Cost row */}
                    {costBasisGun !== null && hasTrackB && costBasisUsdAtAcquisition !== null && currentGunPrice && (
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">VS Cost</span>
                        <span className={`font-display text-[14px] font-semibold tabular-nums text-right ${
                          exitGun! * currentGunPrice > costBasisUsdAtAcquisition ? 'text-[var(--gs-profit)]' :
                          exitGun! * currentGunPrice < costBasisUsdAtAcquisition ? 'text-[var(--gs-loss)]' :
                          'text-white/60'
                        }`}>
                          {(exitGun! * currentGunPrice - costBasisUsdAtAcquisition) >= 0 ? '+' : '\u2013'}${Math.abs(exitGun! * currentGunPrice - costBasisUsdAtAcquisition).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* Divider + Market P&L */}
                    <div className="border-t border-white/[0.06] pt-3 mt-3">
                      {trackBPnlUsd !== null && trackBPnlPct !== null ? (
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">Market P&L</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-display text-[20px] font-bold tabular-nums ${
                              trackBPnlUsd > 0.01 ? 'text-[var(--gs-profit)]' :
                              trackBPnlUsd < -0.01 ? 'text-[var(--gs-loss)]' :
                              'text-white/60'
                            }`}>
                              {trackBPnlPct >= 0 ? '+' : ''}{trackBPnlPct.toFixed(1)}%
                            </span>
                            <div
                              role="status"
                              aria-label={`Position: ${getPositionPillText()}`}
                              className={`h-5 px-2 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 cursor-help ${getPositionPillStyles()}`}
                              title={getTooltipText()}
                            >
                              {getPositionIcon()}
                              {getPositionPillText()}
                            </div>
                          </div>
                        </div>
                      ) : positionLabel.pnlPct !== null ? (
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/40 shrink-0 w-[120px]">Market P&L</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-display text-[20px] font-bold tabular-nums ${
                              positionLabel.state === 'UP' ? 'text-[var(--gs-profit)]' :
                              positionLabel.state === 'DOWN' ? 'text-[var(--gs-loss)]' :
                              'text-white/60'
                            }`}>
                              {positionLabel.pnlPct >= 0 ? '+' : ''}{(positionLabel.pnlPct * 100).toFixed(1)}%
                            </span>
                            <div
                              role="status"
                              aria-label={`Position: ${getPositionPillText()}`}
                              className={`h-5 px-2 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 cursor-help ${getPositionPillStyles()}`}
                              title={getTooltipText()}
                            >
                              {getPositionIcon()}
                              {getPositionPillText()}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Confidence line */}
                    <div className="flex items-center gap-2 mt-3">
                      {exitTierLabel && (
                        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-purple)]/80 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-profit)] inline-block" />
                          {exitTierLabel}
                        </span>
                      )}
                      {positionLabel.dataQuality && (
                        <span
                          className="font-mono text-[9px] text-white/40 cursor-help"
                          title="Based on observed price range only. Listings are sparse and may not reflect actual sale prices."
                        >
                          Data Quality: <span className="capitalize">{positionLabel.dataQuality}</span>
                        </span>
                      )}
                    </div>

                    {/* Waterfall dropdown — other available reference tiers */}
                    {(() => {
                      const tiers: Array<{ label: string; gun: number }> = [];
                      if (nft.currentLowestListing && nft.currentLowestListing > 0) {
                        tiers.push({ label: 'Current Listing', gun: nft.currentLowestListing });
                      }
                      if (nft.comparableSalesMedian && nft.comparableSalesMedian > 0) {
                        tiers.push({ label: 'Comparable Sales', gun: nft.comparableSalesMedian });
                      }
                      if (nft.rarityFloor && nft.rarityFloor > 0) {
                        tiers.push({ label: 'Rarity Floor', gun: nft.rarityFloor });
                      }
                      if (nft.floorPrice && nft.floorPrice > 0) {
                        tiers.push({ label: 'Collection Floor', gun: nft.floorPrice });
                      }
                      // Exclude the tier already shown as the primary estimate
                      const others = tiers.filter(t => Math.round(t.gun) !== Math.round(exitGun!));
                      if (others.length === 0) return null;

                      return (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => setWaterfallExpanded(prev => !prev)}
                            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[1px] text-[var(--gs-purple)]/60 hover:text-[var(--gs-purple)] transition-colors"
                          >
                            <span className={`inline-block transition-transform duration-200 ${waterfallExpanded ? 'rotate-90' : ''}`}>&#9656;</span>
                            {others.length} other reference{others.length > 1 ? 's' : ''}
                          </button>
                          {waterfallExpanded && (
                            <div className="mt-2 space-y-1.5 pl-3 border-l border-white/[0.06]">
                              {others.map(tier => (
                                <div key={tier.label} className="flex items-baseline justify-between">
                                  <span className="font-mono text-[9px] uppercase tracking-[1px] text-white/25 shrink-0 w-[120px]">{tier.label}</span>
                                  <span className="font-display text-[12px] text-white/40 tabular-nums text-right">
                                    ~{Math.round(tier.gun).toLocaleString()} GUN
                                    {currentGunPrice ? (
                                      <>
                                        <span className="text-white/15 mx-0.5">&rarr;</span>
                                        <span className="text-white/25">
                                          ${(tier.gun * currentGunPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                      </>
                                    ) : null}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Subtext */}
                    {hasTrackB && (
                      <p className="text-[11px] font-light text-[var(--gs-gray-2)] italic mt-1">
                        What similar items are actually trading for
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })()}

          {/* ─── Acquisition Details ─── */}
          <div className="flex items-center gap-2 mt-4 mb-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">Acquisition</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>
          <div className="space-y-1.5">
            {/* Source */}
            <div className="flex items-center justify-between">
              <span className="text-data uppercase tracking-wider text-white/40">Source</span>
              {currentPurchaseData?.acquisitionVenue && currentPurchaseData.acquisitionVenue !== 'unknown' ? (
                <span className={`text-[13px] font-medium ${
                  currentPurchaseData.acquisitionVenue === 'opensea' ? 'text-blue-400' :
                  currentPurchaseData.acquisitionVenue === 'otg_marketplace' ? 'text-[var(--gs-purple)]' :
                  currentPurchaseData.acquisitionVenue === 'decode' || currentPurchaseData.acquisitionVenue === 'decoder' ? 'text-[var(--gs-lime)]' :
                  'text-white/90'
                }`}>
                  {getVenueDisplayLabel(currentPurchaseData.acquisitionVenue, (currentPurchaseData.decodeCostGun ?? 0) > 0, currentPurchaseData.isOfferFill)}{batchInfo ? ' (Batch)' : ''}
                </span>
              ) : (
                <span className="text-[13px] font-medium text-white/30">&mdash;</span>
              )}
            </div>
            {/* Date */}
            <div className="flex items-center justify-between">
              <span className="text-data uppercase tracking-wider text-white/40">
                {currentPurchaseData?.acquisitionVenue === 'transfer' && currentPurchaseData?.acquiredAt
                  && currentPurchaseData?.purchaseDate
                  && currentPurchaseData.acquiredAt.getTime() !== currentPurchaseData.purchaseDate.getTime()
                  ? 'Purchased' : 'Acquired'}
              </span>
              {currentPurchaseData?.purchaseDate ? (
                <span className="text-[13px] font-medium text-white/90 tabular-nums">
                  {formatDate(currentPurchaseData.purchaseDate)}
                </span>
              ) : (
                <span className="text-[13px] font-medium text-white/30">&mdash;</span>
              )}
            </div>
            {/* Transferred date — only for transfers where original purchase date differs */}
            {currentPurchaseData?.acquisitionVenue === 'transfer' && currentPurchaseData?.acquiredAt && (
              !currentPurchaseData.purchaseDate || currentPurchaseData.acquiredAt.getTime() !== currentPurchaseData.purchaseDate.getTime()
            ) && (
              <div className="flex items-center justify-between">
                <span className="text-data uppercase tracking-wider text-white/40">Transferred</span>
                <span className="text-[13px] font-medium text-white/70 tabular-nums">
                  {formatDate(currentPurchaseData.acquiredAt)}
                </span>
              </div>
            )}
            {/* Transaction link */}
            <div className="flex items-center justify-between">
              <span className="text-data uppercase tracking-wider text-white/40">Transaction</span>
              {(currentPurchaseData?.marketplaceTxHash || currentPurchaseData?.acquisitionTxHash || holdingAcquisitionRaw?.txHash) ? (
                <a
                  href={gunzExplorerTxUrl(currentPurchaseData?.marketplaceTxHash || currentPurchaseData?.acquisitionTxHash || holdingAcquisitionRaw?.txHash || '')}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] font-medium text-[var(--gs-lime)] hover:text-[var(--gs-purple)] transition inline-flex items-center gap-1"
                >
                  View
                  <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span className="text-[13px] font-medium text-white/30">&mdash;</span>
              )}
            </div>
            {/* Gas fees */}
            {(() => {
              const txFee = currentResolvedAcquisition?.txFeeGun;
              const senderFee = currentResolvedAcquisition?.senderTxFeeGun;
              const isTransfer = currentPurchaseData?.acquisitionVenue === 'transfer'
                || currentResolvedAcquisition?.acquisitionType === 'TRANSFER';
              if (!txFee && !senderFee) return null;
              return (
                <div className="flex items-center justify-between">
                  <span className="text-data uppercase tracking-wider text-white/40">
                    {isTransfer && senderFee ? 'Fees' : 'Gas Fee'}
                  </span>
                  <span className="text-[13px] font-medium text-white/60 tabular-nums">
                    {isTransfer && senderFee && txFee
                      ? `${senderFee.toLocaleString(undefined, { maximumFractionDigits: 4 })} + ${txFee.toLocaleString(undefined, { maximumFractionDigits: 4 })} GUN`
                      : txFee
                        ? `${txFee.toLocaleString(undefined, { maximumFractionDigits: 4 })} GUN`
                        : senderFee
                          ? `${senderFee.toLocaleString(undefined, { maximumFractionDigits: 4 })} GUN`
                          : '\u2014'
                    }
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
