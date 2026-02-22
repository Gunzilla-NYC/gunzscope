'use client';

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
      style={{ backgroundColor: 'rgba(166, 247, 0, 0.06)' }}
    >
      {loadingDetails ? (
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer" />
          <div className="h-4 w-36 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.1s]" />
          <div className="h-4 w-32 bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%] rounded animate-shimmer [animation-delay:0.2s]" />
        </div>
      ) : (
        <div>
          {/* ─── Group 1: Cost Basis ─── */}
          {costBasisGun !== null && (
            <>
              <div className="flex items-center gap-2 mt-4 mb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">Cost Basis</span>
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
                        {/* Current item */}
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[11px] text-[var(--gs-lime)] truncate max-w-[160px]">
                            {nft.name}{nft.mintNumber ? ` #${nft.mintNumber}` : ''}
                          </span>
                          <span className="text-[11px] text-white/70 tabular-nums whitespace-nowrap">
                            {costBasisGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
                          </span>
                        </div>
                        {/* Sibling items */}
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
                <div className="flex-1 h-px bg-white/8" />
                {batchInfo && (
                  <span className="font-mono text-[8px] uppercase tracking-wider text-white/25 whitespace-nowrap">
                    {batchInfo.count} items
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-medium text-white/80 tabular-nums">
                  {costBasisGun.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
                </span>
                {costBasisUsdAtAcquisition !== null && (
                  <span className="text-[13px] text-white/50 tabular-nums inline-flex items-center gap-1">
                    ${costBasisUsdAtAcquisition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {priceConfidence === 'estimated' && (
                      <InfoTooltip>
                        <p className="text-[10px] text-white/50">
                          Historical GUN price estimated from nearest available date.
                          Actual cost basis may differ slightly.
                        </p>
                      </InfoTooltip>
                    )}
                  </span>
                )}
              </div>
            </>
          )}

          {/* ─── Group 2: GUN Based Performance ─── */}
          {costBasisGun !== null && currentGunPrice !== null && (
            <>
              <div className="flex items-center gap-2 mt-4 mb-2">
                <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">GUN Based Performance</span>
                <div className="flex-1 h-px bg-white/8" />
                {xgunUnrealizedUsd !== null && xgunUnrealizedPct !== null && (
                  <span className={`font-mono text-[11px] font-medium tabular-nums ${
                    xgunUnrealizedUsd > 0.01 ? 'text-[var(--gs-lime)]' :
                    xgunUnrealizedUsd < -0.01 ? 'text-[var(--gs-loss)]' :
                    'text-white/60'
                  }`}>
                    {xgunUnrealizedUsd >= 0 ? '+' : '-'}${Math.abs(xgunUnrealizedUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    {' '}({xgunUnrealizedPct >= 0 ? '+' : ''}{xgunUnrealizedPct.toFixed(1)}%)
                  </span>
                )}
              </div>
              {/* Hero number — what your GUN costs today */}
              <p className="font-display text-2xl font-bold text-white tabular-nums">
                ${(costBasisGun * currentGunPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              {costBasisUsdAtAcquisition !== null && (
                <p className="text-[11px] text-white/30 mt-1">
                  The {nft.name} cost you ${costBasisUsdAtAcquisition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} at purchase.
                </p>
              )}
              <p className="text-[11px] text-white/30">
                Spending the same {costBasisGun.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} GUN today would cost ${(costBasisGun * currentGunPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
              </p>
            </>
          )}

          {/* ─── Group 2.5: Market Reference ─── */}
          <div className="flex items-center gap-2 mt-4 mb-2">
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">Market Reference</span>
            <div className="flex-1 h-px bg-white/8" />
            {/* Position pill */}
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
          {loadingDetails ? (
            <div className="space-y-2">
              <div className="h-7 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-40 bg-white/10 rounded animate-pulse" />
            </div>
          ) : marketRef.hasMarketData ? (
            <div className="space-y-1">
              <p className="font-display text-[22px] font-semibold text-white tabular-nums">
                ≈ ${marketRef.usdValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'} USD
              </p>
              <p className="text-[13px] font-medium text-white/85">
                ≈ {marketRef.gunValue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN
              </p>
              {/* Unrealized P/L percent line */}
              {positionLabel.pnlPct !== null && (
                <p className={`text-xs ${
                  positionLabel.state === 'UP' ? 'text-[var(--gs-lime)]' :
                  positionLabel.state === 'DOWN' ? 'text-[var(--gs-loss)]' :
                  'text-white/70'
                }`}>
                  Unrealized: {positionLabel.pnlPct >= 0 ? '+' : ''}{(positionLabel.pnlPct * 100).toFixed(1)}%
                </p>
              )}
              {/* Data Quality - neutral styling, spread-based only */}
              {positionLabel.dataQuality && (
                <p
                  className="text-data text-white/60 mt-2 inline-flex items-center gap-1 cursor-help"
                  title="Based on observed price range only. Listings are sparse and may not reflect actual sale prices."
                >
                  Data Quality:{' '}
                  <span className="capitalize">{positionLabel.dataQuality}</span>
                  <svg className="w-3 h-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-base font-medium text-white/85">No active listings found</p>
              <p className="text-xs text-white/60">
                This is an illiquid market; reference values may be unavailable.
              </p>
            </div>
          )}

          {/* ─── Group 3: Acquisition Details ─── */}
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
