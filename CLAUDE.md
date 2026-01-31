# CLAUDE.md - GUNZscope Project Guidelines

## Project Overview
GUNZscope is a multi-chain portfolio tracker for the GUNZILLA gaming ecosystem (Off The Grid).
**Live at**: GUNZscope.xyz

## Tech Stack
- **Framework**: Next.js 16.1.3 with App Router
- **Language**: TypeScript 5 (strict)
- **Styling**: Tailwind CSS 4
- **Blockchain**: 
  - Ethers.js v6 (GunzChain - EVM compatible)
  - Solana Web3.js (Solana)
  - Viem (Wallet interactions)
- **Wallet**: Dynamic Labs SDK (300+ wallets)
- **APIs**: CoinGecko (prices), OpenSea (NFT data), GunzChain RPC

## Project Structure
```
/app                    # Next.js App Router
  /api                  # Backend API routes (route.ts files)
    /favorites          # User favorites
    /marketplace        # Marketplace data
    /me                 # User profile
    /opensea            # OpenSea proxy
    /price/gun          # GUN price endpoint
    /settings           # User settings
    /tracked-addresses  # Multi-wallet tracking
  /components           # React components
/lib                    # Shared utilities and business logic
  /api                  # External API services (OpenSea, CoinGecko, Marketplace)
  /blockchain           # Chain-specific code (avalanche.ts, solana.ts)
  /nft                  # NFT-specific helpers and utilities
  /portfolio            # Portfolio calculation logic
  /types                # TypeScript interfaces
  /utils                # General helper functions
/docs                   # Project documentation
/prisma                 # Database schema
/public                 # Static assets
/scripts                # Build/utility scripts
```

## Code Conventions

### TypeScript
- Always define interfaces for props and data structures
- Use existing types from `/lib/types` (NFT, WalletData, etc.)
- Prefer explicit return types on functions
- Use discriminated unions for state (e.g., `FetchStatus`)

### React Components
- Use `'use client'` directive for client components
- Props interfaces named `{ComponentName}Props`
- Default exports for components
- Memoize expensive computations with `useMemo`
- Use `useCallback` for event handlers passed to children

### Styling (Tailwind)
Brand colors:
- Cyan: `#64ffff` - Primary accent, interactive elements
- Purple: `#96aaff` - Secondary accent, NFT counts
- Green: `#beffd2` - Success states, prices
- Dark BG: `#181818` / `#0d0d0d` - Card backgrounds

Patterns:
- Cards: `glass-effect` class or `bg-[#181818] border border-{color}/20`
- Hover: `hover:border-{color}/40 transition-all`
- Labels: `text-xs uppercase tracking-wider text-gray-400`
- Values: `text-4xl font-bold text-{color}`
- Consistent padding: `p-6` cards, `p-8` sections

### API Routes
- Located in `/app/api/{resource}/route.ts`
- Use Next.js Route Handlers pattern
- Always handle errors gracefully
- Return typed JSON responses

## Supported Networks

### GunzChain Mainnet
- Chain ID: 43419 (0xA99B)
- RPC: `https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc`
- Currency: GUN
- Explorer: `https://gunzscan.io`

### GunzChain Testnet
- Chain ID: 49321 (0xC099)
- RPC: `https://rpc.gunzchain.io/ext/bc/6oHyPp9BxGDPfFZf2n6LgBsP8ugRw3VwUkGaY96K72b2kzT9w/rpc`
- Explorer: `https://testnet.explorer.gunzchain.io`

### Solana
- GUN Token: `3jUf2RTyXp867piSB2dt8uUcNiLDW58asjGtXkRAkBbe`
- NFT Bridge: Coming soon via LayerZero

## Key Contracts (GunzChain)

| Contract | Purpose | Key Methods |
|----------|---------|-------------|
| OTG Decoder | Mint via hex decode | `decode()` - emits Transfer from 0x0 |
| OTG Marketplace | In-game sales | `createAtomicSale()` - value = price in GUN |
| OTG Game Item | NFT contract | Standard ERC-721 Transfer events |
| Validator License | Hacker licenses | Separate tracking |

## Key Interfaces

