# NFT Pricing Pipeline - Technical Specification

> **Version**: 1.0 (Phase 1 - GunzChain Only)
> **Status**: Implementation Ready
> **Last Updated**: January 2026

## Table of Contents
1. [Overview](#overview)
2. [Data Sources](#data-sources)
3. [Transaction Classification](#transaction-classification)
4. [Cost Basis Calculation](#cost-basis-calculation)
5. [Valuation Methods](#valuation-methods)
6. [P&L Calculations](#pnl-calculations)
7. [API Endpoints](#api-endpoints)
8. [Implementation Phases](#implementation-phases)
9. [Edge Cases](#edge-cases)
10. [Future: Bridge Support](#future-bridge-support)

---

## Overview

### Goals
1. **Acquisition Tracking**: Determine HOW each NFT was acquired and its cost basis
2. **Historical USD Value**: Calculate USD value at time of acquisition using historical GUN price
3. **Current Valuation**: Estimate current market value from sales data and floor prices
4. **P&L Calculation**: Show unrealized gains/losses based on GUN appreciation AND market value

### Key Metrics Per NFT
| Metric | Description | Source |
|--------|-------------|--------|
| `costBasisGUN` | What the user paid in GUN | On-chain tx value |
| `costBasisUSD` | USD value at acquisition | GUN price at tx time |
| `currentValueUSD` | Same GUN at today's price | Current GUN price |
| `marketValueUSD` | Estimated sale value | OpenSea floor/sales |
| `unrealizedGainUSD` | currentValueUSD - costBasisUSD | Calculated |
| `potentialGainUSD` | marketValueUSD - costBasisUSD | Calculated |

---

## Data Sources

### 1. GunzChain RPC (Primary)

**Endpoint**: `https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc`

**Methods Used**:
```javascript
// Get transaction receipt (includes logs)
eth_getTransactionReceipt(txHash)

// Get transaction details (includes value)
eth_getTransactionByHash(txHash)

// Get logs for address/contract
eth_getLogs({
  address: contractAddress,
  topics: [...],
  fromBlock: '0x...',
  toBlock: 'latest'
})

// Get block timestamp
eth_getBlockByNumber(blockNumber, false)
```

**Key Contracts**:
```typescript
const CONTRACTS = {
  OTG_GAME_ITEM: '0x...', // NFT contract - get from env
  OTG_DECODER: '0x...',   // Decode/mint contract
  OTG_MARKETPLACE: '0x...', // In-game marketplace
};

// Transfer event topic
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
```

### 2. OpenSea API v2

**Base URL**: `https://api.opensea.io/api/v2`
**Collection Slug**: `off-the-grid`
**Chain**: Need to verify - likely `gunz` or chain ID

**Endpoints**:
```typescript
// Events for specific NFT (sales, transfers, listings)
GET /events/chain/{chain}/contract/{address}/nfts/{identifier}
Headers: { 'X-API-KEY': process.env.OPENSEA_API_KEY }

// Collection stats (floor price)
GET /collections/{collection_slug}/stats

// Events by wallet address
GET /events/accounts/{address}

// Active listings
GET /listings/collection/{collection_slug}
```

**Event Types**:
- `sale` - Completed sale
- `transfer` - Ownership transfer
- `listing` - New listing
- `offer` - Offer made
- `cancel` - Listing/offer cancelled

### 3. CoinGecko API

**GUN Token ID**: `gunzilla-gun` (verify this)

```typescript
// Current price
GET /api/v3/simple/price?ids=gunzilla-gun&vs_currencies=usd

// Historical prices (for cost basis at acquisition)
GET /api/v3/coins/gunzilla-gun/market_chart?vs_currency=usd&days=365

// Response format for market_chart:
{
  prices: [[timestamp_ms, price], ...],
  market_caps: [...],
  total_volumes: [...]
}
```

---

## Transaction Classification

### Decision Tree

```
For each Transfer event TO user's wallet:
│
├─ Is sender 0x0000...0000? (Mint)
│  └─ YES → Check interacting contract
│     ├─ OTG Decoder → DECODE (costGUN = tx.value)
│     └─ Other → MINT (likely airdrop, costGUN = 0)
│
├─ Is there value in transaction?
│  └─ YES → Check contract
│     ├─ OTG Marketplace → MARKETPLACE_PURCHASE (costGUN = tx.value)
│     └─ OpenSea contracts → OPENSEA_PURCHASE (need API lookup)
│
└─ NO value, non-zero sender
   └─ TRANSFER (gift or self-transfer, costGUN = 0)
```

### Classification Code

```typescript
interface TransactionClassification {
  type: 'decode' | 'marketplace' | 'opensea' | 'transfer' | 'airdrop' | 'unknown';
  costGUN: number;
  costWGUN: number;  // For OpenSea offers
  timestamp: Date;
  txHash: string;
  fromAddress: string;
  toAddress: string;
  blockNumber: number;
}

async function classifyAcquisition(
  transferLog: TransferLog,
  txReceipt: TransactionReceipt,
  tx: Transaction
): Promise<TransactionClassification> {
  const fromAddress = transferLog.from;
  const toAddress = transferLog.to;
  const txValue = BigInt(tx.value);
  
  // Check if mint (from zero address)
  if (fromAddress === '0x0000000000000000000000000000000000000000') {
    // Check which contract was interacted with
    if (tx.to?.toLowerCase() === CONTRACTS.OTG_DECODER.toLowerCase()) {
      return {
        type: 'decode',
        costGUN: Number(txValue) / 1e18,
        costWGUN: 0,
        timestamp: await getBlockTimestamp(tx.blockNumber),
        txHash: tx.hash,
        fromAddress,
        toAddress,
        blockNumber: tx.blockNumber,
      };
    }
    // Other mint (airdrop)
    return { type: 'airdrop', costGUN: 0, ... };
  }
  
  // Check if marketplace purchase
  if (tx.to?.toLowerCase() === CONTRACTS.OTG_MARKETPLACE.toLowerCase()) {
    return {
      type: 'marketplace',
      costGUN: Number(txValue) / 1e18,
      ...
    };
  }
  
  // Check for OpenSea (need to match with API)
  const openseaEvent = await matchOpenSeaEvent(transferLog, tx);
  if (openseaEvent?.event_type === 'sale') {
    return {
      type: 'opensea',
      costGUN: openseaEvent.payment.quantity / 1e18,
      ...
    };
  }
  
  // Default: transfer
  return { type: 'transfer', costGUN: 0, ... };
}
```

---

## Cost Basis Calculation

### Formula

```
Cost Basis (USD) = costGUN × gunPriceUSD_at_acquisition + bridge_fees
```

### Historical Price Lookup

```typescript
interface HistoricalPrice {
  timestamp: Date;
  priceUSD: number;
  source: 'coingecko' | 'cached' | 'interpolated';
}

async function getGunPriceAtTime(timestamp: Date): Promise<HistoricalPrice> {
  // 1. Check cache
  const cached = await priceCache.get(timestamp);
  if (cached) return { ...cached, source: 'cached' };
  
  // 2. Fetch from CoinGecko
  const startTime = new Date(timestamp.getTime() - 24 * 60 * 60 * 1000);
  const endTime = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000);
  
  const response = await fetch(
    `https://api.coingecko.com/api/v3/coins/gunzilla-gun/market_chart/range?` +
    `vs_currency=usd&from=${startTime.getTime()/1000}&to=${endTime.getTime()/1000}`
  );
  const data = await response.json();
  
  // 3. Interpolate to exact timestamp
  const price = interpolatePrice(data.prices, timestamp.getTime());
  
  // 4. Cache result
  await priceCache.set(timestamp, price);
  
  return { timestamp, priceUSD: price, source: 'interpolated' };
}

function interpolatePrice(prices: [number, number][], targetMs: number): number {
  // Find surrounding data points
  let before = prices[0];
  let after = prices[prices.length - 1];
  
  for (let i = 0; i < prices.length - 1; i++) {
    if (prices[i][0] <= targetMs && prices[i + 1][0] >= targetMs) {
      before = prices[i];
      after = prices[i + 1];
      break;
    }
  }
  
  // Linear interpolation
  const ratio = (targetMs - before[0]) / (after[0] - before[0]);
  return before[1] + ratio * (after[1] - before[1]);
}
```

---

## Valuation Methods

### Priority Order

1. **Active Listing**: If this specific NFT is listed, use listing price
2. **Recent Sale**: If this specific NFT sold recently, use sale price
3. **Comparable Sales**: Sales of same item type + rarity in last 30 days
4. **Floor Price**: Collection floor from OpenSea

### Comparable Sales Logic

```typescript
interface ComparableSale {
  tokenId: string;
  name: string;
  rarity: string;
  salePrice: number;
  saleDate: Date;
  marketplace: 'opensea' | 'marketplace';
}

async function findComparableSales(nft: NFT): Promise<ComparableSale[]> {
  // Get all sales for collection in last 30 days
  const events = await opensea.getEvents({
    collection: 'off-the-grid',
    event_type: 'sale',
    after: thirtyDaysAgo,
  });
  
  // Filter to same item type and rarity
  const comparable = events.filter(e => 
    e.nft.name === nft.name && 
    e.nft.traits?.RARITY === nft.traits?.RARITY
  );
  
  return comparable.map(e => ({
    tokenId: e.nft.identifier,
    name: e.nft.name,
    rarity: e.nft.traits?.RARITY,
    salePrice: e.payment.quantity / 1e18,
    saleDate: new Date(e.event_timestamp * 1000),
    marketplace: 'opensea',
  }));
}

function estimateValue(nft: NFT, comparables: ComparableSale[]): NFTValuation {
  if (comparables.length === 0) {
    return {
      valuationReliable: false,
      valuationConfidence: 'none',
      ...
    };
  }
  
  // Calculate statistics
  const prices = comparables.map(c => c.salePrice);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  
  return {
    lastComparableSaleGUN: comparables[0].salePrice,
    lastComparableSaleDate: comparables[0].saleDate,
    comparableSalesCount: comparables.length,
    estimatedValueLowGUN: min,
    estimatedValueHighGUN: max,
    valuationReliable: comparables.length >= 3,
    valuationConfidence: comparables.length >= 5 ? 'high' : 
                         comparables.length >= 3 ? 'medium' : 'low',
  };
}
```

---

## P&L Calculations

### Unrealized P&L (GUN Appreciation)

Shows how much your GUN investment has grown:

```typescript
// User paid 500 GUN when GUN was $0.02
costBasisGUN = 500
costBasisUSD = 500 × 0.02 = $10.00

// Today GUN is $0.05
currentGunPrice = 0.05
costBasisAtTodayPrice = 500 × 0.05 = $25.00

// Unrealized gain from GUN appreciation
unrealizedGainUSD = $25.00 - $10.00 = $15.00
unrealizedGainPercent = ($15.00 / $10.00) × 100 = 150%
```

### Market P&L (If Sold)

Shows potential profit if sold at market value:

```typescript
// Estimated sale value based on comparables
estimatedSaleGUN = 600  // Could sell for 600 GUN
estimatedSaleUSD = 600 × 0.05 = $30.00

// Potential gain
potentialGainUSD = $30.00 - $10.00 = $20.00
potentialGainPercent = ($20.00 / $10.00) × 100 = 200%
```

### Transfer Edge Case

When NFT was received via transfer (gift/self-transfer):

```typescript
// No cost basis
costBasisGUN = 0
costBasisUSD = 0

// Can still show market value
estimatedSaleUSD = 600 × currentGunPrice
// But P&L is "infinite" - display as "N/A" or "Gift"
```

---

## API Endpoints

### New Endpoints to Create

```typescript
// GET /api/nft/acquisition/[tokenId]
// Returns acquisition details for a specific NFT
{
  tokenId: string;
  acquisition: {
    type: 'decode' | 'marketplace' | 'opensea' | 'transfer' | 'airdrop';
    costGUN: number;
    costUSD: number;
    gunPriceAtAcquisition: number;
    timestamp: string;
    txHash: string;
    fromAddress: string;
  };
  source: 'onchain' | 'cache' | 'opensea';
  reliability: 'confirmed' | 'inferred';
}

// GET /api/nft/valuation/[tokenId]
// Returns current valuation for a specific NFT
{
  tokenId: string;
  valuation: {
    floorPriceGUN: number | null;
    lastComparableSaleGUN: number | null;
    comparableSalesCount: number;
    estimatedValueLowGUN: number | null;
    estimatedValueHighGUN: number | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
  };
  currentListingGUN: number | null;
  lastUpdated: string;
}

// GET /api/price/gun/history?timestamp=ISO_STRING
// Returns GUN price at a specific time
{
  timestamp: string;
  priceUSD: number;
  source: 'coingecko' | 'cache';
}

// GET /api/nft/portfolio/[walletAddress]
// Returns full portfolio with P&L
{
  wallet: string;
  summary: {
    totalCostBasisGUN: number;
    totalCostBasisUSD: number;
    totalCurrentValueUSD: number;
    totalUnrealizedGainUSD: number;
    totalUnrealizedGainPercent: number;
  };
  nfts: Array<{
    tokenId: string;
    name: string;
    acquisition: AcquisitionData;
    valuation: ValuationData;
    pnl: PnLData;
  }>;
}
```

---

## Implementation Phases

### Phase 1A: On-Chain Acquisition (Week 1)
1. Create `AcquisitionService` class
2. Implement transaction classification
3. Build `eth_getLogs` query for Transfer events
4. Parse OTG Decoder and Marketplace transactions
5. Create `/api/nft/acquisition/[tokenId]` endpoint

### Phase 1B: Historical Prices (Week 1-2)
1. Create `PriceHistoryService` class
2. Implement CoinGecko market_chart fetching
3. Build price interpolation logic
4. Add caching layer (Redis or localStorage)
5. Create `/api/price/gun/history` endpoint

### Phase 1C: OpenSea Integration (Week 2)
1. Verify OpenSea chain identifier for GunzChain
2. Implement event fetching for sales
3. Match OpenSea events to on-chain transfers
4. Get floor price and listings
5. Create `/api/nft/valuation/[tokenId]` endpoint

### Phase 1D: P&L Calculation (Week 2-3)
1. Create `PnLService` class
2. Combine acquisition + valuation data
3. Calculate all P&L metrics
4. Update NFTDetailModal UI
5. Create portfolio summary endpoint

### Phase 1E: Testing & Edge Cases (Week 3)
1. Handle transfer edge cases
2. Test with various acquisition types
3. Verify historical price accuracy
4. Performance optimization
5. Error handling and fallbacks

---

## Edge Cases

### 1. Same Item, Different Acquisitions
**Problem**: User owns Prankster Shorts #328 (purchased) and #348 (transferred)
**Solution**: Track by unique tokenId, not item name

### 2. Missing Historical Price
**Problem**: CoinGecko doesn't have price for acquisition date
**Solution**: 
- Use closest available price
- Mark as "estimated"
- Fall back to first available price if very old

### 3. wGUN Offers (OpenSea)
**Problem**: Offers use wrapped GUN (wGUN), escrow contract
**Solution**: 
- Check for wGUN transfers in same tx
- Match with OpenSea API offer events
- May need to track escrow contract

### 4. Bulk Transfers
**Problem**: Multiple NFTs in single transaction
**Solution**: 
- Parse all Transfer logs in receipt
- Distribute any value evenly (rare for purchases)
- Usually indicates gift/consolidation

### 5. Re-acquired NFT
**Problem**: User sold NFT, then bought it back
**Solution**: 
- Track only CURRENT acquisition
- Previous sale is separate record
- Cost basis resets on re-purchase

---

## Future: Bridge Support

When LayerZero NFT bridge launches:

### New Event Types
```typescript
// LayerZero events to monitor
const LAYERZERO_EVENTS = {
  PACKET_SENT: '0x...', // NFT locked on source
  PACKET_RECEIVED: '0x...', // NFT minted on destination
};
```

### Cross-Chain Tracking
```typescript
interface CrossChainNFT extends NFT {
  currentChain: 'gunzchain' | 'solana';
  bridgeHistory: BridgeEvent[];
  totalBridgeFees: number;
}

interface BridgeEvent {
  direction: 'to-solana' | 'to-gunzchain';
  timestamp: Date;
  txHashSource: string;
  txHashDest: string;
  layerZeroMessageId: string;
  feeGUN: number;
}
```

### Cost Basis with Bridge
```
Total Cost Basis = Original Acquisition + All Bridge Fees
```

---

## Appendix: Contract ABIs

### OTG Game Item (ERC-721)
```json
{
  "Transfer": {
    "type": "event",
    "inputs": [
      {"name": "from", "type": "address", "indexed": true},
      {"name": "to", "type": "address", "indexed": true},
      {"name": "tokenId", "type": "uint256", "indexed": true}
    ]
  }
}
```

### OTG Decoder
```json
{
  "decode": {
    "type": "function",
    "inputs": [...],
    "outputs": [...]
  }
}
```

*(Full ABIs to be extracted from verified contracts on GunzScan)*
