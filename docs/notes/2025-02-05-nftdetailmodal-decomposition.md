# NFTDetailModal Decomposition

**Date**: 2025-02-05
**Result**: `NFTDetailModal.tsx` reduced from 3,163 → 1,069 lines (-66%)

## Architecture

```
NFTDetailModal.tsx (1,069 lines — render + UI state)
  ├── useGunPrice.ts (40 lines)
  ├── useNFTDetailDebug.ts (231 lines)
  ├── useNFTAcquisitionPipeline.ts (1,759 lines)
  └── useWeaponCompatibility.ts (56 lines)
```

## What Moved Where

| Code | From (modal) | To |
|------|-------------|-----|
| Pure helpers (findRelatedItems, getVenueDisplayLabel, getRarityColorForNft) | Inline functions | `lib/nft/nftDetailHelpers.ts` |
| Local `isWeapon()` duplicate | Deleted | Already in `lib/weapon/weaponCompatibility.ts` |
| GUN price fetch + state | Reset effect + state | `useGunPrice` hook |
| Debug state, copy-to-clipboard, reset | 110-line init + 90-line callback | `useNFTDetailDebug` hook |
| Types (PriceSource, AcquisitionData, etc.) | Inline type defs | Exported from `useNFTAcquisitionPipeline` |
| Scoring functions (scoreAcquisitionCandidate, etc.) | Module-level functions | Inside `useNFTAcquisitionPipeline` |
| 1,253-line monolithic effect | Inline useEffect | `useNFTAcquisitionPipeline` hook |
| 9 state variables + 5 refs | Component state | `useNFTAcquisitionPipeline` hook |
| Weapon compatibility memos | Inline useMemo | `useWeaponCompatibility` hook |

## Decisions

- **No orchestrator hook**: The modal is 1,069 lines with ~90 lines of logic and ~800 lines of JSX. An orchestrator would create a very wide interface (20+ return values) for minimal benefit.
- **Pipeline hook owns reset**: The hook has its own `useEffect([isOpen])` for pipeline state reset. The component only resets UI state (`activeItemIndex`, `detailsExpanded`, debug).
- **updateDebugData pattern**: All `setDebugData(prev => ({ ...prev, ... }))` calls became `updateDebugData({...})`, passed to the pipeline hook as an option.

## Gotchas

- `NFTHoldingAcquisition` vs `HoldingAcquisitionData`: These types have subtly different nullability (`fromAddress: string | undefined` vs `string | null`). Use `NFTHoldingAcquisition` from `@/lib/blockchain/avalanche` directly.
- The pipeline hook's monolithic effect was moved verbatim — no refactoring of internal logic. It could be decomposed further in the future.
- `handleCopyDebugData` in the debug hook accepts external data via `CopyDebugParams` at call time, avoiding circular dependencies between hooks.
