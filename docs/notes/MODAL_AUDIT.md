# NFTDetailModal.tsx — Structural Audit

**File**: `components/NFTDetailModal.tsx`
**Lines**: 2,936
**Date**: 2026-02-21
**Purpose**: Observation-only pass before UI reorganization.

---

## 1. Complexity Hotspots

### 1.1 The 1,320-line useEffect (lines 647–1967)

The main data-loading `useEffect` contains a single async function `loadItemDetails` that spans **lines 660–1962**. This is the single largest complexity source in the file. It handles:
- Cache read + instant render (lines 760–840)
- RPC acquisition fetch (lines 910–950)
- OpenSea listings fetch (lines 1000–1090)
- Marketplace service queries via `Promise.all` (lines 1195–1212)
- Marketplace order matching with time-window logic (lines 1213–1450)
- Venue-driven mapping with 6 branches (lines 1460–1708)
- Historical USD conversion (6 occurrences)
- Candidate scoring + resolution (lines 1770–1830)
- Cache write + debug update (lines 1830–1960)

**Recommendation**: This is the extracted `useNFTAcquisitionPipeline` hook's territory. The hook already exists at `lib/hooks/useNFTAcquisitionPipeline.ts` with identical logic — the modal never adopted it (see §4.1).

### 1.2 YOUR POSITION IIFE (lines 2337–2681) — 345 lines

A single inline IIFE that computes derived values, defines 4 helper functions (`getPositionPillStyles`, `getPositionPillText`, `getPositionIcon`, `getTooltipText`), and renders the entire body card including Cost Basis, GUN Based Performance, Market Reference, and Acquisition Details.

**Recommendation**: Extract into `<NFTDetailPositionCard>` sub-component. The helpers and computation can move into the component body or a `usePositionDisplay` hook.

### 1.3 Venue-Driven Mapping — 4 Nearly Identical Branches (lines 1502–1600)

The branches for `opensea`, `in_game_marketplace`, `otg_marketplace` are copy-pasted with only the debug message differing. Each branch:
1. Sets `derivedPriceSource = 'onchain'`
2. Sets `finalAcquisitionType = 'PURCHASE'`
3. Sets `finalPurchasePriceGun = costGunFromChain > 0 ? costGunFromChain : undefined`
4. Nulls out decode fields
5. Sets `finalMarketplaceTxHash = acquisitionTxHash ?? undefined`
6. Runs the same historical-USD try/catch
7. Logs debug info

**Recommendation**: Collapse into a single `PURCHASE_VENUES` set check with one code path.

### 1.4 Historical USD Conversion — Repeated 6 Times (lines 1389, 1484, 1517, 1550, 1583, 1626)

The same try/catch pattern:
```
historicalPrice = enrichedHistoricalGunUsd ?? await coinGeckoService.getHistoricalGunPrice(date);
if (historicalPrice) { finalPrice = amount * historicalPrice; }
```

**Recommendation**: Extract to a `resolveHistoricalUsd(amount, date, enrichedFallback)` helper.

### 1.5 Abort/Mount Guard — Repeated 7 Times (lines 917, 925, 1011, 1038, 1043, 1088, 1918)

The `abortController.signal.aborted` + `isMountedRef.current` + `activeItem?.tokenId !== tokenId` pattern is duplicated after every `await`.

**Recommendation**: Extract to a `shouldBail()` guard function defined once inside `loadItemDetails`.

### 1.6 Quick Stats IIFE (lines 2287–2334) — Nested IIFE-in-Props

The `NFTDetailQuickStats` receives `unrealizedUsd` and `unrealizedPct` as inline IIFEs inside JSX props. This creates computation inside JSX that is hard to read and debug.

**Recommendation**: Compute `unrealizedUsd` and `unrealizedPct` before the return statement, not inside JSX props.

---

## 2. Extract Candidates

### 2.1 Cost Basis Display (lines 2446–2505)

The "Cost Basis" sub-section renders GUN amount, USD at acquisition, and batch info tooltip. It's self-contained with clear data dependencies: `costBasisGun`, `costBasisUsdAtAcquisition`, `batchInfo`.

**Recommendation**: Extract to `<CostBasisDisplay>` presentational component.

### 2.2 GUN Based Performance Display (lines 2507–2533)

Hero number, P&L badge, and two narrative lines. Dependencies: `xgunUnrealizedUsd`, `xgunUnrealizedPct`, `costBasisGun`, `currentGunPrice`, `costBasisUsdAtAcquisition`, `nft.name`.

**Recommendation**: Extract to `<GunPerformanceDisplay>` presentational component.

### 2.3 Market Reference Display (lines 2535–2617)

Position pill, market value in USD/GUN, unrealized %, data quality badge, and no-data fallback. Dependencies: `positionLabel`, helpers, `marketRef`, `loadingDetails`.

**Recommendation**: Extract to `<MarketReferenceDisplay>` presentational component.

### 2.4 Acquisition Details (lines 2619–2689)

Source, Date, Transferred date, Transaction link, Gas fees. Dependencies: `currentPurchaseData`, `currentResolvedAcquisition`, `holdingAcquisitionRaw`, `batchInfo`.

