# GUNZscope Data Enrichment Inventory

GUNZscope enriches every NFT with 39 fields on the core `NFT` type, plus 28 derived display fields from `deriveCardData()`, 12 from the acquisition pipeline, 6 from listings data, and 56 debug/diagnostic fields. The full system tracks 141 fields per NFT across all layers.

## Summary

| Layer | Fields | Source File |
|-------|--------|-------------|
| Core NFT type | 39 | `lib/types.ts` |
| Gallery card derived | 28 | `components/nft-gallery/utils.ts` |
| Acquisition pipeline | 12 | `components/nft-detail/types.ts` |
| Listings data | 6 | `components/nft-detail/types.ts` |
| Debug & diagnostics | 56 | `components/nft-detail/types.ts` |
| **Total** | **141** | |

## Without GUNZscope vs With GUNZscope

| | Without GUNZscope | With GUNZscope |
|---|---|---|
| Raw fields | ~12 across 4 sources | 85 enriched (user-visible) |
| Cost basis | None | 10 acquisition fields with venue detection |
| Pricing | One price (floor) | 6-tier valuation waterfall with confidence |
| P&L | None | Dual-track (GUN appreciation + market reference) |
| Weapon context | None | Compatibility detection via model codes |
| Enrichment ratio | 1x | ~7x (conservative) to ~12x (full system) |

## Core NFT Type — 39 Fields

### Identity & Display (8)

| # | Field | Source | Description |
|---|-------|--------|-------------|
| 1 | `tokenId` | On-chain | Primary token ID |
| 2 | `tokenIds` | Grouping logic | All token IDs (grouped items) |
| 3 | `name` | tokenURI / GunzScan / canonical | Item name |
| 4 | `description` | tokenURI / GunzScan / canonical | Metadata description |
| 5 | `image` | tokenURI | Standard image URL |
| 6 | `imageHires` | OpenSea CDN | High-res image (i.seadn.io) |
| 7 | `collection` | OpenSea | Collection name |
| 8 | `contractAddress` | On-chain | NFT contract address |

### Chain & Classification (4)

| # | Field | Source | Description |
|---|-------|--------|-------------|
| 9 | `chain` | Wallet provider | Blockchain (avalanche / solana) |
| 10 | `traits` | tokenURI / GunzScan | Key-value metadata pairs |
| 11 | `typeSpec` | Canonical metadata | Raw GUNZ type spec (item_type, name, part, functional tier) |
| 12 | `quantity` | Grouping logic | Number of copies held |

### Mint & Grouping (3)

| # | Field | Source | Description |
|---|-------|--------|-------------|
| 13 | `mintNumber` | Traits / GunzScan | Display mint number (Serial Number) |
| 14 | `mintNumbers` | Grouping logic | All mint numbers (grouped items) |
| 15 | `groupedRarities` | Grouping logic | Per-item rarities within group |

### Acquisition & Cost Basis (10)

| # | Field | Source | Description |
|---|-------|--------|-------------|
| 16 | `purchasePriceGun` | RPC transfer events | Cost in GUN tokens |
| 17 | `purchasePriceUsd` | CoinGecko historical | Cost in USD at time of purchase |
| 18 | `purchasePriceUsdEstimated` | Price resolution | Flag: was USD price interpolated? |
| 19 | `totalPurchasePriceGun` | Enrichment pipeline | Sum of costs across grouped items |
| 20 | `purchaseDate` | RPC block timestamp | Acquisition timestamp |
| 21 | `acquisitionVenue` | RPC event analysis | How acquired (decode / opensea / marketplace / transfer / mint / etc.) |
| 22 | `acquisitionTxHash` | RPC transfer events | Transaction hash of acquisition |
| 23 | `transferredFrom` | RPC transfer events | Sender address (free transfers) |
| 24 | `isFreeTransfer` | RPC event analysis | True if no payment detected |
| 25 | `transferType` | Wallet classification | Self-transfer vs external gift |

### Market Pricing (4)

| # | Field | Source | Description |
|---|-------|--------|-------------|
| 26 | `floorPrice` | OpenSea collection stats | Collection floor price |
| 27 | `ceilingPrice` | OpenSea collection stats | Collection ceiling price |
| 28 | `currentLowestListing` | OpenSea listings API | Lowest active listing in GUN |
| 29 | `currentHighestListing` | OpenSea listings API | Highest active listing in GUN |

### Valuation Waterfall (5)

| # | Field | Source | Description |
|---|-------|--------|-------------|
| 30 | `comparableSalesMedian` | OpenSea sales events | Median GUN price from recent comparable sales |
| 31 | `rarityFloor` | OpenSea sales events | Floor price for this rarity tier |
| 32 | `marketExitGun` | Waterfall computation | Estimated sale price in GUN |
| 33 | `marketExitTier` | Waterfall computation | Which tier was used (1-6) |
| 34 | `marketExitTierLabel` | Waterfall computation | EXACT / VIA SALES / VIA SKIN / VIA WEAPON / SIMILAR / FLOOR |

### Metadata Debug (5 sub-fields)

| # | Field | Source | Description |
|---|-------|--------|-------------|
| 35 | `metadataDebug.tokenURI` | On-chain contract call | Raw tokenURI value |
| 36 | `metadataDebug.metadataSource` | Resolution pipeline | Where description came from |
| 37 | `metadataDebug.hasDescription` | Resolution pipeline | Presence flag |
| 38 | `metadataDebug.descriptionLength` | Resolution pipeline | Character count |
| 39 | `metadataDebug.error` | Resolution pipeline | Error message if failed |

## Gallery Card Derived Fields — 28 Fields

Computed by `deriveCardData()` in `components/nft-gallery/utils.ts`. Display-ready values powering every NFT card.

Includes: rarityName, rarityColor, isMixedRarity, itemClass, mintDisplay, mintData, nameInitials, trackAPnlPct, trackADisplay, trackBPnlPct, trackBGun, trackBLabel, trackBDisplay, trackBIsSalesBased, pnlPct, pnlDisplay, hasPnL, pnlPending, isProfit, isLoss, priceGun, priceDisplay, unrealizedUsd, marketListings, marketFloor, originShortName, originCategory, valuationMethod.

## Acquisition Pipeline Fields — 12 Fields

Computed by `useNFTAcquisitionPipeline` hook. Resolved per-NFT on detail modal open.

Includes: acquisitionType, venue, acquiredAt, costGun, costUsd, txHash, fromAddress, source, qualityScore, qualityReasons, isMint, debug.

## Listings Data — 6 Fields

Fetched per-token on modal open: lowest, highest, average, floorPriceGun, ceilingPriceGun, itemCount.

## Debug & Diagnostics — 56 Fields

Visible in dev mode debug panel. Covers cache resolution (6), transfer event analysis (9), marketplace integration (15), price resolution (5), user context (8), refresh state (13).

## Data Sources

| Source | What It Provides |
|--------|-----------------|
| GunzChain RPC | Transfer events, block timestamps, transaction receipts, Seaport event logs |
| GunzScan / Blockscout API | Token metadata, contract info, traits |
| Canonical Metadata API | Type specs, serial number authentication |
| OpenSea API | Floor/ceiling prices, active listings, comparable sales, collection stats, hi-res images |
| CoinGecko API | GUN/USD current price, historical prices for cost basis conversion |
| Game Marketplace API | Optional purchase history with order matching |