```typescript
// Core NFT type (from /lib/types)
interface NFT {
  tokenId: string;
  name: string;
  collection: string;
  chain: string;
  image?: string;
  traits?: Record<string, string>;
  mintNumber?: string;
  mintNumbers?: string[];
  quantity?: number;
  floorPrice?: number;
  purchasePriceGun?: number;
  purchasePriceUsd?: number;
  purchaseDate?: Date;
}

// Acquisition tracking (from NFTDetailModal)
type AcquisitionVenue = 
  | 'decode'           // In-game hex decode (mint)
  | 'opensea'          // OpenSea purchase
  | 'otg_marketplace'  // In-game marketplace
  | 'transfer'         // Wallet transfer (gift/self)
  | 'mint'             // Legacy mint
  | 'decoder'          // Legacy decoder
  | 'unknown';

type AcquisitionType = 'MINT' | 'TRANSFER' | 'PURCHASE' | 'UNKNOWN';

// Holding acquisition data (from blockchain/avalanche.ts)
interface NFTHoldingAcquisition {
  owned: boolean;
  isMint: boolean;
  venue?: AcquisitionVenue;
  costGun?: number;
  acquiredAtIso?: string;
  txHash?: string;
  fromAddress?: string;
}

// Portfolio calculation result
interface PortfolioCalcResult {
  totalUsd: number;
  tokensUsd: number;
  nftsUsd: number;
  nftUsdReliable: boolean;
  totalGunBalance: number;
  avalancheGunBalance: number;
  solanaGunBalance: number;
  nftCount: number;
  nftsWithPrice: number;
  nftsWithoutPrice: number;
  breakdown: BreakdownItem[];
  invariants: { ok: boolean; warnings: string[]; sumSectionsUsd: number; pctSum: number; toleranceUsd: number };
}
```

## NFT Rarity System

```typescript
const RARITY_ORDER = {
  'Mythic': 1,      // #ff44ff (magenta)
  'Legendary': 2,   // #ff8800 (orange)
  'Epic': 3,        // #cc44ff (purple)
  'Rare': 4,        // #4488ff (blue)
  'Uncommon': 5,    // #44ff44 (green)
  'Common': 6,      // #888888 (gray)
};
```

## Important Patterns

### Acquisition Quality Scoring
The NFTDetailModal uses a scoring system to determine best acquisition data:
- `PURCHASE` type: +100 points
- Has `costGun > 0`: +90 points
- Has `acquiredAt`: +60 points
- Decode venue: +70 points
- `TRANSFER` with no cost: -80 points

### NFT Caching
- Use `buildTokenKey(contractAddress, tokenId)` for cache keys
- Cache acquisition data in localStorage for faster loads
- Use `getCachedNFTDetail` / `setCachedNFTDetail` from `/lib/utils/nftCache`

### Portfolio Calculations
- Always check `nftUsdReliable` before displaying NFT values as definitive
- Use `invariants.ok` to validate calculation integrity
- Format USD with `formatUsd()`, percentages with `formatPct()` from `/lib/portfolio/calcPortfolio`

---

# NFT PRICING PIPELINE (Phase 1)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NFT PRICE SOURCES                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ON-CHAIN (GunzChain RPC)                                              │
│  ├── decode txns (OTG Decoder)     → decode fee (cost basis)           │
│  ├── createAtomicSale (Marketplace)→ sale price in GUN ✓               │
│  └── Transfer events               → track ownership changes           │
│                                                                         │
│  OPENSEA API (v2)                                                       │
│  ├── /events/chain/.../nfts/{id}   → sale history per NFT              │
│  ├── /events/collection/{slug}     → collection-wide sales             │
│  ├── /collections/{slug}/stats     → floor price                       │
│  └── /listings/collection/{slug}   → active listings                   │
│                                                                         │
│  COINGECKO API                                                          │
│  └── /simple/price + /market_chart → GUN/USD current + historical      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Transaction Types to Track

| Method | Contract | What It Means | Price Data |
|--------|----------|---------------|------------|
| `decode` | OTG Decoder | Mint from hex | tx.value = decode fee |
| `createAtomicSale` | OTG Marketplace | In-game sale | tx.value = sale price |
| `Transfer` | OTG Game Item | Ownership change | Check if part of sale |
| `0xdc8e92ea` | OTG Game Item | Batch burn | No price |
| `coin_transfer` | Native | GUN transfer | No NFT involved |

## Data Model