**Recommendation**: Extract to `<AcquisitionDetails>` presentational component.

### 2.5 Weapon Lab Panel (lines 2799–2928)

The entire side panel is independent of the main modal's P&L logic. Dependencies: `relatedItems`, `relatedItemsExpanded`, `setRelatedItemsExpanded`.

**Recommendation**: Extract to `<WeaponLabPanel>` with props for items and expansion state.

### 2.6 Identity Section (lines 2186–2282)

Image grid/single view, title, subtitle, traits, tier badge, origin badge. Dependencies: `sortedItems`, `nft`, `filteredTraits`, `activeItemIndex`, `loadingDetails`.

**Recommendation**: Extract to `<NFTDetailIdentity>` presentational component.

### 2.7 Top-Level Candidate Functions (lines 157–429)

`scoreAcquisitionCandidate`, `buildCandidateFromHoldingRaw`, `buildCandidateFromCache`, `buildCandidateFromTransfer`, `selectBestAcquisition`, `mergeAcquisitionIfBetter` — 273 lines of pure functions defined at file scope.

**Recommendation**: These already exist in `lib/hooks/useNFTAcquisitionPipeline.ts`. Delete the duplicates and import from the hook (or extract to a shared module if the hook doesn't export them).

---

## 3. State Management Concerns

### 3.1 Duplicate Candidate Functions — Hook Never Adopted

`useNFTAcquisitionPipeline` (1,759 lines) was extracted but **never wired up**. The modal still runs its own 1,320-line inline pipeline. Both files contain identical `scoreAcquisitionCandidate`, `buildCandidateFromHoldingRaw`, `buildCandidateFromCache`, `buildCandidateFromTransfer`, `selectBestAcquisition`, and `mergeAcquisitionIfBetter` implementations.

**Recommendation**: This is the highest-impact change possible — replace the inline pipeline with the extracted hook.

### 3.2 `activeItem` Derived but Not Memoized (line 639)

```typescript
const activeItem = sortedItems[activeItemIndex] || sortedItems[0];
```

This is a plain derivation on every render. When `sortedItems` is stable (it's memoized), this is cheap — but it creates a new object reference every render, which means `activeItem` in the useEffect deps triggers re-runs even when nothing changed.

**Recommendation**: Wrap in `useMemo` keyed on `[sortedItems, activeItemIndex]`.

### 3.3 `marketRef` Object Not Memoized (lines 2122–2127)

```typescript
const marketRef = {
  hasMarketData: marketInputs.ref !== null,
  gunValue: marketInputs.ref,
  usdValue: ...,
  dataQuality: ...,
};
```

Creates a new object reference every render. Currently only used in the inline IIFE so impact is minimal, but if passed as a prop it would cause unnecessary child re-renders.

**Recommendation**: Wrap in `useMemo` keyed on `[marketInputs, currentGunPrice]`.

### 3.4 Eleven `useState` Variables — Six Are Per-Token Maps

Six state variables are `Record<string, ...>` maps keyed by tokenId:
- `itemPurchaseData`, `resolvedAcquisitions`, `listingsByTokenId`, `holdingAcquisitionRawByTokenId`, `listingsStatusByTokenId/ErrorByTokenId`, `holdingAcqStatusByTokenId/ErrorByTokenId`

Each update requires spreading the entire map (`prev => ({ ...prev, [tokenId]: value })`), creating a new object. This pattern appears ~20 times.

**Recommendation**: Consider `useReducer` with a single `tokenDataMap` state, or move all per-token state into the acquisition pipeline hook.

### 3.5 `resolvedAcquisitionsRef` Mirror (lines 498–499)

A `useRef` mirror of `resolvedAcquisitions` state to avoid stale closures in async callbacks. This is a known pattern but indicates the async pipeline would benefit from being outside the component (in a hook with its own ref management).

**Recommendation**: Resolves naturally when the pipeline hook is adopted.

### 3.6 Race Condition: `activeItem` in useEffect Deps

The main useEffect depends on `activeItem` (line 1967), which is derived from `sortedItems[activeItemIndex]`. Since `activeItem` is not memoized, React's referential equality check may miss or over-trigger. The abort controller mitigates races, but the dep array is fragile.

**Recommendation**: Depend on `activeItemIndex` + `sortedItems` instead of the derived object, or memoize `activeItem`.

---

## 4. Dead Code

### 4.1 `useCallback` Imported but Never Used (line 15)

```typescript
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
```

`useCallback` is never called anywhere in the component.

**Recommendation**: Remove from import.

### 4.2 `useWeaponCompatibility` Hook — Never Imported

Per CLAUDE.md memory, `useWeaponCompatibility` was extracted for this component but is never imported or used. The modal still calls `isWeaponLocked`, `isWeapon`, `getFunctionalTier` directly.

**Recommendation**: Either adopt the hook or acknowledge the direct imports are intentional.

### 4.3 `getDefaultRarityColors` Wrapper (line 70)

```typescript
const getDefaultRarityColors = () => DEFAULT_RARITY_COLORS;
```

A one-liner that returns a constant. Used only at lines 602 and 615 as a fallback in `||` chains where `DEFAULT_RARITY_COLORS` could be used directly.

**Recommendation**: Replace with direct `DEFAULT_RARITY_COLORS` reference.

### 4.4 TODO Comment Block (lines 3–9)

```
// TODO: REMAINING HARDENING PHASES
// Phase 7 — Historical USD conversion: ...
```

This references "Phase 7" which appears to have been implemented (historical USD conversion is present throughout the file).

**Recommendation**: Remove or update if phases remain.

### 4.5 `hasTransferData` Alias (line 977)

Backward-compatibility alias that is always equal to `hasAcquisitionData`. The comment says "Backward compatibility aliases" but nothing outside this function uses the old name.

**Recommendation**: Remove alias, use `hasAcquisitionData` directly.

### 4.6 `getPnlMethodLabel` (lines 73–88)

Still used at line 2330 in the QuickStats prop. **Not dead** — but worth noting it's a top-level function that could live in `nftDetailHelpers.ts` with the other extracted helpers.

**Recommendation**: Move to `nftDetailHelpers.ts` for consistency.

### 4.7 ~14 Debug-Only Variables (lines 1123–1135)

Variables like `marketplaceOrderId`, `marketplacePurchaseId`, `marketplaceMatchedTimestamp`, `walletPurchasesCount_viewerWallet`, `walletPurchasesCount_currentOwner`, `walletPurchasesTimeRange_viewerWallet`, `walletPurchasesTimeRange_currentOwner`, `marketplaceCandidatesCount`, `marketplaceCandidateTimes` are computed, then used exactly once to update `debugData`.

**Recommendation**: Inline these into the `updateDebugData()` call to reduce variable declarations.

---

## 5. Performance Risks

### 5.1 Service Instances Created Per-Fetch (lines 902–904)

```typescript
const avalancheService = new AvalancheService();
const openSeaService = new OpenSeaService();
const coinGeckoService = new CoinGeckoService();
```

New instances every time `loadItemDetails` runs. CLAUDE.md notes this is a known anti-pattern — should use `walletFetcher.getServices()`.

**Recommendation**: Use shared service instances via `walletFetcher.getServices()`.

### 5.2 `formatDate` and `getChainDisplayName` Recreated Every Render (lines 2018–2031)

These functions are defined as plain function declarations after the hooks section (post early-return). They are recreated on every render. `formatDate` is called 3 times in Acquisition Details; `getChainDisplayName` is called once.

**Recommendation**: Move outside the component (they're pure functions with no closure deps), or wrap in `useCallback`.

### 5.3 `getPositionOnRange` Recreated Every Render (line 2130)

Pure function with no closure dependencies, defined inline in the component body.

**Recommendation**: Move outside the component as a module-level function.

### 5.4 `costBasisGun` IIFE Runs Every Render (lines 2045–2082)

An IIFE that computes canonical cost basis. It reads `currentResolvedAcquisition`, `isBatchPurchase`, `nft`, and `currentPurchaseData`. Not wrapped in `useMemo`.

**Recommendation**: Wrap in `useMemo` with appropriate deps, or extract to a function.

### 5.5 `sortedItems` Memo is 44 Lines (lines 593–636) with Object Construction

Each item in the sorted array is constructed as a new `ItemData` object with embedded `colors` object. Since `nft` is the only dep and typically the same object reference between renders, this is likely stable — but if `nft` reference changes (e.g., from enrichment updates), it triggers a full re-sort and re-construction.

**Recommendation**: Acceptable complexity, but consider splitting the sort from the object construction if profiling reveals issues.

### 5.6 No `useCallback` in Entire Component

Zero `useCallback` usage despite multiple functions passed as props or event handlers:
- `onClose` is received as a prop and forwarded
- `setRelatedItemsExpanded` is passed to Weapon Lab panel
- `setActiveItemIndex` is called in click handlers

If this component's children are memoized (`React.memo`), the missing `useCallback` wrappers would break memoization.

**Recommendation**: Low priority unless child components use `React.memo`. Worth auditing if/when sub-components are extracted.

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| Total lines | 2,936 |
| `useState` declarations | 11 |
| `useEffect` declarations | 4 |
| `useMemo` declarations | 7 |
| `useCallback` declarations | 0 (imported, never used) |
| `useRef` declarations | 6 |
| IIFE blocks in JSX | 8 |
| Largest function | `loadItemDetails` — 1,302 lines |
| Largest IIFE | YOUR POSITION — 345 lines |
| Duplicated code with hook | ~273 lines (candidate functions) + ~1,100 lines (pipeline logic) |
| Extract candidates | 7 sub-components identified |

### Priority Ranking

1. **Adopt `useNFTAcquisitionPipeline` hook** — eliminates ~1,500 lines of duplicate code
2. **Extract YOUR POSITION into sub-component** — removes 345-line IIFE
3. **Extract Weapon Lab Panel** — independent 130-line side panel
4. **Collapse venue branches + extract `resolveHistoricalUsd`** — removes ~200 lines of repetition
5. **Clean up dead code** — `useCallback` import, `getDefaultRarityColors`, TODO block, debug-only vars
