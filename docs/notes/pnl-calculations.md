# P&L Calculations & Acquisition Reference

## Per-NFT Data (from `NFT` type in `/lib/types.ts`)

| Field | Description | Source |
|-------|-------------|--------|
| `purchasePriceGun` | GUN paid to acquire the NFT | Blockchain tx value |
| `purchasePriceUsd` | USD value at time of acquisition | CoinGecko historical price × GUN paid |
| `floorPrice` | Current floor price in GUN | OpenSea API |
| `quantity` | Number of identical items owned | Grouped NFT count |
| `acquiredAt` | Timestamp of acquisition | Blockchain tx timestamp |
| `acquisitionVenue` | Where acquired (OpenSea, Marketplace, Mint, etc.) | Transaction analysis |

## Portfolio-Level Data (from `PortfolioCalcResult`)

| Field | Description |
|-------|-------------|
| `totalUsd` | Total portfolio value in USD (GUN + NFTs) |
| `totalGunBalance` | GUN tokens held |
| `tokensUsd` | USD value of GUN tokens at current price |
| `nftsUsd` | USD value of NFTs (floor price × current GUN price) |
| `totalGunSpent` | Sum of all `purchasePriceGun` across NFTs |
| `nftCount` | Total number of NFTs owned |

## NFT Acquisition Venues

Every NFT enters a wallet through one of 5 venues. Each has a known cost basis:

| Venue | Cost Basis (X) | Source |
|-------|---------------|--------|
| **Decoded** | Decode cost in GUN (tx value of `decode()`) | On-chain tx value |
| **In-game marketplace** | GUN paid (`createAtomicSale()` tx value) | On-chain tx value |
| **OpenSea** | GUN or wGUN paid on secondary market | OpenSea sale events |
| **Transferred (self)** | Inherited from sender's original acquisition | Trace sender's chain |
| **Airdrop** | 0 (free — Twitch drops, events, promotions) | No tx cost |

For self-transfers: trace back to the sender's original acquisition using the same 5-venue logic.

## Acquisition Quality Scoring

The NFTDetailModal uses scoring to determine best acquisition data:
- `PURCHASE` type: +100 points
- Has `costGun > 0`: +90 points
- Has `acquiredAt`: +60 points
- Decode venue: +70 points
- `TRANSFER` with no cost: -80 points

## PnL Formula (GUN Price Appreciation)

PnL tracks how the USD value of the GUN spent has changed since purchase. **Not** floor price, market comps, or listings.

**Variables:**
- **X** = GUN paid for the NFT (from acquisition)
- **Y** = GUN/USD price at the exact moment of purchase (granular historical lookup)
- **Z** = current live GUN/USD price
- **A** = timestamp of the acquisition transaction (used to look up Y)

**Formulas:**
- Cost basis (USD at purchase): `Cost = X × Y`
- Current value (USD today): `Value = X × Z`
- Unrealized P&L (USD): `P&L = X × (Z - Y)`
- Percentage gain/loss: `F = ((Z - Y) / Y) × 100`

**Historical price precision:** Y must be the GUN/USD price at the exact transaction timestamp, not a daily average. Use CoinGecko `/coins/gunz/market_chart/range` with a narrow window around the block timestamp.

**GUN token launch date: March 31, 2025.** No price data exists before this date. Items acquired pre-launch cannot have USD PnL calculated.

## PnL Display Priority (Card)

| Priority | Condition | Display |
|----------|-----------|---------|
| 1 | On-chain cost + granular historical price (post-launch) | Full PnL: `+$23.64 (+30.3%)` |
| 2 | Self-transfer traced cost + granular historical price | Full PnL (one level removed) |
| 3 | On-chain cost + daily price snapshot (granular unavailable) | Full PnL (less precise Y) |
| 4 | On-chain cost, pre-launch date (before March 31, 2025) | GUN cost only, note: "Acquired before GUN launch" |
| 5 | Airdrop / Free transfer (X = 0) | "FREE" |
| 6 | Unknown acquisition | "—" |

## Derived Calculations

| Calculation | Formula | Used In |
|-------------|---------|---------|
| Total Cost Basis (USD) | `Σ(nft.purchasePriceUsd × nft.quantity)` | PortfolioSummaryBar hover |
| Per-item P&L (USD) | `X × (Z - Y)` | Card PnL, Modal UNREALIZED |
| Per-item P&L (%) | `((Z - Y) / Y) × 100` | Card PnL badge |
| GUN Value Today | `gunBalance × currentGunPrice` | GUN Balance hover |

## Data Coverage Notes
- `purchasePriceUsd`: Requires both `purchasePriceGun` (X) AND granular historical price at tx timestamp (Y)
- P&L calculations: Only for items with known cost (X > 0) AND post-launch acquisition date
- Pre-launch items: Show GUN cost only with explanatory note
- Airdrops/free transfers: X = 0, show "FREE"

## NFT Price Enrichment Flow

Background enrichment in `app/page.tsx` loads NFT purchase prices automatically:

1. **Blockchain acquisition** — RPC queries transfer events (slow, 13M+ blocks, 45s timeout)
2. **Venue classification** — Determines if OpenSea, in-game marketplace, mint, etc.
3. **Price lookup** — For OpenSea purchases, calls `/api/opensea/sales` to get GUN price
4. **Cache** — Stores complete data in localStorage for instant subsequent loads

**Important**: RPC transfer event queries scan millions of blocks and can take 15-45 seconds.
