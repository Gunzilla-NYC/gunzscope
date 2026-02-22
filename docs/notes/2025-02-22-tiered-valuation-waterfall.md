# Tiered Valuation Waterfall — Implementation Notes

**Date**: 2025-02-22
**Spec**: `docs/notes/tiered-valuation.md`
**Plan**: `C:\Users\data\.claude\plans\streamed-waddling-orbit.md`

## What Was Implemented

Dual-track pricing: Track A (GUN appreciation, existing) + Track B (Market Exit, new).

Track B uses a 6-tier waterfall of comparable sales with time-weighted medians to estimate what an NFT would sell for today. Both tracks are shown simultaneously because the thin OTG market means neither alone tells the full story.

## Files Created

| File | Purpose |
|------|---------|
| `lib/nft/parseItemName.ts` | Parses OTG item names: "X for the Y" → skinDesign + weapon |
| `lib/portfolio/valuationService.ts` | Pure function: walks waterfall tiers 1-6, returns best estimate |

## Files Modified

| File | Change |
|------|--------|
| `lib/api/opensea.ts` | Added `WaterfallEntry`, `WaterfallData` types; `timeWeightedMedian()` helper; waterfall groupings (byTokenId/byName/bySkin/byWeapon) in `getComparableSalesTable()` |
| `lib/types.ts` | Added 3 fields to NFT: `marketExitGun`, `marketExitTier`, `marketExitTierLabel` |
| `lib/portfolio/applyValuationTables.ts` | Added `waterfall?: WaterfallData` to `ComparableSalesData`; calls `getMarketExitValuation()` per NFT |
| `app/api/opensea/comparable-sales/route.ts` | Updated `CachedResult` to include waterfall; error fallback returns empty waterfall |
| `components/nft-gallery/utils.ts` | Added `trackBGun/trackBLabel/trackBDisplay` to `NFTCardData` + `deriveCardData()` |
| `components/nft-gallery/NFTGalleryGridCard.tsx` | Track B line below ValuationLabel (medium+ cards) |
| `components/nft-gallery/NFTGalleryListRow.tsx` | Track B line below ValuationLabel |
| `components/nft-detail/NFTDetailQuickStats.tsx` | 4th column "Market Exit" with GUN/USD/tier/P&L |
| `components/NFTDetailModal.tsx` | `trackB` useMemo computing exit USD + P&L, passed to QuickStats |
| `lib/hooks/useNFTEnrichmentOrchestrator.ts` | `scarcityMapRef` tracks max mint per baseName (prep for Tier 5) |

## Data Flow

```
OpenSea Sales API (2h server cache)
  → /api/opensea/comparable-sales (returns items + waterfall)
  → PortfolioClient.tsx (fetches once per load)
  → applyValuationTables() (calls valuationService per NFT)
  → NFT objects with marketExitGun/Tier/Label
  → deriveCardData() → trackBGun/trackBLabel/trackBDisplay
  → Grid/List cards + Modal QuickStats
```

## Waterfall Tiers

| Tier | Label | Key | Min Sales |
|------|-------|-----|-----------|
| 1 | EXACT | byTokenId[tokenId] | 1 |
| 2 | VIA SALES | byName[baseName] | 2 |
| 3 | VIA SKIN | bySkin[skinDesign] | 2 (skins only) |
| 4 | VIA WEAPON | byWeapon[weapon] | 2 (skins only) |
| 5 | SIMILAR | — | Deferred (data collection started) |
| 6 | FLOOR | floorPrice fallback | Always available |

## Time-Weighted Median

Sales are weighted by recency before computing the median:
- 0-7 days: weight 1.0
- 7-30 days: weight 0.75
- 30-90 days: weight 0.50
- 90+ days: weight 0.25

Weighted median: sort by price ascending, walk until cumulative weight >= halfTotalWeight.

## Gotchas

1. **Backward compatibility**: `ComparableSalesData.waterfall` is optional (`?`) so existing code that only uses `items` is unaffected.
2. **Tier 3+4 are skins-only**: Only items matching the "X for the Y" pattern can use VIA SKIN and VIA WEAPON tiers. Weapons/other items skip directly from Tier 2 to Tier 6.
3. **Track B display on cards**: Only shown on medium+ grid cards (`viewMode !== 'small'`). Always shown on list rows.
4. **QuickStats grid**: Adapts 3→4 columns when Track B is available. On mobile uses `grid-cols-2 sm:grid-cols-4`.
5. **Scarcity map**: Populated from max observed mint numbers during enrichment. Stored in a ref, not state (no re-render). This is prep data for future Tier 5 implementation.
6. **API route cache**: The comparable-sales route caches `waterfall` alongside existing `items`. Error fallback returns empty waterfall `{ byTokenId: {}, byName: {}, bySkin: {}, byWeapon: {} }`.

## Deferred

- **Tier 5 (SIMILAR SCARCITY)**: Requires cross-item scarcity matching. Data collection (scarcityMap) is in place; matching logic deferred.
- **Track B in calcPortfolio**: Track B is displayed per-item only. Portfolio-level Track B aggregation (total market exit value) is not yet computed.