```typescript
// ============================================
// ACQUISITION TRACKING
// ============================================
interface NFTAcquisition {
  tokenId: string;
  
  // How was it acquired?
  source: 'decode' | 'marketplace' | 'opensea' | 'opensea-offer' | 'transfer' | 'airdrop' | 'bridge-in' | 'unknown';
  
  // Transaction details
  txHash: string;
  blockNumber: number;
  timestamp: Date;
  
  // Cost basis (what current owner paid)
  costGUN: number;              // 0 for transfers/airdrops
  costWGUN: number;             // For OpenSea offers (escrow)
  gunPriceUSDAtTime: number;    // GUN/USD rate at acquisition
  costUSD: number;              // Total USD value at acquisition
  
  // Transfer details
  fromAddress?: string;
  sellerAddress?: string;
  
  // Data quality
  priceSource: 'onchain' | 'opensea-api' | 'inferred' | 'none';
  priceReliable: boolean;
}

// ============================================
// VALUATION (Current Market Value)
// ============================================
interface NFTValuation {
  tokenId: string;
  
  // Floor price (collection-wide)
  floorPriceGUN: number | null;
  floorPriceUSD: number | null;
  floorPriceSource: 'opensea' | 'none';
  
  // Comparable sales
  lastComparableSaleGUN: number | null;
  lastComparableSaleDate: Date | null;
  comparableSalesCount: number;
  
  // Current listing
  currentListingGUN: number | null;
  currentListingSource: 'opensea' | 'marketplace' | null;
  
  // Estimated range
  estimatedValueLowGUN: number | null;
  estimatedValueHighGUN: number | null;
  
  // Reliability
  valuationReliable: boolean;
  valuationConfidence: 'high' | 'medium' | 'low' | 'none';
  lastUpdated: Date;
}

// ============================================
// P&L CALCULATION
// ============================================
interface NFTPnL {
  // Baseline P&L (same GUN amount, today's price)
  costBasisGUN: number;
  costBasisUSD: number;                 // USD at acquisition
  costBasisAtTodayPrice: number;        // costBasisGUN × currentGUNPrice
  unrealizedGainUSD: number;            // costBasisAtTodayPrice - costBasisUSD
  unrealizedGainPercent: number;
  
  // Market P&L (if sold at estimated value)
  estimatedSaleValueUSD: number | null;
  potentialGainUSD: number | null;
  potentialGainPercent: number | null;
  
  // Status
  status: 'held' | 'sold' | 'burned' | 'bridged';
}
```

## OpenSea API Reference

Collection slug: `off-the-grid`
Chain identifier: TBD (likely `gunz` or chain ID `43419`)

```typescript
// Get events for specific NFT
GET /api/v2/events/chain/{chain}/contract/{address}/nfts/{identifier}

// Get collection stats (floor price)
GET /api/v2/collections/{collection_slug}/stats

// Get events by wallet
GET /api/v2/events/accounts/{address}

// Get active listings
GET /api/v2/listings/collection/{collection_slug}
```

## Historical GUN Price

For accurate P&L, we need GUN/USD at time of acquisition:
1. Check if we have cached historical price
2. Query CoinGecko `/coins/gunzilla-gun/market_chart`
3. Interpolate to exact timestamp
4. Cache result for future lookups

---

# FUTURE: Bridge Support (Phase 2+)

## LayerZero NFT Bridge (Coming Soon)

When the bridge at `bridge.gunzchain.io` launches for NFTs:

```typescript
type AcquisitionSource = 
  // ... existing sources ...
  | 'bridge-in'    // Bridged FROM Solana TO GunzChain
  | 'bridge-out';  // Bridged FROM GunzChain TO Solana

interface CrossChainNFT {
  tokenId: string;
  currentChain: 'gunzchain' | 'solana';
  provenance: ProvenanceEvent[];  // Full history across chains
  costBasis: {
    totalGUN: number;     // All GUN spent (decode + purchases + bridge fees)
    totalUSD: number;
    breakdown: CostEvent[];
  };
}
```

Bridge events to track:
- `PacketSent` on source chain (lock)
- `PacketReceived` on destination chain (mint wrapped)
- LayerZero message IDs for linking

---

## Documentation References

See `/docs` folder:
- `Deployment Guide` - Production deployment
- `Dynamic Wallet Setup` - Wallet connection setup
- `NFT Feature` - NFT functionality
- `NFT Grouping` - Deduplication logic
- `Performance Optimization` - Tuning guide
- `Setup Guide` - Initial setup
- `Wallet Classification` - In-game vs external detection
