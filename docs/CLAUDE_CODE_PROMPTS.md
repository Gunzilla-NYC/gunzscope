# Claude Code Prompts - NFT Pricing Pipeline

> Ready-to-use prompts for implementing the NFT pricing pipeline in GUNZscope.
> Copy and paste these directly into Claude Code.

---

## Phase 1A: On-Chain Acquisition Tracking

### Prompt 1A.1: Create Acquisition Service

```
Create a new service at /lib/blockchain/acquisitionService.ts that:

1. Fetches all Transfer events for a given wallet address from the OTG Game Item contract
2. For each Transfer TO the wallet, retrieves the full transaction to classify the acquisition type
3. Classifies acquisitions as: 'decode', 'marketplace', 'opensea', 'transfer', or 'airdrop'

Classification rules:
- If from address is 0x0 AND interacted contract is OTG Decoder → 'decode' (costGUN = tx.value)
- If from address is 0x0 AND other contract → 'airdrop' (costGUN = 0)
- If interacted contract is OTG Marketplace → 'marketplace' (costGUN = tx.value)
- If tx.value > 0 but different contract → likely 'opensea' (need API match)
- If tx.value = 0 and from is not 0x0 → 'transfer' (costGUN = 0)

Use ethers.js v6 and the existing RPC configuration from /lib/blockchain/avalanche.ts.
Return typed data matching the NFTHoldingAcquisition interface pattern.

Contract addresses should come from environment variables:
- NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE
- OTG_DECODER_ADDRESS (add to .env.example)
- OTG_MARKETPLACE_ADDRESS (add to .env.example)

Include proper error handling and logging.
```

### Prompt 1A.2: Create Acquisition API Endpoint

```
Create a new API route at /app/api/nft/acquisition/[tokenId]/route.ts that:

1. Accepts a tokenId as a path parameter
2. Optionally accepts walletAddress as a query parameter
3. Uses the AcquisitionService to get acquisition data
4. Returns JSON with:
   - tokenId
   - acquisition object (type, costGUN, timestamp, txHash, fromAddress)
   - source ('onchain' | 'cache')
   - reliability ('confirmed' | 'inferred')

Follow the existing API route patterns in /app/api/.
Add caching using the existing nftCache utilities where appropriate.
Handle errors gracefully with proper HTTP status codes.
```

### Prompt 1A.3: Add Contract Addresses to Environment

```
Update the project to support the new contract addresses:

1. Add to .env.example:
   - OTG_DECODER_ADDRESS=
   - OTG_MARKETPLACE_ADDRESS=
   - Add comments explaining each

2. Create /lib/contracts/addresses.ts that exports:
   - A typed object with all contract addresses
   - Validation that required addresses are set
   - Support for mainnet vs testnet via NEXT_PUBLIC_NETWORK

3. Document the contract purposes:
   - OTG Decoder: Used for minting NFTs by decoding hexes in-game
   - OTG Marketplace: In-game marketplace for NFT trades
   - OTG Game Item: The main ERC-721 NFT contract

Reference the CLAUDE.md for contract details.
```

---

## Phase 1B: Historical GUN Price Service

### Prompt 1B.1: Create Price History Service

```
Create a new service at /lib/api/priceHistory.ts that:

1. Fetches historical GUN/USD prices from CoinGecko
2. Implements interpolation to get price at exact timestamps
3. Includes caching to avoid repeated API calls

Functions to implement:
- getGunPriceAtTime(timestamp: Date): Promise<{priceUSD: number, source: string}>
- getGunPriceRange(start: Date, end: Date): Promise<Array<{timestamp: Date, priceUSD: number}>>
- getCurrentGunPrice(): Promise<number> (can use existing CoinGeckoService)

CoinGecko endpoints:
- /api/v3/coins/gunzilla-gun/market_chart?vs_currency=usd&days=365
- /api/v3/coins/gunzilla-gun/market_chart/range?vs_currency=usd&from={unix}&to={unix}

Caching strategy:
- Cache individual price lookups by day (prices don't change retroactively)
- Use localStorage for client-side, consider Redis for server-side
- Cache key format: `gun_price_${YYYY-MM-DD}`

Include rate limiting awareness (CoinGecko free tier limits).
Handle missing data gracefully (interpolate or use nearest available).
```

