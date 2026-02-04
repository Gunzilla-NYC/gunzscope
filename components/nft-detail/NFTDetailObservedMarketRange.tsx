/**
 * NFT Detail Observed Market Range
 *
 * RENDER ONLY: No computations, no fetching, no derive logic.
 * All market inputs computed via computeMarketInputs() in parent.
 * Cost basis comes from parent's normalizeCostBasis() call.
 */

import type { MarketRangeViewModel, GetPositionOnRangeFn } from './types';
import type { MarketInputs, FetchStatus } from '@/lib/nft/nftDetailHelpers';

// =============================================================================
// Props (extends view model with pure display function)
// =============================================================================

interface NFTDetailObservedMarketRangeProps extends MarketRangeViewModel {
  /** Calculate position on range bar (0-100%) - pure function */
  getPositionOnRange: GetPositionOnRangeFn;
}

// =============================================================================
// Component
// =============================================================================

export function NFTDetailObservedMarketRange({
  show,
  loading,
  marketInputs,
  costBasisGun,
  getPositionOnRange,
  listingsStatus,
  listingsError,
}: NFTDetailObservedMarketRangeProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="py-4 border-t border-white/[0.12]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/65 mb-3">
        Observed Market Range
      </p>

      {loading ? (
        // Loading skeleton
        <div className="space-y-3">
          <div className="h-3 bg-white/10 rounded-full animate-pulse" />
          <div className="flex justify-between">
            <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
            <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
            <div className="h-8 w-12 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      ) : (
        <MarketRangeContent
          marketInputs={marketInputs}
          costBasisGun={costBasisGun}
          getPositionOnRange={getPositionOnRange}
          listingsStatus={listingsStatus}
          listingsError={listingsError}
        />
      )}
    </div>
  );
}

// =============================================================================
// Internal Content Component
// =============================================================================

interface MarketRangeContentProps {
  marketInputs: MarketInputs;
  costBasisGun: number | null;
  getPositionOnRange: (value: number, low: number, high: number) => number;
  listingsStatus: FetchStatus;
  listingsError: string | null;
}

