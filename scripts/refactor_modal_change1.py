"""
Change 1: Wire up useNFTAcquisitionPipeline hook.
Removes ~1,500 lines of inline pipeline + duplicate types/functions.
"""
import re

FILE = r"x:\Projects\GUNZILLA\GUNZSCOPE\components\NFTDetailModal.tsx"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

original_count = len(lines)
print(f"Original file: {original_count} lines")

# Convert to 1-indexed content for easier matching
content = ''.join(lines)

# ============================================================================
# STEP 1: Replace import block — remove pipeline service imports, add hook
# ============================================================================

# Remove AvalancheService import
content = content.replace(
    "import { AvalancheService, NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';\n",
    "import type { NFTHoldingAcquisition } from '@/lib/blockchain/avalanche';\n"
)

# Remove service imports that are only used in the pipeline
content = content.replace(
    "import { OpenSeaService } from '@/lib/api/opensea';\n",
    ""
)
content = content.replace(
    "import { CoinGeckoService } from '@/lib/api/coingecko';\n",
    ""
)
content = content.replace(
    "import { GameMarketplaceService } from '@/lib/api/marketplace';\n",
    ""
)

# Replace nftCache imports — remove pipeline-only ones
content = content.replace(
    """import {
  buildTokenKey,
  buildNftDetailCacheKey,
  getCachedNFTDetail,
  setCachedNFTDetail,
} from '@/lib/utils/nftCache';""",
    "import { buildTokenKey } from '@/lib/utils/nftCache';"
)

# Replace nftDetailHelpers imports — remove pipeline-only ones
content = content.replace(
    """import {
  FetchStatus,
  TOKEN_MAP_SOFT_CAP,
  warnOnce,
  normalizeCostBasis,
  isAbortError,
  FIFOKeyTracker,
  toIsoStringSafe,
  computeMarketInputs,
  getPositionLabel,
  getVenueDisplayLabel,
  getRarityColorForNft,
  findRelatedItems,
} from '@/lib/nft/nftDetailHelpers';""",
    """import {
  computeMarketInputs,
  getPositionLabel,
  getVenueDisplayLabel,
  getRarityColorForNft,
  findRelatedItems,
} from '@/lib/nft/nftDetailHelpers';
import {
  useNFTAcquisitionPipeline,
  type ItemData,
  type AcquisitionData,
  type ResolvedAcquisition,
} from '@/lib/hooks/useNFTAcquisitionPipeline';"""
)

# Remove useCallback from React imports (dead code)
content = content.replace(
    "import { useEffect, useState, useMemo, useCallback, useRef } from 'react';",
    "import { useEffect, useState, useMemo, useRef } from 'react';"
)

# ============================================================================
# STEP 2: Remove TODO comment block (lines 3-9)
# ============================================================================

content = content.replace(
    """
// =============================================================================
// TODO: REMAINING HARDENING PHASES
// =============================================================================
// Phase 7 — Historical USD conversion:
//   - Requires API/provider changes: price-at-time for GUN/USD
//   - Fallback rules + caching strategy for historical prices
// =============================================================================

""",
    "\n"
)

# ============================================================================
# STEP 3: Remove local type definitions + candidate functions (lines 90-460)
# These are now imported from the hook.
# Keep NFTDetailModalProps (lines 101-108).
# ============================================================================

# Remove ItemData interface (imported from hook now)
content = content.replace(
    """interface ItemData {
  tokenId: string;
  mintNumber: string;
  rarity?: string;
  index: number;
  colors: { primary: string; border: string };
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchaseDate?: Date;
}

""",
    ""
)

# Remove PriceSource through the end of AcquisitionData
# This is a large block from line 110 to line 460
# Match from "// Price source tracking" to end of AcquisitionData interface
old_types_block = """// Price source tracking - how we determined the purchase price
type PriceSource = 'transfers' | 'localStorage' | 'onchain' | 'none';

// Marketplace matching method
type MarketplaceMatchMethod = 'txHash' | 'timeWindow' | 'none';

// Acquisition type from transfer analysis
type AcquisitionType = 'MINT' | 'TRANSFER' | 'PURCHASE' | 'UNKNOWN';"""

content = content.replace(old_types_block, "")

# Remove ResolvedAcquisition block (type + interface + ACQUISITION_SCORE + all candidate functions)
# Find from "// =============" before RESOLVED ACQUISITION to the end of AcquisitionData
# We need to match the huge block. Let's find it by markers.

# Remove: RESOLVED ACQUISITION section header through mergeAcquisitionIfBetter function
marker_start = "// =============================================================================\n// RESOLVED ACQUISITION - Deterministic best-available acquisition data"
marker_end = "// Structured acquisition data - separates transfer-derived vs price-derived fields"

idx_start = content.find(marker_start)
idx_end = content.find(marker_end)
if idx_start != -1 and idx_end != -1:
    content = content[:idx_start] + content[idx_end:]
    print(f"  Removed RESOLVED ACQUISITION block + candidate functions")