### Prompt 1B.2: Create Price History API Endpoint

```
Create a new API route at /app/api/price/gun/history/route.ts that:

1. Accepts query parameters:
   - timestamp: ISO string (required)
   - OR startDate + endDate: ISO strings (for range)
   
2. Returns JSON:
   For single timestamp:
   {
     timestamp: string,
     priceUSD: number,
     source: 'coingecko' | 'cache' | 'interpolated'
   }
   
   For range:
   {
     startDate: string,
     endDate: string,
     prices: Array<{timestamp: string, priceUSD: number}>
   }

3. Implement caching headers for CDN/browser caching
4. Handle errors (invalid dates, API failures)

Follow existing API patterns in /app/api/price/gun/route.ts.
```

---

## Phase 1C: OpenSea Integration

### Prompt 1C.1: Enhance OpenSea Service for Sales Events

```
Enhance the existing OpenSeaService at /lib/api/opensea.ts to add:

1. New method: getEventsByNFT(contractAddress, tokenId, eventTypes?)
   - Calls: GET /api/v2/events/chain/{chain}/contract/{address}/nfts/{identifier}
   - Returns sale, transfer, listing events
   - Handle pagination with 'next' cursor

2. New method: getEventsByCollection(collectionSlug, eventTypes?, after?)
   - Calls: GET /api/v2/events/collection/{collection_slug}
   - Filter by event_type (sale, listing, offer)
   - Support date filtering with 'after' parameter

3. New method: getCollectionStats(collectionSlug)
   - Calls: GET /api/v2/collections/{collection_slug}/stats
   - Returns floor price, volume, etc.

4. New method: getActiveListings(collectionSlug, limit?)
   - Calls: GET /api/v2/listings/collection/{collection_slug}
   - Returns current listings

OpenSea API v2 headers required:
- 'X-API-KEY': process.env.OPENSEA_API_KEY
- 'Accept': 'application/json'

Collection slug for Off The Grid: 'off-the-grid'
Chain identifier: Need to verify - try 'gunz' or the chain ID

Add TypeScript interfaces for all response types.
Handle rate limiting (add delay between requests if needed).
```

### Prompt 1C.2: Create Valuation Service

```
Create a new service at /lib/nft/valuationService.ts that:

1. Combines OpenSea data with on-chain data to estimate NFT value

2. Implements findComparableSales(nft: NFT):
   - Get recent sales of same item name + rarity from OpenSea
   - Filter to last 30 days
   - Return array of comparable sales with prices

3. Implements estimateValue(nft: NFT):
   Returns NFTValuation object with:
   - floorPriceGUN (from collection stats)
   - lastComparableSaleGUN (most recent comparable)
   - comparableSalesCount
   - estimatedValueLowGUN / estimatedValueHighGUN (min/max of comparables)
   - valuationReliable (true if 3+ comparables)
   - valuationConfidence ('high' | 'medium' | 'low' | 'none')

4. Handles edge cases:
   - No comparable sales → use floor price with low confidence
   - NFT currently listed → include listing price
   - Very rare items → may have no comparables

Use the NFT type from /lib/types and match rarity from traits.
```

### Prompt 1C.3: Create Valuation API Endpoint

```
Create a new API route at /app/api/nft/valuation/[tokenId]/route.ts that:

1. Accepts tokenId as path parameter
2. Optionally accepts name and rarity query params (for comparable lookup)

3. Returns JSON:
{
  tokenId: string,
  valuation: {
    floorPriceGUN: number | null,
    floorPriceUSD: number | null,
    lastComparableSaleGUN: number | null,
    lastComparableSaleDate: string | null,
    comparableSalesCount: number,
    estimatedValueLowGUN: number | null,
    estimatedValueHighGUN: number | null,
    confidence: 'high' | 'medium' | 'low' | 'none'
  },
  currentListingGUN: number | null,
  lastUpdated: string
}

4. Implements caching (valuations change, so shorter TTL ~5 min)
5. Converts GUN to USD using current price
```

---

## Phase 1D: P&L Calculation

### Prompt 1D.1: Create P&L Service