function MarketRangeContent({
  marketInputs,
  costBasisGun,
  getPositionOnRange,
  listingsStatus,
  listingsError,
}: MarketRangeContentProps) {
  // Compute display state once
  const hasLow = marketInputs.low !== null && Number.isFinite(marketInputs.low);
  const hasHigh = marketInputs.high !== null && Number.isFinite(marketInputs.high);
  const hasBothBounds = hasLow && hasHigh;
  const hasOneBound = (hasLow || hasHigh) && !hasBothBounds;
  const boundsAreEqual = hasBothBounds && marketInputs.low === marketInputs.high;
  const singleValue = hasOneBound
    ? (hasLow ? marketInputs.low : marketInputs.high)
    : boundsAreEqual
      ? marketInputs.low
      : null;

  // Case 1: Both bounds exist and are different - full range bar
  if (hasBothBounds && !boundsAreEqual) {
    const low = marketInputs.low!;
    const high = marketInputs.high!;
    const avg = marketInputs.ref ?? (low + high) / 2;

    return (
      <div className="space-y-3">
        {/* Horizontal range bar (bullet chart pattern) */}
        <div className="relative h-3">
          {/* Base range bar - neutral gray */}
          <div className="absolute inset-0 bg-white/10 rounded-full" />

          {/* Average tick - subtle white vertical line */}
          {(() => {
            const avgPos = getPositionOnRange(avg, low, high);
            return (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/40"
                style={{ left: `${avgPos}%`, transform: 'translateX(-50%)' }}
              />
            );
          })()}

          {/* Acquisition price marker - dot (uses costBasisGun from resolved acquisition) */}
          {costBasisGun !== null && Number.isFinite(costBasisGun) && (
            (() => {
              const acqPos = getPositionOnRange(costBasisGun, low, high);
              const isGoodDeal = costBasisGun < avg;
              return (
                <div
                  className="absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-[#0d0d0d] animate-[scale-in_0.3s_ease-out_0.2s_both]"
                  style={{
                    left: `${acqPos}%`,
                    backgroundColor: isGoodDeal ? 'var(--gs-profit)' : 'var(--gs-loss)',
                  }}
                  title={`Your cost: ${costBasisGun.toLocaleString()} GUN`}
                />
              );
            })()
          )}

          {/* Current reference marker - emphasized diamond/dot */}
          {marketInputs.ref !== null && Number.isFinite(marketInputs.ref) && (
            (() => {
              const refPos = getPositionOnRange(marketInputs.ref, low, high);
              return (
                <div
                  className="absolute top-1/2 w-3 h-3 rotate-45 border-2 border-[#0d0d0d]"
                  style={{
                    left: `${refPos}%`,
                    transform: 'translate(-50%, -50%) rotate(45deg)',
                    backgroundColor: '#00ffc8',
                  }}
                  title={`Current: ${marketInputs.ref.toLocaleString()} GUN`}
                />
              );
            })()
          )}
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs">
          <div className="text-left">
            <p className="text-white/40">Low</p>
            <p className="font-medium text-white/70">
              {low.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center">
            <p className="text-white/40">Avg</p>
            <p className="font-medium text-white/70">
              {avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/40">High</p>
            <p className="font-medium text-white/70">
              {high.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Helper text + data quality */}
        <p className="text-[10px] text-white/40 text-center">
          Based on observed listings
          {marketInputs.dataQuality && (
            <span className="ml-1">· Quality: <span className="capitalize">{marketInputs.dataQuality}</span></span>
          )}
        </p>

        {/* Acquisition comparison callout */}
        {costBasisGun !== null && Number.isFinite(costBasisGun) && (() => {
          const isBelow = costBasisGun < avg;
          const pctDiff = ((avg - costBasisGun) / avg) * 100;
          return (
            <p className={`text-[10px] text-center ${isBelow ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-loss)]'}`}>
              Your cost is {Math.abs(pctDiff).toFixed(0)}% {isBelow ? 'below' : 'above'} average
            </p>
          );
        })()}
      </div>
    );
  }

  // Case 2: Single bound OR equal bounds - single point display
  if (singleValue !== null) {
    const label = boundsAreEqual ? 'Single Price Point' : (hasLow ? 'Floor Only' : 'Ceiling Only');
    return (
      <div className="space-y-3">
        {/* Centered single marker */}
        <div className="relative h-3 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-[#00ffc8] border-2 border-[#0d0d0d]" />
        </div>

        {/* Single value display */}
        <div className="text-center text-xs">
          <p className="text-white/40">{label}</p>
          <p className="font-medium text-white/70">
            {singleValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
          </p>
        </div>

        {/* Acquisition comparison if available */}
        {costBasisGun !== null && Number.isFinite(costBasisGun) && (
          <p className="text-[10px] text-white/40 text-center">
            Your cost: {costBasisGun.toLocaleString(undefined, { maximumFractionDigits: 0 })} GUN
            {costBasisGun < singleValue && <span className="text-emerald-400/70 ml-1">(below market)</span>}
            {costBasisGun > singleValue && <span className="text-rose-400/70 ml-1">(above market)</span>}
          </p>
        )}

        {/* Helper text */}
        <p className="text-[10px] text-white/40 text-center">
          Limited market data available
        </p>
      </div>
    );
  }

  // Case 3: No data at all
  // Check if there was a listings error for this token
  if (listingsError || listingsStatus === 'error') {
    return (
      <div className="text-center py-2 space-y-1">
        <p className="text-xs text-rose-400/80 flex items-center justify-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Unable to fetch market data
        </p>
        <p className="text-[10px] text-white/40">
          {listingsError || 'Marketplace API unavailable'}
        </p>
      </div>
    );
  }

  return (
    <p className="text-xs text-white/50 text-center py-2">
      Not enough market data to display range
    </p>
  );
}