# Now remove the AcquisitionData interface and its "Structured acquisition data" header
acq_data_block_start = "// Structured acquisition data - separates transfer-derived vs price-derived fields\n"
acq_data_block_end = "}\n\nexport default function NFTDetailModal"

idx_start2 = content.find(acq_data_block_start)
idx_end2 = content.find(acq_data_block_end)
if idx_start2 != -1 and idx_end2 != -1:
    # Keep the "export default function" part
    content = content[:idx_start2] + content[idx_end2 + len("}\n\n"):]
    print(f"  Removed AcquisitionData interface")

# ============================================================================
# STEP 4: Remove useState/useRef/useEffect that the hook now manages
# Keep: activeItemIndex, relatedItemsExpanded, useGunPrice, debug hook, searchParams
# ============================================================================

# Remove loadingDetails useState
content = content.replace(
    "  const [loadingDetails, setLoadingDetails] = useState(false);\n",
    ""
)

# Remove itemPurchaseData useState
content = content.replace(
    "  const [itemPurchaseData, setItemPurchaseData] = useState<Record<string, AcquisitionData>>({});\n",
    ""
)

# Remove resolvedAcquisitions + comment
content = content.replace(
    "  // Resolved acquisition data per token - deterministic best-available data\n  const [resolvedAcquisitions, setResolvedAcquisitions] = useState<Record<string, ResolvedAcquisition>>({});\n",
    ""
)

# Remove listingsByTokenId state
content = content.replace(
    """  // Per-token listings data to prevent cross-token leakage in multi-token NFTs
  const [listingsByTokenId, setListingsByTokenId] = useState<Record<string, {
    lowest?: number;
    highest?: number;
    average?: number;
  } | null>>({});
""",
    ""
)

# Remove resolvedAcquisitionsRef
content = content.replace(
    """  // Ref mirroring resolvedAcquisitions for stale-closure protection in async callbacks.
  // Without this, the async loadItemDetails reads the closure-captured state from useEffect
  // start — which is BEFORE cache render sets the correct value (React batches state updates).
  const resolvedAcquisitionsRef = useRef(resolvedAcquisitions);
  resolvedAcquisitionsRef.current = resolvedAcquisitions;

  // Ref to track fetch state and prevent duplicate fetches
  const fetchStateRef = useRef<{
    lastFetchedTokenKey: string | null;
    lastFetchTimestamp: number;
    fetchInProgress: boolean;
  }>({
    lastFetchedTokenKey: null,
    lastFetchTimestamp: 0,
    fetchInProgress: false,
  });

  // Staleness threshold for background refresh (10 minutes)
  const STALE_THRESHOLD_MS = 10 * 60 * 1000;

""",
    ""
)

# Remove holdingAcquisitionRawByTokenId state
content = content.replace(
    """  // Per-token raw holding acquisition results from RPC (prevents cross-token leakage)
  const [holdingAcquisitionRawByTokenId, setHoldingAcquisitionRawByTokenId] = useState<Record<string, NFTHoldingAcquisition | null>>({});

""",
    ""
)

# Remove HARDENING status/error maps
content = content.replace(
    """  // ==========================================================================
  // HARDENING: Per-token status and error tracking (removes null ambiguity)
  // ==========================================================================
  const [listingsStatusByTokenId, setListingsStatusByTokenId] = useState<Record<string, FetchStatus>>({});
  const [listingsErrorByTokenId, setListingsErrorByTokenId] = useState<Record<string, string | null>>({});
  const [holdingAcqStatusByTokenId, setHoldingAcqStatusByTokenId] = useState<Record<string, FetchStatus>>({});
  const [holdingAcqErrorByTokenId, setHoldingAcqErrorByTokenId] = useState<Record<string, string | null>>({});

  // ==========================================================================
  // HARDENING: AbortController refs for race-proofing async operations
  // ==========================================================================
  const abortControllersRef = useRef<Record<string, AbortController | undefined>>({});

  // ==========================================================================
  // HARDENING: FIFO key trackers for memory-bounded maps
  // ==========================================================================
  const listingsKeyTrackerRef = useRef(new FIFOKeyTracker(TOKEN_MAP_SOFT_CAP));
  const holdingAcqKeyTrackerRef = useRef(new FIFOKeyTracker(TOKEN_MAP_SOFT_CAP));

  // Async safety: track mounted state to prevent state updates after unmount
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Abort all in-flight requests on unmount
      Object.values(abortControllersRef.current).forEach(controller => controller?.abort());
      abortControllersRef.current = {};
    };
  }, []);

  // Debug state is managed by useNFTDetailDebug hook (declared above)

""",
    ""
)