```
Create a new service at /lib/portfolio/pnlService.ts that:

1. Combines acquisition data + valuation data + current prices to calculate P&L

2. Implements calculateNFTPnL(tokenId, walletAddress):
   - Fetch acquisition data (cost basis)
   - Fetch current GUN price
   - Fetch valuation (market value)
   - Calculate all P&L metrics

3. Returns NFTPnL object:
{
  // Cost basis
  costBasisGUN: number,
  costBasisUSD: number,           // USD at acquisition time
  gunPriceAtAcquisition: number,
  
  // Current value (same GUN at today's price)
  currentGunPrice: number,
  costBasisAtTodayPrice: number,  // costBasisGUN × currentGunPrice
  
  // Unrealized P&L (GUN appreciation)
  unrealizedGainUSD: number,
  unrealizedGainPercent: number,
  
  // Market P&L (if sold at estimated value)
  estimatedSaleGUN: number | null,
  estimatedSaleUSD: number | null,
  potentialGainUSD: number | null,
  potentialGainPercent: number | null,
  
  // Status
  status: 'held' | 'sold' | 'burned',
  acquisitionType: string,
  valuationConfidence: string
}

4. Handle edge cases:
   - Transfer with no cost → P&L shows as "Gift" or N/A
   - No valuation data → only show GUN appreciation P&L
   - Sold NFT → show realized P&L (future feature)
```

### Prompt 1D.2: Create Portfolio P&L Endpoint

```
Create a new API route at /app/api/portfolio/[walletAddress]/pnl/route.ts that:

1. Accepts walletAddress as path parameter
2. Returns portfolio-wide P&L summary + per-NFT breakdown

Response format:
{
  wallet: string,
  summary: {
    totalNFTs: number,
    nftsWithCostBasis: number,
    nftsWithoutCostBasis: number,
    
    totalCostBasisGUN: number,
    totalCostBasisUSD: number,
    totalCurrentValueUSD: number,
    totalUnrealizedGainUSD: number,
    totalUnrealizedGainPercent: number,
    
    totalEstimatedMarketValueUSD: number | null,
    totalPotentialGainUSD: number | null,
    
    valuationReliability: {
      high: number,    // count of NFTs with high confidence
      medium: number,
      low: number,
      none: number
    }
  },
  nfts: Array<{
    tokenId: string,
    name: string,
    image: string,
    rarity: string,
    pnl: NFTPnL
  }>
}

3. Sort NFTs by potential gain (highest first) or allow sort param
4. Support pagination for large portfolios
5. Cache results with short TTL (~1 min)
```

### Prompt 1D.3: Update NFTDetailModal with P&L Data

```
Update /components/NFTDetailModal.tsx to integrate the new P&L service:

1. Add a new fetch for P&L data when modal opens:
   - Call /api/nft/acquisition/[tokenId] 
   - Call /api/nft/valuation/[tokenId]
   - Calculate P&L client-side OR call a combined endpoint

2. Update the "YOUR POSITION" section to show:
   - Current Value: $XX.XX (costBasisGUN × currentPrice)
   - Cost Basis: XX.XX GUN ($YY.YY at acquisition)
   - Unrealized (GUN): +$ZZ.ZZ (+XX.X%)
   - Market Value: ~$AA.AA (if valuation available)
   - Potential Gain: +$BB.BB (+XX.X%) (if valuation available)

3. Update the Acquisition card to show:
   - Source (with existing venue logic)
   - Acquired date
   - Cost in GUN and USD at time
   - Transaction link

4. Add "MARKET SIGNALS" section:
   - Floor Price: XX GUN ($YY.YY)
   - Last Comparable Sale: XX GUN (date)
   - Confidence: High/Medium/Low/No data

5. Handle loading states and errors gracefully
6. Match existing UI patterns and colors from CLAUDE.md

Keep the existing scoring/resolution logic for acquisition data.
The new P&L should complement, not replace, existing functionality.
```

---

## Phase 1E: Testing & Polish

### Prompt 1E.1: Add Comprehensive Error Handling

