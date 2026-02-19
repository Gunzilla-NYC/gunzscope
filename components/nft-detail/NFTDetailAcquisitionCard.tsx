/**
 * NFT Detail Acquisition Card
 *
 * RENDER ONLY: No computations, no fetching, no derive logic.
 * All acquisition data derivation happens in the parent component.
 */

import type {
  AcquisitionCardViewModel,
  FormatDateFn,
  GetVenueDisplayLabelFn,
} from './types';
import { gunzExplorerAddressUrl, gunzExplorerTxUrl } from '@/lib/explorer';

// =============================================================================
// Props (extends view model with pure display functions)
// =============================================================================

interface NFTDetailAcquisitionCardProps extends AcquisitionCardViewModel {
  /** Format a Date to display string */
  formatDate: FormatDateFn;
  /** Get display label for acquisition venue */
  getVenueDisplayLabel: GetVenueDisplayLabelFn;
}

// =============================================================================
// Component
// =============================================================================

export function NFTDetailAcquisitionCard({
  status,
  error,
  data,
  fallbackTxHash,
  marketplaceConfigured,
  formatDate,
  getVenueDisplayLabel,
}: NFTDetailAcquisitionCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-full flex flex-col">
      {/* Card title with status indicator */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold tracking-wide text-white/80">
          Acquisition
        </h4>
        {status === 'loading' && (
          <span className="text-xs text-white/40 italic">Loading acquisition…</span>
        )}
        {status === 'error' && error && (
          <span className="inline-flex items-center gap-1 text-xs text-amber-400/80" title={error}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Unable to fetch
          </span>
        )}
      </div>
      <div className="h-px bg-white/10 mb-4" />

      {/* Top section: Source, Acquired on, Cost */}
      <div className="flex-1 space-y-4">
        {/* Source row */}
        {data?.acquisitionVenue && data.acquisitionVenue !== 'unknown' && (
          <div>
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Source</p>
            <p className={`text-base font-medium ${
              data.acquisitionVenue === 'opensea' ? 'text-blue-400' :
              data.acquisitionVenue === 'otg_marketplace' ? 'text-purple-400' :
              data.acquisitionVenue === 'decoder' ? 'text-amber-400' :
              data.acquisitionVenue === 'mint' ? 'text-green-400' :
              'text-white/90'
            }`}>
              {getVenueDisplayLabel(data.acquisitionVenue, (data.decodeCostGun ?? 0) > 0)}
            </p>
          </div>
        )}

        {/* Acquired on row */}
        {data?.purchaseDate && (
          <div>
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Acquired on</p>
            <p className="text-base font-medium text-white/90 tabular-nums">{formatDate(data.purchaseDate)}</p>
          </div>
        )}

        {/* Cost row - multiple conditions */}
        {data?.decodeCostGun !== undefined && data.decodeCostGun > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Decode Cost</p>
            {data.decodeCostUsd !== undefined ? (
              <>
                <p className="text-base font-medium text-amber-300 tabular-nums">
                  ${data.decodeCostUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-sm text-white/45 tabular-nums">
                  {data.decodeCostGun.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} GUN
                </p>
              </>
            ) : (
              <p className="text-base font-medium text-amber-300 tabular-nums">
                {data.decodeCostGun.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} GUN
              </p>
            )}
          </div>
        ) : data?.isFreeTransfer ? (
          <>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Cost</p>
              <p className="text-base font-medium text-white/90 tabular-nums">
                0.00 GUN
                <span className="text-sm text-white/55">
                  <span className="mx-2">·</span>
                  {data.acquisitionVenue === 'mint' ? 'Mint' :
                    data.acquisitionVenue === 'decoder' ? 'Decoded' :
                    'Transfer'}
                </span>
              </p>
            </div>
            {data.transferredFrom && (
              <div>
                <p className="text-xs uppercase tracking-wider text-white/55 mb-1">From</p>
                <a
                  href={gunzExplorerAddressUrl(data.transferredFrom)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-base font-medium text-[#64ffff] hover:text-[#96aaff] hover:underline underline-offset-2 transition tabular-nums"
                  title={data.transferredFrom}
                >
                  {data.transferredFrom.slice(0, 6)}...{data.transferredFrom.slice(-4)}
                </a>
              </div>
            )}
          </>
        ) : data?.purchasePriceGun !== undefined ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Cost</p>
            {data.purchasePriceUsd !== undefined ? (
              <>
                <p className="text-base font-medium text-white/90 tabular-nums">
                  ${data.purchasePriceUsd.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-sm text-white/45 tabular-nums">
                  {data.purchasePriceGun.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} GUN
                </p>
              </>
            ) : (
              <p className="text-base font-medium text-white/90 tabular-nums">
                {data.purchasePriceGun.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} GUN
              </p>
            )}
          </div>
        ) : !marketplaceConfigured && data?.acquiredAt ? (
          <div>
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Cost</p>
            <p className="text-sm text-white/40 italic">Marketplace data unavailable</p>
          </div>
        ) : null}
      </div>

      {/* Bottom section: Transaction (anchored at bottom) */}
      {(() => {
        const txHash = data?.marketplaceTxHash
          || data?.acquisitionTxHash
          || fallbackTxHash;

        if (!txHash) return null;

        return (
          <div className="mt-auto pt-4">
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Transaction</p>
            <a
              href={gunzExplorerTxUrl(txHash)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-base font-medium text-[#64ffff] hover:text-[#96aaff] hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:rounded-sm transition"
              title={txHash}
            >
              View on Gunzscan
              <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        );
      })()}
    </div>
  );
}
