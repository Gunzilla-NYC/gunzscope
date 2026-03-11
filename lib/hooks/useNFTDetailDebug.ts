'use client';

import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import {
  type DebugDataState,
  type ListingsData,
  type ResolvedAcquisitionData,
} from '@/components/nft-detail/types';
import { type NFT } from '@/lib/types';
import { type NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';
import { toIsoStringSafe, computeMarketInputs } from '@/lib/nft/nftDetailHelpers';

// =============================================================================
// Types
// =============================================================================

/** Resolved acquisition data passed to copy handler */
interface AcquisitionData {
  priceSource?: string;
  acquisitionVenue?: string;
  acquiredAt?: Date | string | null;
  fromAddress?: string;
  acquisitionType?: string;
  acquisitionTxHash?: string;
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchaseDate?: Date | string | null;
  marketplaceTxHash?: string;
  decodeCostGun?: number;
  decodeCostUsd?: number;
  transferredFrom?: string;
  isFreeTransfer?: boolean;
}

/** External data needed by handleCopyDebugData */
export interface CopyDebugParams {
  nft: NFT | null;
  activeTokenId?: string;
  currentPurchaseData: AcquisitionData | undefined;
  currentResolvedAcquisition: ResolvedAcquisitionData | undefined;
  holdingAcquisitionRaw: NFTHoldingAcquisition | null;
  currentGunPrice: number | null;
  listingsData: ListingsData | null;
}

export interface UseNFTDetailDebugResult {
  debugData: DebugDataState;
  debugExpanded: boolean;
  debugCopied: boolean;
  updateDebugData: (updates: Partial<DebugDataState>) => void;
  resetDebugData: (noCacheMode: boolean) => void;
  setDebugExpanded: Dispatch<SetStateAction<boolean>>;
  handleCopyDebugData: (params: CopyDebugParams) => void;
}

// =============================================================================
// Default State
// =============================================================================

const DEFAULT_DEBUG_DATA: DebugDataState = {
  tokenKey: '',
  cacheKey: '',
  cacheHit: false,
  cacheReason: '',
  transferEventCount: 0,
  marketplaceMatches: 0,
  gunPriceTimestamp: null,
  priceSource: 'none',
  marketplaceConfigured: false,
  serverProxyUsed: true,
  viewerWallet: null,
  currentOwner: null,
  tokenPurchasesCount: 0,
  walletPurchasesCount_viewerWallet: 0,
  walletPurchasesCount_currentOwner: 0,
  marketplaceEndpointBaseUrl: '',
  marketplaceNetwork: '',
  matchWindowMinutes: 10,
  marketplaceCandidatesCount: 0,
  marketplaceMatchMethod: 'none',
  noCacheEnabled: false,
  cacheBypassed: false,
  cacheRenderedFirst: false,
  backgroundRefreshAttempted: false,
  backgroundRefreshUpdated: false,
  refreshStartedAtIso: null,
  refreshFinishedAtIso: null,
  refreshError: null,
  refreshResultSummary: null,
  refreshExistingScore: null,
  refreshNewScore: null,
  refreshDecision: null,
};

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing NFTDetailModal debug state.
 * Extracts debug data tracking, copy-to-clipboard, and reset logic.
 */
export function useNFTDetailDebug(
  gunPriceTimestamp: Date | null,
): UseNFTDetailDebugResult {
  const [debugData, setDebugData] = useState<DebugDataState>(DEFAULT_DEBUG_DATA);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [debugCopied, setDebugCopied] = useState(false);

  // Sync GUN price timestamp from useGunPrice hook into debug data
  // Compare by .getTime() — Date objects are recreated on every render by useGunPrice
  const gunPriceTs = gunPriceTimestamp?.getTime() ?? null;
  useEffect(() => {
    if (gunPriceTimestamp) {
      setDebugData(prev => ({ ...prev, gunPriceTimestamp }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gunPriceTs]);

  // Partial update convenience function — replaces setDebugData(prev => ({ ...prev, ... }))
  const updateDebugData = useCallback((updates: Partial<DebugDataState>) => {
    setDebugData(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset debug data to defaults (called when modal opens)
  const resetDebugData = useCallback((noCacheMode: boolean) => {
    // Note: debugExpanded is NOT reset — user preference persists during session
    setDebugData({
      ...DEFAULT_DEBUG_DATA,
      noCacheEnabled: noCacheMode,
    });
  }, []);

  // Copy debug data to clipboard
  const handleCopyDebugData = useCallback((params: CopyDebugParams) => {
    const { nft, activeTokenId, currentPurchaseData, currentResolvedAcquisition, holdingAcquisitionRaw, currentGunPrice, listingsData } = params;

    const debugOutput = {
      tokenKey: debugData.tokenKey,
      cacheKey: debugData.cacheKey,
      cacheHit: debugData.cacheHit,
      cacheReason: debugData.cacheReason,
      priceSource: debugData.priceSource,
      noCacheEnabled: debugData.noCacheEnabled,
      cacheBypassed: debugData.cacheBypassed,
      cacheRenderedFirst: debugData.cacheRenderedFirst,
      backgroundRefreshAttempted: debugData.backgroundRefreshAttempted,
      backgroundRefreshUpdated: debugData.backgroundRefreshUpdated,
      refreshDiagnostics: {
        startedAt: debugData.refreshStartedAtIso,
        finishedAt: debugData.refreshFinishedAtIso,
        error: debugData.refreshError,
        resultSummary: debugData.refreshResultSummary,
        existingScore: debugData.refreshExistingScore,
        newScore: debugData.refreshNewScore,
        decision: debugData.refreshDecision,
      },
      metadataDebug: nft?.metadataDebug ?? null,
      resolvedAcquisition: currentResolvedAcquisition ?? null,
      acquisition: {
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
      },
      holdingAcquisitionRaw,
      transferDerivation: {
        derivedAcquiredAt: debugData.derivedAcquiredAt ?? null,
        derivedAcquisitionType: debugData.derivedAcquisitionType ?? null,
      },
      marketplaceMatching: {
        viewerWallet: debugData.viewerWallet,
        currentOwner: debugData.currentOwner,
        endpointBaseUrl: debugData.marketplaceEndpointBaseUrl,
        network: debugData.marketplaceNetwork,
        configured: debugData.marketplaceConfigured,
        serverProxyUsed: debugData.serverProxyUsed,
        testConnection: debugData.marketplaceTestConnection ?? null,
        matchWindowMinutes: debugData.matchWindowMinutes,
        tokenPurchasesCount: debugData.tokenPurchasesCount,
        walletPurchasesCount_viewerWallet: debugData.walletPurchasesCount_viewerWallet,
        walletPurchasesTimeRange_viewerWallet: debugData.walletPurchasesTimeRange_viewerWallet ?? null,
        walletPurchasesCount_currentOwner: debugData.walletPurchasesCount_currentOwner,
        walletPurchasesTimeRange_currentOwner: debugData.walletPurchasesTimeRange_currentOwner ?? null,
        candidatesCount: debugData.marketplaceCandidatesCount,
        candidateTimes: debugData.marketplaceCandidateTimes ?? null,
        matchMethod: debugData.marketplaceMatchMethod,
        matchedPurchaseId: debugData.marketplaceMatchedPurchaseId ?? null,
        matchedOrderId: debugData.marketplaceMatchedOrderId ?? null,
        matchedTimestamp: debugData.marketplaceMatchedTimestamp ?? null,
        matchedTxHash: debugData.marketplaceMatchedTxHash ?? null,
      },
      gunUsdRate: currentGunPrice ?? null,
      gunPriceTimestamp: toIsoStringSafe(debugData.gunPriceTimestamp) ?? null,
      transferEventCount: debugData.transferEventCount,
      transferQueryInfo: debugData.transferQueryInfo ?? null,
      marketplaceMatches: debugData.marketplaceMatches,
      openSeaError: debugData.openSeaError ?? null,
      listingsData,
      marketInputs: computeMarketInputs(listingsData, nft?.floorPrice, nft?.ceilingPrice),
      activeTokenId: activeTokenId ?? null,
    };

    navigator.clipboard.writeText(JSON.stringify(debugOutput, null, 2))
      .then(() => {
        setDebugCopied(true);
        setTimeout(() => setDebugCopied(false), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy debug data:', err);
      });
  }, [debugData]);

  return {
    debugData,
    debugExpanded,
    debugCopied,
    updateDebugData,
    resetDebugData,
    setDebugExpanded,
    handleCopyDebugData,
  };
}