```
Review and enhance error handling across the NFT pricing pipeline:

1. /lib/blockchain/acquisitionService.ts:
   - Handle RPC connection failures
   - Handle malformed transaction data
   - Add retry logic with exponential backoff
   - Log errors with context (tokenId, txHash, etc.)

2. /lib/api/priceHistory.ts:
   - Handle CoinGecko rate limits (429 errors)
   - Handle missing price data (interpolate or estimate)
   - Fallback to cached data if API fails

3. /lib/api/opensea.ts:
   - Handle rate limits
   - Handle 404 (NFT not found on OpenSea)
   - Handle chain not supported errors

4. All API routes:
   - Return appropriate HTTP status codes
   - Return structured error responses: { error: string, code: string, details?: any }
   - Log errors server-side with request context

5. Client components:
   - Show user-friendly error messages
   - Allow retry actions
   - Degrade gracefully (show partial data if available)

Add error boundary components where appropriate.
```

### Prompt 1E.2: Performance Optimization

```
Optimize the NFT pricing pipeline for performance:

1. Batch RPC calls:
   - Use multicall for fetching multiple transactions
   - Batch eth_getLogs queries by block range

2. Caching strategy:
   - Acquisition data: Cache indefinitely (immutable)
   - Historical prices: Cache indefinitely per day
   - Valuations: Cache 5 minutes
   - Current price: Cache 30 seconds

3. Parallel fetching:
   - Fetch acquisition + valuation in parallel
   - Use Promise.all for independent requests

4. Lazy loading:
   - Don't fetch P&L until NFT detail modal opens
   - Paginate portfolio P&L endpoint

5. Database considerations (future):
   - Index acquisition data by tokenId + wallet
   - Store historical price lookups
   - Consider PostgreSQL or Redis

Add performance logging to identify bottlenecks.
Measure and document expected response times.
```

### Prompt 1E.3: Create Debug/Admin Panel

```
Create a debug panel component for testing the pricing pipeline:

1. Create /components/PricingDebugPanel.tsx:
   - Input field for tokenId
   - Input field for wallet address
   - Buttons to test each endpoint individually
   - Display raw API responses

2. Show:
   - Acquisition data (type, cost, tx hash)
   - Historical price lookup result
   - Valuation data (floor, comparables)
   - Calculated P&L

3. Add timing information:
   - How long each API call took
   - Cache hit/miss status

4. Add to existing DebugPanel or create separate route /debug/pricing

5. Only show in development or for admin users

This will help verify the pipeline is working correctly
before integrating into the main UI.
```

---

## Utility Prompts

### Check OpenSea Chain Identifier

```
I need to determine the correct chain identifier for GunzChain on OpenSea API v2.

GunzChain details:
- Chain ID: 43419
- RPC: https://rpc.gunzchain.io/...
- It's an Avalanche subnet (EVM compatible)

Please:
1. Search the OpenSea documentation for supported chains
2. Check if 'gunz' or 'gunzchain' or '43419' works as chain identifier
3. Test the API endpoint if possible:
   GET https://api.opensea.io/api/v2/chain/gunz/contract/{address}/nfts/{id}

If GunzChain isn't directly supported, we may need to:
- Use a different chain identifier
- Contact OpenSea for chain support
- Work around via collection-based endpoints only
```

### Extract Contract ABIs

```
I need to extract the contract ABIs for GUNZscope's blockchain interactions.

Please help me:

1. Navigate to GunzScan (https://gunzscan.io)
2. Find these contracts (search by name or look up from transactions):
   - OTG Game Item (NFT contract)
   - OTG Decoder (mint/decode contract)
   - OTG Marketplace (in-game market)

3. For each contract:
   - Get the verified ABI if available
   - Extract relevant events and functions
   - Note the contract address

4. Create /lib/contracts/abis.ts with:
   - TypeScript-typed ABI exports
   - Event signatures for parsing logs
   - Function selectors for tx classification

Focus on:
- Transfer event (ERC-721 standard)
- decode() function signature
- createAtomicSale() function signature
- Any relevant events from Marketplace
```

---

## Notes for Claude Code

When using these prompts:

1. **Read CLAUDE.md first** - It contains project context, types, and patterns
2. **Check existing code** - Many patterns already exist in similar services
3. **Use existing types** - Don't recreate NFT, WalletData, etc.
4. **Follow naming conventions** - camelCase functions, PascalCase types
5. **Add JSDoc comments** - Document public functions
6. **Test incrementally** - Create debug endpoints to verify each step

Environment variables needed:
```
OPENSEA_API_KEY=
COINGECKO_API_KEY=
OTG_DECODER_ADDRESS=
OTG_MARKETPLACE_ADDRESS=
NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE=
```
