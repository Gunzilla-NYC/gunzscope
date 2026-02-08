/**
 * NFT Detail Debug Panel
 *
 * RENDER ONLY: No computations, no fetching, no derive logic.
 * All debug data is computed in the parent and passed as display-ready values.
 * This component only renders the debug information UI.
 */

import type {
  DebugPanelViewModel,
  ToIsoStringSafeFn,
} from './types';

// =============================================================================
// Props
// =============================================================================

interface NFTDetailDebugPanelProps extends DebugPanelViewModel {
  /** Toggle expanded state callback */
  onToggleExpanded: () => void;
  /** Copy debug data callback */
  onCopyDebugData: () => void;
  /** Pure function to format Date to ISO string */
  toIsoStringSafe: ToIsoStringSafeFn;
}

// =============================================================================
// Component
// =============================================================================

export function NFTDetailDebugPanel({
  show,
  expanded,
  copied,
  debugData,
  metadataDebug,
  currentPurchaseDataJson,
  currentResolvedAcquisition,
  holdingAcquisitionRaw,
  currentGunPrice,
  listingsDataJson,
  listingsStatus,
  listingsError,
  holdingAcqStatus,
  holdingAcqError,
  listingsMapSize,
  holdingAcqMapSize,
  onToggleExpanded,
  onCopyDebugData,
  toIsoStringSafe,
}: NFTDetailDebugPanelProps) {
  if (!show) {
    return null;
  }

  return (
    <div className="border-t border-amber-500/30 pt-3 mt-4">
      <div className="flex items-center justify-between py-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleExpanded();
          }}
          className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          {expanded ? 'Hide Debug Info' : 'Show Debug Info'}
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {expanded && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCopyDebugData();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              copied
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy All
              </>
            )}
          </button>
        )}
      </div>

      {expanded && (
        <div className="mt-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 font-mono text-xs space-y-2 select-text cursor-text">
          {/* NoCache mode indicator */}
          {debugData.noCacheEnabled && (
            <div className="bg-purple-500/20 border border-purple-500/30 rounded px-2 py-1 mb-2">
              <span className="text-purple-300 font-semibold">⚡ noCache mode enabled</span>
              <span className="text-purple-200/70 text-caption ml-2">
                (bypassed: {debugData.cacheBypassed ? 'yes' : 'no'})
              </span>
            </div>
          )}
          {/* Background refresh status - enhanced diagnostics */}
          {debugData.cacheRenderedFirst && (
            <div className={`border rounded px-2 py-1 mb-2 ${
              debugData.refreshError
                ? 'bg-red-500/20 border-red-500/30'
                : debugData.backgroundRefreshUpdated
                  ? 'bg-green-500/20 border-green-500/30'
                  : 'bg-blue-500/20 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${
                  debugData.refreshError ? 'text-red-300' :
                  debugData.backgroundRefreshUpdated ? 'text-green-300' : 'text-blue-300'
                }`}>
                  {debugData.refreshError ? '❌' : debugData.backgroundRefreshUpdated ? '✅' : '🔄'} Background refresh
                </span>
                <span className="text-caption text-white/60">
                  attempted: {debugData.backgroundRefreshAttempted ? 'yes' : 'no'},
                  updated: {debugData.backgroundRefreshUpdated ? 'yes' : 'no'}
                </span>
              </div>
              {/* Detailed refresh diagnostics */}
              {debugData.backgroundRefreshAttempted && (
                <div className="mt-1 text-caption space-y-0.5">
                  {debugData.refreshStartedAtIso && (
                    <div>
                      <span className="text-white/50">started:</span>{' '}
                      <span className="text-white/70">{debugData.refreshStartedAtIso}</span>
                    </div>
                  )}
                  {debugData.refreshFinishedAtIso && (
                    <div>
                      <span className="text-white/50">finished:</span>{' '}
                      <span className="text-white/70">{debugData.refreshFinishedAtIso}</span>
                    </div>
                  )}
                  {debugData.refreshDecision && (
                    <div>
                      <span className="text-white/50">decision:</span>{' '}
                      <span className={`font-semibold ${
                        debugData.refreshDecision === 'updated' ? 'text-green-400' :
                        debugData.refreshDecision === 'error' ? 'text-red-400' :
                        'text-amber-400'
                      }`}>{debugData.refreshDecision}</span>
                    </div>
                  )}
                  {(debugData.refreshExistingScore !== null || debugData.refreshNewScore !== null) && (
                    <div>
                      <span className="text-white/50">scores:</span>{' '}
                      <span className="text-white/70">
                        existing={debugData.refreshExistingScore ?? 'none'} → new={debugData.refreshNewScore ?? 'none'}
                      </span>
                    </div>
                  )}
                  {debugData.refreshResultSummary && (
                    <div className="mt-1 p-1 bg-black/30 rounded">
                      <span className="text-white/50">summary:</span>{' '}
                      <span className={`${
                        debugData.refreshError ? 'text-red-300' :
                        debugData.backgroundRefreshUpdated ? 'text-green-300' : 'text-amber-300'
                      }`}>{debugData.refreshResultSummary}</span>
                    </div>
                  )}
                  {debugData.refreshError && (
                    <div className="mt-1 p-1 bg-red-500/20 rounded">
                      <span className="text-red-300">error:</span>{' '}
                      <span className="text-red-200">{debugData.refreshError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div>
            <span className="text-amber-400/70">tokenKey:</span>{' '}
            <span className="text-amber-200 break-all">{debugData.tokenKey || '(not set)'}</span>
          </div>
          <div>
            <span className="text-amber-400/70">cacheKey:</span>{' '}
            <span className="text-amber-200 break-all text-caption">{debugData.cacheKey || '(not set)'}</span>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-amber-400/70">cacheHit:</span>{' '}
              <span className={debugData.cacheHit ? 'text-green-400' : 'text-rose-400'}>
                {debugData.cacheHit ? 'true' : 'false'}
              </span>
            </div>
            <div>
              <span className="text-amber-400/70">reason:</span>{' '}
              <span className="text-amber-200">{debugData.cacheReason || '—'}</span>
            </div>
          </div>
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-amber-400/70">priceSource:</span>{' '}
            <span className={`font-semibold ${
              debugData.priceSource === 'onchain' ? 'text-purple-400' :
              debugData.priceSource === 'transfers' ? 'text-green-400' :
              debugData.priceSource === 'localStorage' ? 'text-blue-400' :
              'text-rose-400'
            }`}>
              {debugData.priceSource}
            </span>
          </div>
          {/* Metadata Debug Section */}
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-green-400 font-semibold">metadata debug:</span>
            <div className="mt-1 ml-2 text-caption space-y-1">
              <div>
                <span className="text-green-400/50">metadataSource:</span>{' '}
                <span className={`font-semibold ${
                  metadataDebug?.metadataSource === 'tokenURI' ? 'text-green-400' :
                  metadataDebug?.metadataSource === 'gunzscan' ? 'text-blue-400' :
                  'text-rose-400'
                }`}>
                  {metadataDebug?.metadataSource ?? 'unknown'}
                </span>
              </div>
              <div>
                <span className="text-green-400/50">hasDescription:</span>{' '}
                <span className={metadataDebug?.hasDescription ? 'text-green-400' : 'text-rose-400'}>
                  {metadataDebug?.hasDescription?.toString() ?? 'false'}
                </span>
              </div>
              <div>
                <span className="text-green-400/50">descriptionLength:</span>{' '}
                <span className="text-green-200/80">{metadataDebug?.descriptionLength ?? 0}</span>
              </div>
              <div>
                <span className="text-green-400/50">tokenURI:</span>{' '}
                <span className="text-green-200/80 break-all text-label">
                  {metadataDebug?.tokenURI
                    ? (metadataDebug.tokenURI.length > 200
                        ? metadataDebug.tokenURI.slice(0, 200) + '...'
                        : metadataDebug.tokenURI)
                    : '(not set)'}
                </span>
              </div>
              {metadataDebug?.error && (
                <div>
                  <span className="text-rose-400/50">error:</span>{' '}
                  <span className="text-rose-300">{metadataDebug.error}</span>
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-amber-400/70">acquisition (full):</span>
            <pre className="text-amber-200 mt-1 whitespace-pre-wrap break-all text-caption">
{currentPurchaseDataJson}
            </pre>
          </div>
          {/* Debug: Resolved Acquisition (deterministic, no-downgrade) */}
          <div className="border-t border-purple-500/20 pt-2 bg-purple-500/5 -mx-3 px-3 py-2 rounded">
            <span className="text-purple-400 font-semibold">resolved acquisition (deterministic):</span>
            <div className="mt-2 ml-2 text-caption space-y-1">
              <div>
                <span className="text-purple-400/50">qualityScore:</span>{' '}
                <span className={`font-bold ${
                  (currentResolvedAcquisition?.qualityScore ?? -100) >= 150 ? 'text-green-400' :
                  (currentResolvedAcquisition?.qualityScore ?? -100) >= 50 ? 'text-yellow-400' :
                  'text-rose-400'
                }`}>
                  {currentResolvedAcquisition?.qualityScore ?? 'null'}
                </span>
              </div>
              <div>
                <span className="text-purple-400/50">source:</span>{' '}
                <span className="text-purple-200/80">{currentResolvedAcquisition?.source ?? 'null'}</span>
              </div>
              <div>
                <span className="text-purple-400/50">acquisitionType:</span>{' '}
                <span className={`font-semibold ${
                  currentResolvedAcquisition?.acquisitionType === 'PURCHASE' ? 'text-green-400' :
                  currentResolvedAcquisition?.acquisitionType === 'MINT' ? 'text-cyan-400' :
                  currentResolvedAcquisition?.acquisitionType === 'TRANSFER' ? 'text-amber-400' :
                  'text-gray-400'
                }`}>
                  {currentResolvedAcquisition?.acquisitionType ?? 'null'}
                </span>
              </div>
              <div>
                <span className="text-purple-400/50">venue:</span>{' '}
                <span className="text-purple-200/80">{currentResolvedAcquisition?.venue ?? 'null'}</span>
              </div>
              <div>
                <span className="text-purple-400/50">costGun:</span>{' '}
                <span className={`font-semibold ${
                  currentResolvedAcquisition?.costGun && currentResolvedAcquisition.costGun > 0
                    ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {currentResolvedAcquisition?.costGun?.toLocaleString() ?? 'null'}
                </span>
              </div>
              <div>
                <span className="text-purple-400/50">costUsd:</span>{' '}
                <span className="text-purple-200/80">
                  {currentResolvedAcquisition?.costUsd?.toFixed(2) ?? 'null'}
                </span>
              </div>
              <div>
                <span className="text-purple-400/50">acquiredAt:</span>{' '}
                <span className="text-purple-200/80">{currentResolvedAcquisition?.acquiredAt ?? 'null'}</span>
              </div>
              <div>
                <span className="text-purple-400/50">txHash:</span>{' '}
                <span className="text-purple-200/80 break-all text-label">
                  {currentResolvedAcquisition?.txHash ?? 'null'}
                </span>
              </div>
              <div>
                <span className="text-purple-400/50">fromAddress:</span>{' '}
                <span className="text-purple-200/80 break-all text-label">
                  {currentResolvedAcquisition?.fromAddress ?? 'null'}
                </span>
              </div>
              {currentResolvedAcquisition?.qualityReasons && currentResolvedAcquisition.qualityReasons.length > 0 && (
                <div className="border-t border-purple-500/20 pt-1 mt-1">
                  <span className="text-purple-400/50">qualityReasons:</span>
                  <div className="ml-2 text-label text-purple-200/60">
                    {currentResolvedAcquisition.qualityReasons.map((reason, i) => (
                      <div key={i}>{reason}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* Debug: Holding Acquisition from RPC (getNFTHoldingAcquisition) */}
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-cyan-400 font-semibold">holding acquisition (RPC):</span>
            <pre className="text-cyan-200 mt-1 whitespace-pre-wrap break-all text-caption bg-cyan-500/5 p-2 rounded">
{JSON.stringify(holdingAcquisitionRaw, null, 2)}
            </pre>
            <div className="mt-2 ml-2 text-caption space-y-1">
              <div>
                <span className="text-cyan-400/50">owned:</span>{' '}
                <span className={`font-semibold ${holdingAcquisitionRaw?.owned ? 'text-green-400' : 'text-rose-400'}`}>
                  {holdingAcquisitionRaw?.owned?.toString() ?? 'null'}
                </span>
              </div>
              <div>
                <span className="text-cyan-400/50">acquisitionVenue:</span>{' '}
                <span className="text-cyan-200/80">{holdingAcquisitionRaw?.venue ?? 'null'}</span>
              </div>
              <div>
                <span className="text-cyan-400/50">acquisitionTxHash:</span>{' '}
                <span className="text-cyan-200/80 break-all">{holdingAcquisitionRaw?.txHash ?? 'null'}</span>
              </div>
              <div>
                <span className="text-cyan-400/50">costGun:</span>{' '}
                <span className="text-cyan-200/80">{holdingAcquisitionRaw?.costGun ?? 'null'}</span>
              </div>
              <div>
                <span className="text-cyan-400/50">fromAddress:</span>{' '}
                <span className="text-cyan-200/80 break-all">{holdingAcquisitionRaw?.fromAddress ?? 'null'}</span>
              </div>
              <div>
                <span className="text-cyan-400/50">isMint:</span>{' '}
                <span className="text-cyan-200/80">{holdingAcquisitionRaw?.isMint?.toString() ?? 'null'}</span>
              </div>
              <div>
                <span className="text-cyan-400/50">acquiredAtIso:</span>{' '}
                <span className="text-cyan-200/80">{holdingAcquisitionRaw?.acquiredAtIso ?? 'null'}</span>
              </div>
              {/* Debug sub-fields */}
              {holdingAcquisitionRaw?.debug && (
                <div className="border-t border-cyan-500/20 pt-1 mt-1">
                  <span className="text-cyan-400/50">debug.txTo:</span>{' '}
                  <span className="text-cyan-200/80 break-all">{holdingAcquisitionRaw.debug.txTo ?? 'null'}</span>
                </div>
              )}
              {holdingAcquisitionRaw?.debug && (
                <div>
                  <span className="text-cyan-400/50">debug.selector:</span>{' '}
                  <span className="text-cyan-200/80">{holdingAcquisitionRaw.debug.selector ?? 'null'}</span>
                </div>
              )}
              {holdingAcquisitionRaw?.debug && (
                <div>
                  <span className="text-cyan-400/50">debug.gunIsNative:</span>{' '}
                  <span className="text-cyan-200/80">{holdingAcquisitionRaw.debug.gunIsNative?.toString() ?? 'null'}</span>
                </div>
              )}
              {holdingAcquisitionRaw?.debug && (
                <div>
                  <span className="text-cyan-400/50">debug.matchedRule:</span>{' '}
                  <span className="text-cyan-200/80">{holdingAcquisitionRaw.debug.matchedRule ?? 'null'}</span>
                </div>
              )}
              {holdingAcquisitionRaw?.debug && (
                <div>
                  <span className="text-cyan-400/50">debug.hasOrderFulfilled:</span>{' '}
                  <span className={`font-semibold ${holdingAcquisitionRaw.debug.hasOrderFulfilled ? 'text-green-400' : 'text-cyan-200/80'}`}>
                    {holdingAcquisitionRaw.debug.hasOrderFulfilled?.toString() ?? 'null'}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Debug: Transfer derivation details (legacy) */}
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-amber-400/70">transfer derivation (legacy):</span>
            <div className="mt-1 ml-2 text-caption space-y-1">
              <div>
                <span className="text-amber-400/50">derivedAcquiredAt:</span>{' '}
                <span className="text-amber-200/80">{debugData.derivedAcquiredAt ?? 'null'}</span>
              </div>
              <div>
                <span className="text-amber-400/50">derivedAcquisitionType:</span>{' '}
                <span className="text-amber-200/80">{debugData.derivedAcquisitionType ?? 'null'}</span>
              </div>
            </div>
          </div>
          {/* Debug: Marketplace matching (enhanced) */}
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-amber-400/70">marketplace matching:</span>
            <div className="mt-1 ml-2 text-caption space-y-1">
              {/* Identity info */}
              <div>
                <span className="text-amber-400/50">viewerWallet:</span>{' '}
                <span className="text-amber-200/80 break-all">{debugData.viewerWallet || 'null'}</span>
              </div>
              <div>
                <span className="text-amber-400/50">currentOwner:</span>{' '}
                <span className="text-amber-200/80 break-all">{debugData.currentOwner || 'null'}</span>
              </div>
              {/* Endpoint info */}
              <div className="border-t border-amber-500/10 pt-1 mt-1">
                <span className="text-amber-400/50">endpointBaseUrl:</span>{' '}
                <span className="text-amber-200/80 break-all">{debugData.marketplaceEndpointBaseUrl || 'null'}</span>
              </div>
              <div>
                <span className="text-amber-400/50">network:</span>{' '}
                <span className={`font-semibold ${
                  debugData.marketplaceNetwork === 'mainnet' ? 'text-green-400' :
                  debugData.marketplaceNetwork === 'testnet' ? 'text-yellow-400' :
                  'text-rose-400'
                }`}>
                  {debugData.marketplaceNetwork || 'unconfigured'}
                </span>
              </div>
              <div>
                <span className="text-amber-400/50">configured:</span>{' '}
                <span className={`font-semibold ${debugData.marketplaceConfigured ? 'text-green-400' : 'text-rose-400'}`}>
                  {debugData.marketplaceConfigured ? 'true' : 'false'}
                </span>
              </div>
              <div>
                <span className="text-amber-400/50">serverProxy:</span>{' '}
                <span className={`font-semibold ${debugData.serverProxyUsed ? 'text-green-400' : 'text-amber-400'}`}>
                  {debugData.serverProxyUsed ? 'true' : 'false'}
                </span>
              </div>
              {debugData.marketplaceTestConnection && (
                <div className="ml-2 text-label">
                  <span className="text-amber-400/30">testConnection:</span>{' '}
                  <span className={`${debugData.marketplaceTestConnection.success ? 'text-green-400' : 'text-rose-400'}`}>
                    {debugData.marketplaceTestConnection.success ? 'OK' : 'FAIL'}
                    {debugData.marketplaceTestConnection.statusCode && ` (${debugData.marketplaceTestConnection.statusCode})`}
                  </span>
                  {debugData.marketplaceTestConnection.error && (
                    <span className="text-rose-300/80 ml-1">{debugData.marketplaceTestConnection.error}</span>
                  )}
                </div>
              )}
              <div>
                <span className="text-amber-400/50">matchWindowMinutes:</span>{' '}
                <span className="text-amber-200/80">{debugData.matchWindowMinutes}</span>
              </div>
              {/* Retrieval counts */}
              <div className="border-t border-amber-500/10 pt-1 mt-1">
                <span className="text-amber-400/50">tokenPurchasesCount:</span>{' '}
                <span className={`font-semibold ${debugData.tokenPurchasesCount > 0 ? 'text-green-400' : 'text-amber-200/80'}`}>
                  {debugData.tokenPurchasesCount}
                </span>
              </div>
              <div>
                <span className="text-amber-400/50">walletPurchasesCount (viewer):</span>{' '}
                <span className={`font-semibold ${debugData.walletPurchasesCount_viewerWallet > 0 ? 'text-green-400' : 'text-amber-200/80'}`}>
                  {debugData.walletPurchasesCount_viewerWallet}
                </span>
              </div>
              {debugData.walletPurchasesTimeRange_viewerWallet && (
                <div className="ml-2">
                  <span className="text-amber-400/30">timeRange:</span>{' '}
                  <span className="text-amber-200/60 text-label">
                    {debugData.walletPurchasesTimeRange_viewerWallet.min} → {debugData.walletPurchasesTimeRange_viewerWallet.max}
                  </span>
                </div>
              )}
              <div>
                <span className="text-amber-400/50">walletPurchasesCount (owner):</span>{' '}
                <span className={`font-semibold ${debugData.walletPurchasesCount_currentOwner > 0 ? 'text-green-400' : 'text-amber-200/80'}`}>
                  {debugData.walletPurchasesCount_currentOwner}
                </span>
              </div>
              {debugData.walletPurchasesTimeRange_currentOwner && (
                <div className="ml-2">
                  <span className="text-amber-400/30">timeRange:</span>{' '}
                  <span className="text-amber-200/60 text-label">
                    {debugData.walletPurchasesTimeRange_currentOwner.min} → {debugData.walletPurchasesTimeRange_currentOwner.max}
                  </span>
                </div>
              )}
              {/* Merged candidates */}
              <div className="border-t border-amber-500/10 pt-1 mt-1">
                <span className="text-amber-400/50">candidatesCount (merged):</span>{' '}
                <span className={`font-semibold ${debugData.marketplaceCandidatesCount > 0 ? 'text-green-400' : 'text-amber-200/80'}`}>
                  {debugData.marketplaceCandidatesCount}
                </span>
              </div>
              {debugData.marketplaceCandidateTimes && (
                <div>
                  <span className="text-amber-400/50">candidateTimes:</span>{' '}
                  <span className="text-amber-200/80 text-label">
                    {debugData.marketplaceCandidateTimes.min} → {debugData.marketplaceCandidateTimes.max}
                  </span>
                </div>
              )}
              {/* Match result */}
              <div className="border-t border-amber-500/10 pt-1 mt-1">
                <span className="text-amber-400/50">matchMethod:</span>{' '}
                <span className={`font-semibold ${
                  debugData.marketplaceMatchMethod === 'txHash' ? 'text-purple-400' :
                  debugData.marketplaceMatchMethod === 'timeWindow' ? 'text-blue-400' :
                  'text-rose-400'
                }`}>
                  {debugData.marketplaceMatchMethod}
                </span>
              </div>
              <div>
                <span className="text-amber-400/50">matchedPurchaseId:</span>{' '}
                <span className="text-amber-200/80">{debugData.marketplaceMatchedPurchaseId ?? 'null'}</span>
              </div>
              <div>
                <span className="text-amber-400/50">matchedOrderId:</span>{' '}
                <span className="text-amber-200/80">{debugData.marketplaceMatchedOrderId ?? 'null'}</span>
              </div>
              <div>
                <span className="text-amber-400/50">matchedTimestamp:</span>{' '}
                <span className="text-amber-200/80">{debugData.marketplaceMatchedTimestamp ?? 'null'}</span>
              </div>
              <div>
                <span className="text-amber-400/50">matchedTxHash:</span>{' '}
                <span className="text-amber-200/80 break-all">{debugData.marketplaceMatchedTxHash ?? 'null'}</span>
              </div>
            </div>
          </div>
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-amber-400/70">gunUsdRate:</span>{' '}
            <span className="text-amber-200">{currentGunPrice ?? 'null'}</span>
          </div>
          <div>
            <span className="text-amber-400/70">gunPriceTimestamp:</span>{' '}
            <span className="text-amber-200">
              {toIsoStringSafe(debugData.gunPriceTimestamp) ?? 'null'}
            </span>
          </div>
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-amber-400/70">transferEventCount:</span>{' '}
            <span className={`font-semibold ${debugData.transferEventCount > 0 ? 'text-green-400' : 'text-rose-400'}`}>
              {debugData.transferEventCount}
            </span>
          </div>
          {debugData.transferQueryInfo && (
            <div className="mt-1 ml-2 text-caption space-y-1">
              {debugData.transferQueryInfo.fromBlock !== undefined && debugData.transferQueryInfo.toBlock !== undefined && (
                <div>
                  <span className="text-amber-400/50">blockRange:</span>{' '}
                  <span className="text-amber-200/80">
                    {debugData.transferQueryInfo.fromBlock.toLocaleString()} → {debugData.transferQueryInfo.toBlock.toLocaleString()}
                  </span>
                </div>
              )}
              {debugData.transferQueryInfo.chunksQueried !== undefined && (
                <div>
                  <span className="text-amber-400/50">chunksQueried:</span>{' '}
                  <span className="text-amber-200/80">{debugData.transferQueryInfo.chunksQueried}</span>
                </div>
              )}
              {debugData.transferQueryInfo.currentOwner !== undefined && (
                <div>
                  <span className="text-amber-400/50">currentOwner:</span>{' '}
                  <span className="text-amber-200/80 break-all">
                    {debugData.transferQueryInfo.currentOwner || 'null'}
                  </span>
                </div>
              )}
              {debugData.transferQueryInfo.matchedRule && (
                <div>
                  <span className="text-amber-400/50">venueMatchedBy:</span>{' '}
                  <span className="text-amber-200/80">{debugData.transferQueryInfo.matchedRule}</span>
                </div>
              )}
            </div>
          )}
          <div>
            <span className="text-amber-400/70">marketplaceMatches:</span>{' '}
            <span className="text-amber-200">{debugData.marketplaceMatches}</span>
          </div>
          {debugData.openSeaError && (
            <div className="mt-1">
              <span className="text-amber-400/70">openSeaError:</span>{' '}
              <span className="text-rose-400 text-caption">{debugData.openSeaError}</span>
            </div>
          )}
          <div className="border-t border-amber-500/20 pt-2">
            <span className="text-amber-400/70">listingsData:</span>
            <pre className="text-amber-200 mt-1 whitespace-pre-wrap break-all">
{listingsDataJson}
            </pre>
          </div>
          {/* Fetch Status/Error Debug Section */}
          <div className="border-t border-rose-500/20 pt-2 bg-rose-500/5 -mx-3 px-3 py-2 rounded">
            <span className="text-rose-400 font-semibold">fetch status (per-token maps):</span>
            <div className="mt-2 ml-2 text-caption space-y-2">
              {/* Listings fetch status */}
              <div>
                <span className="text-rose-400/50">listings.status:</span>{' '}
                <span className={`font-semibold ${
                  listingsStatus === 'success' ? 'text-green-400' :
                  listingsStatus === 'loading' ? 'text-blue-400' :
                  listingsStatus === 'error' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {listingsStatus}
                </span>
              </div>
              {listingsError && (
                <div>
                  <span className="text-rose-400/50">listings.error:</span>{' '}
                  <span className="text-red-300 break-all">{listingsError}</span>
                </div>
              )}
              {/* Holding acquisition fetch status */}
              <div className="border-t border-rose-500/10 pt-1 mt-1">
                <span className="text-rose-400/50">holdingAcq.status:</span>{' '}
                <span className={`font-semibold ${
                  holdingAcqStatus === 'success' ? 'text-green-400' :
                  holdingAcqStatus === 'loading' ? 'text-blue-400' :
                  holdingAcqStatus === 'error' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {holdingAcqStatus}
                </span>
              </div>
              {holdingAcqError && (
                <div>
                  <span className="text-rose-400/50">holdingAcq.error:</span>{' '}
                  <span className="text-red-300 break-all">{holdingAcqError}</span>
                </div>
              )}
              {/* Map sizes for memory monitoring */}
              <div className="border-t border-rose-500/10 pt-1 mt-1 text-label">
                <span className="text-rose-400/30">mapSizes:</span>{' '}
                <span className="text-rose-200/60">
                  listings={listingsMapSize}, holdingAcq={holdingAcqMapSize}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
