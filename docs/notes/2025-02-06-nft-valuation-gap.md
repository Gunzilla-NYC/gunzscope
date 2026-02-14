# NFT Valuation Gap — Per-Item Market Value

**Date**: 2025-02-06
**Status**: Complete (all 4 phases implemented 2026-02-14)
**Priority**: High — directly affects portfolio accuracy

---

## Problem

The portfolio total uses **cost basis** (`purchasePriceGun * gunPrice`) for NFT valuation because the only alternative — OpenSea's collection-level floor price — is a single number for the entire "Off The Grid" collection (~22.9M indexed items). This floor price is meaningless at the item level: a Common Charm and an Epic Assault Rifle get the same value.

**Impact**: Users cannot see what their portfolio is actually *worth* today — only what they *paid*. The P&L calculation (`floorPrice - purchasePriceGun`) is equally unreliable since `floorPrice` is the collection floor, not per-item.

---

## Current State

| Valuation Method | Available? | Accuracy | Cost |
|---|---|---|---|
| Cost basis (`purchasePriceGun * gunPrice`) | Yes (after enrichment) | Accurate for "what I paid" | 15-45s per NFT |
| Collection floor (`floorPrice`) | Yes | Very inaccurate per-item | 1 API call |
| Per-item lowest listing (`currentLowestListing`) | Yes, on-demand only | Most accurate | 1 API call per NFT, rate-limited |
| Rarity-tier floor (`getRarityFloorPrice`) | Exists but expensive | Better than collection floor, still imprecise | 50 sales + 20 trait lookups |
| Comparable sales (`getComparableSales`) | Exists but expensive | Good for recently traded items | 200 sales + trait enrichment |

---

## Recommended Solutions (in order of implementation priority)

### Phase 1: Per-Item Listing Price Cache (Quick Win)

**What**: During enrichment, also fetch `currentLowestListing` for each NFT via the existing `getNFTListings()` method. Cache alongside acquisition data.

**How**:
1. Add `currentLowestListing` and `listingFetchedAt` to `CachedNFTDetailData` in `nftCache.ts`
2. In `enrichSingleNFT()` (useNFTEnrichmentOrchestrator), add a parallel `getNFTListings()` call with 5s timeout
3. Store result in cache with 4-hour TTL (listings change more frequently than acquisition data)
4. Use `currentLowestListing * gunPrice` as "market value" when available, fall back to cost basis

**Trade-offs**:
- Adds 1 API call per NFT during enrichment (rate limit concern)
- OpenSea orders endpoint has a circuit breaker (10min failure cache) — failures are non-blocking
- Not all NFTs have active listings — unlisted items still fall back to cost basis

**Expected coverage**: ~30-60% of NFTs will have active listings. Much better than 0% today.

### Phase 2: Rarity-Tier Floor Price Table (Medium Effort)

**What**: Build and cache a lookup table of floor prices by (item_name, quality) or at minimum by (quality). Refresh periodically rather than per-NFT.

**How**:
1. Create a new API route `/api/opensea/rarity-floors` that calls `getCollectionSaleEvents()` + trait enrichment
2. Build a map: `{ "Common": X, "Uncommon": Y, "Rare": Z, "Epic": W }` from recent sales
3. Cache server-side with 1-hour TTL (Redis or in-memory)
4. Client fetches once on portfolio load; apply as fallback valuation for unlisted NFTs
5. Optionally extend to `(quality, weaponType)` pairs for finer granularity

**Trade-offs**:
- Requires ~50 OpenSea API calls to build the table (collection sales + trait fetches)
- Only as accurate as recent sales volume per rarity tier — low-volume tiers may have stale data
- Server-side caching needed to avoid rebuilding on every client request

**Expected coverage**: 100% of NFTs get a rarity-appropriate floor estimate.

### Phase 3: Comparable Sales Valuation Model (Higher Effort)

**What**: For each unique item name (e.g., "Vulture Legacy"), find recent sales of the same item and use the median/average as estimated value.

**How**:
1. Extend the rarity floor table to also track per-item-name pricing
2. `getComparableSales()` already exists — wrap it in a batch-friendly, cached service
3. Build a `valuationCache`: `Map<itemName, { estimatedGun: number, saleCount: number, confidence: string, updatedAt: Date }>`
4. Refresh daily via a cron job or on-demand API route
5. Apply as: per-item listing > comparable sales median > rarity floor > cost basis (waterfall)

**Trade-offs**:
- Many items have zero or very few recent sales — model is sparse
- Needs a server-side job or lazy build pattern
- Confidence scoring becomes more complex (how recent are the comps? how many?)

### Phase 4: Dual-Value Display (UX Change)

**What**: Show both "Cost Basis" and "Estimated Market Value" in the portfolio summary, with clear labels and confidence indicators.

**How**:
1. `PortfolioCalcResult` gets new fields: `nftsMarketValueUsd`, `nftsMarketValueReliable`, `marketValueConfidence`
2. Portfolio total shows market value when confidence is high, cost basis with a label when not
3. P&L becomes: `marketValue - costBasis` instead of `floor - purchasePrice`
4. PortfolioSummaryBar shows both values with a toggle or side-by-side

**Depends on**: Phase 1 or 2 being implemented first to have market value data.

---

## Valuation Waterfall (Target Architecture)

For each NFT, use the best available price in this priority order:

```
1. Per-item active listing price (Phase 1) — most accurate, real-time
2. Comparable sales median (Phase 3) — good for recently traded items
3. Rarity-tier floor (Phase 2) — reasonable estimate for all items
4. Cost basis (current) — "what I paid" fallback
5. Zero — no data available
```

Each level includes a confidence tag so the UI can communicate data quality to the user.

---

## Key Constraints to Remember

- OpenSea rate limits: ~2 req/sec with API key. A 15-NFT portfolio doing per-item listing lookups = 15 extra calls during enrichment.
- Circuit breaker on OpenSea orders: 10-minute failure cache. If OpenSea is down, gracefully fall back.
- Enrichment already takes 2-4 minutes for a 15-NFT portfolio. Adding listing lookups should be parallel (not sequential) to avoid increasing total time.
- Cache TTLs should differ: acquisition data (24h), listing prices (4h), rarity floors (1h).