# Replace the reset useEffect — keep only activeItemIndex + resetDebugData
content = content.replace(
    """  // Reset state when modal opens (component remounts via key prop when NFT changes)
  useEffect(() => {
    if (isOpen) {
      // =======================================================================
      // HARDENING: Abort any in-flight requests from previous modal session
      // =======================================================================
      Object.values(abortControllersRef.current).forEach(controller => controller?.abort());
      abortControllersRef.current = {};

      setActiveItemIndex(0);
      setItemPurchaseData({});
      setResolvedAcquisitions({});  // Reset resolved acquisition data
      setListingsByTokenId({});     // Reset per-token listings
      setHoldingAcquisitionRawByTokenId({}); // Reset per-token raw acquisition for fresh fetch

      // =======================================================================
      // HARDENING: Reset per-token status/error maps
      // =======================================================================
      setListingsStatusByTokenId({});
      setListingsErrorByTokenId({});
      setHoldingAcqStatusByTokenId({});
      setHoldingAcqErrorByTokenId({});

      // =======================================================================
      // HARDENING: Reset FIFO key trackers
      // =======================================================================
      listingsKeyTrackerRef.current.reset();
      holdingAcqKeyTrackerRef.current.reset();

      // Reset fetch state for new modal session (allows fresh fetch on open)
      fetchStateRef.current = {
        lastFetchedTokenKey: null,
        lastFetchTimestamp: 0,
        fetchInProgress: false,
      };
      // Reset debug data (debugExpanded persists — handled inside hook)
      resetDebugData(noCacheMode);

    }
  }, [isOpen, noCacheMode]);""",
    """  // Reset UI state when modal opens (pipeline state is managed by the hook)
  useEffect(() => {
    if (isOpen) {
      setActiveItemIndex(0);
      resetDebugData(noCacheMode);
    }
  }, [isOpen, noCacheMode]);"""
)

# ============================================================================
# STEP 5: Remove derived values that now come from the hook
# ============================================================================

# Remove listingsData and holdingAcquisitionRaw derivations
content = content.replace(
    """  // Derive current token's listings and acquisition data from per-token maps
  // This prevents cross-token leakage when switching between items in multi-token NFTs
  const listingsData = activeItem ? listingsByTokenId[activeItem.tokenId] ?? null : null;
  const holdingAcquisitionRaw = activeItem ? holdingAcquisitionRawByTokenId[activeItem.tokenId] ?? null : null;

""",
    ""
)

# ============================================================================
# STEP 6: Remove the MASSIVE pipeline useEffect (the big one)
# Find it by its opening comment and its closing deps array.
# ============================================================================

pipeline_start = "  // Load purchase data for the active item\n  useEffect(() => {"
pipeline_end = "  }, [isOpen, nft, walletAddress, activeItem, debugMode, noCacheMode]);\n"

idx_pipe_start = content.find(pipeline_start)
idx_pipe_end = content.find(pipeline_end)
if idx_pipe_start != -1 and idx_pipe_end != -1:
    end_pos = idx_pipe_end + len(pipeline_end)
    removed_chars = end_pos - idx_pipe_start
    content = content[:idx_pipe_start] + content[end_pos:]
    print(f"  Removed pipeline useEffect ({removed_chars} chars)")
else:
    print(f"  WARNING: Could not find pipeline useEffect!")
    print(f"    pipeline_start found: {idx_pipe_start != -1}")
    print(f"    pipeline_end found: {idx_pipe_end != -1}")

# ============================================================================
# STEP 7: Remove currentPurchaseData/currentResolvedAcquisition derivations
# These are now returned by the hook.
# ============================================================================

content = content.replace(
    """  // Get current item's purchase data
  const currentPurchaseData = activeItem ? itemPurchaseData[activeItem.tokenId] : undefined;
  // Get resolved acquisition (deterministic, no-downgrade)
  const currentResolvedAcquisition = activeItem ? resolvedAcquisitions[activeItem.tokenId] : undefined;

""",
    ""
)

# ============================================================================
# STEP 8: Add the hook call after sortedItems + activeItem
# We need to insert after `const activeItem = ...` and before the reset effect.
# ============================================================================

# Memoize activeItem while we're at it (Change 4b)
content = content.replace(
    """  // Get currently active item
  const activeItem = sortedItems[activeItemIndex] || sortedItems[0];
""",
    """  // Get currently active item (memoized to prevent unnecessary hook re-triggers)
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
"""
)

# ============================================================================
# STEP 9: Remove getDefaultRarityColors wrapper (dead code)
# Replace usages with DEFAULT_RARITY_COLORS directly
# ============================================================================

content = content.replace(
    "const getDefaultRarityColors = () => DEFAULT_RARITY_COLORS;\n",
    ""
)
content = content.replace(
    "getDefaultRarityColors()",
    "DEFAULT_RARITY_COLORS",
    2  # Replace up to 2 occurrences
)

# ============================================================================
# DONE — Write the result
# ============================================================================

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

new_count = content.count('\n') + (0 if content.endswith('\n') else 1)
print(f"\nNew file: {new_count} lines (removed {original_count - new_count} lines)")
print("Done! Run `npm run build` to verify.")
