# GUNZscope AI Agent Instructions

**Project**: GUNZscope — Multi-chain portfolio tracker for GUNZILLA gaming ecosystem  
**Framework**: Next.js 16.1 + TypeScript 5 + Tailwind CSS 4  
**Database**: SQLite (Prisma ORM)  
**Live**: [GUNZscope.xyz](https://gunzscope.xyz)

---

## Architecture Overview

### Core Service Boundaries

GUNZscope layers data collection from multiple blockchains (GunzChain, Solana, Avalanche) and third-party APIs into a unified portfolio view:

1. **Wallet Connection** (`/lib/auth/`)
   - Dynamic Labs SDK wraps 300+ wallet providers (MetaMask, Phantom, Coinbase, WalletConnect, etc.)
   - Multi-chain support: EVM (GunzChain) + Solana
   - Never import `@dynamic-labs/*` directly in components — use auth wrappers

2. **Blockchain Layer** (`/lib/blockchain/`)
   - `avalanche.ts` — GunzChain RPC queries (token balances, NFT transfer events, mint details)
   - `solana.ts` — Solana Web3.js integration (SPL tokens, NFT metadata)
   - **Important**: RPC transfer event queries scan 13M+ blocks, timeout is 30-45s

3. **External APIs** (`/lib/api/`)
   - `coingecko.ts` — Token price feeds (GUN, USD, AVAX)
   - `opensea.ts` — NFT metadata and floor prices (OpenSea data)
   - `marketplace.ts` — In-game marketplace price history
   - `listingService.ts` — Active listings aggregation

4. **API Routes** (`/app/api/*/route.ts`)
   - Server-side wrappers for external APIs (avoid CORS, protect secret keys)
   - Examples: `/api/opensea/orders`, `/api/opensea/sales`, `/api/coingecko/prices`
   - Pattern: Accept browser requests → call external API server-side → return typed JSON

5. **Portfolio Calculations** (`/lib/portfolio/`)
   - Aggregate token balances across chains
   - Calculate P&L with confidence scoring (`nftUsdReliable` flag)
   - Use `invariants.ok` to validate calculation integrity

6. **Database** (Prisma + SQLite)
   - User profiles linked to Dynamic auth (`dynamicUserId`)
   - Wallet connections (address + chain per user)
   - Favorites and tracked addresses for progressive features
   - No sensitive data — blockchain address tracking only

---

## Critical Data Flows

### NFT Acquisition Enrichment (Most Complex)

When user navigates to an NFT detail modal, the system enriches purchase history asynchronously:

```
Browser → RPC (transfer events, 45s timeout) 
  ↓
Venue classification (decode, OpenSea, in-game marketplace, transfer, etc.)
  ↓
For OpenSea purchases: /api/opensea/sales → get GUN price at purchase time
  ↓
Cache in localStorage via buildTokenKey(contract, tokenId)
  ↓
Subsequent loads from cache (instant)
```

**Scoring system** determines best acquisition data:
- `PURCHASE` type: +100 pts | Has `costGun > 0`: +90 pts | Has `acquiredAt`: +60 pts
- Decode venue: +70 pts | `TRANSFER` with no cost: -80 pts

### Price Enrichment Pipeline

```
CoinGecko API → /lib/api/coingecko.ts → cache in-memory
    ↓
Components subscribe to price updates
    ↓
Re-calculate portfolio when prices change
```

### NFT Grouping

Duplicate NFTs (same contract + metadata) are grouped automatically:
- Display as single gallery item with `quantity`
- `tokenIds` array stores all IDs
- `mintNumbers` array stores all mint numbers
- See [NFT_GROUPING.md](../docs/NFT_GROUPING.md) for deduplication rules

---

## Supported Networks

| Network | Chain ID | RPC Endpoint | Explorer | Currency |
|---------|----------|--------------|----------|----------|
| **GunzChain Mainnet** | 43419 (0xA99B) | https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc | https://gunzscan.io | GUN |
| **GunzChain Testnet** | 49321 (0xC099) | https://rpc.gunzchain.io/ext/bc/6oHyPp9BxGDPfFZf2n6LgBsP8ugRw3VwUkGaY96K72b2kzT9w/rpc | https://testnet.explorer.gunzchain.io | GUN |
| **Solana** | N/A | RPC determined by wallet | https://solscan.io | SOL |

**Default**: Always use GunzChain **Mainnet** Chain ID 43419 (not testnet).

---

## Code Conventions & Patterns

### TypeScript
- **Strict mode enabled** — use explicit types everywhere
- Check `/lib/types.ts` FIRST before creating new interfaces
- Props interfaces: `{ComponentName}Props`, default export components
- Use discriminated unions for state (e.g., `FetchStatus`)
- Explicit return types on all functions

### React Components
- `'use client'` directive for interactive components
- Memoize expensive computations: `useMemo` for derived state, `useCallback` for handlers
- Never import Dynamic Labs SDK directly — use `/lib/auth/` wrappers
- Always handle loading + error states for async data

### Styling (Tailwind CSS 4)
```typescript
// Brand colors
Primary cyan: #64ffff    // Main CTAs, highlights
Secondary purple: #96aaff // Secondary actions
Success green: #beffd2   // Positive states
Dark BG: #181818 / #0d0d0d

// Component patterns
Cards: 'glass-effect' or 'bg-[#181818] border border-{color}/20 p-6'
Hover: 'hover:border-{color}/40 transition-all'
Labels: 'text-xs uppercase tracking-wider text-gray-400'
Values: 'text-4xl font-bold text-{color}'
```

### API Routes Pattern

All external API calls must go through server-side `/app/api/*/route.ts` routes:

```typescript
// ✅ CORRECT: Server route wraps external API
// /app/api/opensea/orders/route.ts
const response = await fetch(`${OPENSEA_API_BASE}/...`, {
  headers: { 'X-API-Key': process.env.OPENSEA_API_KEY }
});

// ❌ WRONG: Never call external APIs directly from browser
// Components should never do: fetch('https://api.opensea.io/...')
```

**Why**: Prevents CORS errors, protects API keys, enables response caching.

### NFT Type System

```typescript
export interface NFT {
  tokenId: string;              // Primary token ID
  tokenIds?: string[];          // All IDs if grouped
  name: string;
  image: string;
  contractAddress?: string;     // Required for most operations
  chain: 'avalanche' | 'solana';
  purchasePriceGun?: number;    // Always null-check
  floorPrice?: number;          // Always null-check
  quantity?: number;            // Length of tokenIds
  nftUsdReliable?: boolean;     // Confidence flag for calculations
  // ... see /lib/types.ts for full definition
}

// Common null-checks
if (!nft.floorPrice || nft.floorPrice === 0) {
  // Handle missing price
}
if (!nft.metadata) {
  // Handle missing metadata
}
```

---

## Developer Workflows

### Before Starting Any Task
1. Read `/docs/notes/` — task-specific context and gotchas
2. Check relevant doc: `NFT_PIPELINE.md`, `NFT_FEATURE.md`, `WALLET_CLASSIFICATION.md`, etc.
3. Determine affected areas: What files change? What can break?

### Build & Deploy
```bash
npm run dev           # Start dev server
npm run build         # Typecheck + build (ALWAYS before committing)
npm run lint          # Lint all files
npm test              # Run Vitest
npm run test:watch   # Watch mode
```

**Critical**: Always run `npm run build` before committing — catches TypeScript errors early.

### Testing
- Framework: Vitest + React Testing Library
- Config: `vitest.config.ts` with jsdom environment
- Location: `**/__tests__/*.test.tsx` or `**/*.test.tsx`
- Example: [components/__tests__/NFTDetailModal.async.test.tsx](../components/__tests__/NFTDetailModal.async.test.tsx)

### Debugging Common Issues

**"RPC query timed out"**
- Transfer event queries scan 13M+ blocks
- Timeout: 30-45 seconds is expected behavior
- Check `lib/blockchain/avalanche.ts` `enrichSingleNFT()` function

**"OpenSea floor price is null"**
- Collections may have no active listings
- Verify collection exists on OpenSea and has trading history
- Check `/api/opensea/orders` response

**"NFT metadata missing description"**
- Some metadata sources incomplete (tokenURI, gunzscan, cache)
- Check `NFTMetadataDebug` for resolution status
- May require fallback descriptions

**"Portfolio value unreliable"**
- Check `nftUsdReliable` flag before displaying as definitive value
- If false, show with confidence indicator
- Run portfolio calculations with `invariants.ok` validation

---

## Project-Specific Rules

### Never Do
- ❌ Remove working features when adding new ones — verify before AND after
- ❌ Assume `floorPrice`, `purchasePriceGun`, or `metadata` is available — always null-check
- ❌ Duplicate TypeScript interfaces — check `/lib/types` first
- ❌ Add `console.log` to production code
- ❌ Import `@dynamic-labs/*` directly in components
- ❌ Call external APIs from browser — use `/app/api/*` routes
- ❌ Use `any` type — check existing interfaces first
- ❌ Hardcode contract addresses or chain IDs — use environment variables
- ❌ Push without running `npm run build`

### Always Do
- ✅ Check `/docs/notes/` for context before starting
- ✅ Add loading states and error handling for async data
- ✅ Preserve existing functionality — test before and after changes
- ✅ Use GunzChain mainnet (Chain ID 43419), not testnet
- ✅ Use RPC timeout of 30-45s for transfer event queries (slow, normal)
- ✅ Update `/docs/notes/` after completing PR with gotchas
- ✅ Test NFTDetailModal with both grouped and ungrouped NFTs
- ✅ Verify portfolio calculations with known wallet addresses

---

## Useful Reference Files

| File | Purpose |
|------|---------|
| [CLAUDE.md](../CLAUDE.md) | Full project guidelines, contracts, rarity scoring, learned rules |
| [NFT_PIPELINE.md](../docs/NFT_PIPELINE.md) | NFT acquisition enrichment flow, debugging acquisition data |
| [NFT_FEATURE.md](../docs/NFT_FEATURE.md) | NFT detail modal implementation, metadata handling |
| [NFT_GROUPING.md](../docs/NFT_GROUPING.md) | Deduplication rules, quantity display, mint numbers |
| [WALLET_CLASSIFICATION.md](../docs/WALLET_CLASSIFICATION.md) | In-game vs external wallet detection |
| [NETWORK_DETECTION.md](../docs/NETWORK_DETECTION.md) | Chain/network detection implementation |
| [PERFORMANCE_OPTIMIZATION.md](../docs/PERFORMANCE_OPTIMIZATION.md) | Caching, lazy loading, bundle optimization |
| [DYNAMIC_SETUP.md](../docs/DYNAMIC_SETUP.md) | Dynamic Labs wallet integration |
| [DEPLOYMENT.md](../docs/DEPLOYMENT.md) | Vercel deployment checklist |

---

## Workflow Recommendations

### For Complex Tasks
1. **Read CLAUDE.md thoroughly** — understand architecture and learned lessons
2. **Check `/docs/notes/`** — find related task context
3. **Propose plan before implementing** — describe changes, file impacts, verification steps
4. **Implement incrementally** — test each major change
5. **Update `/docs/notes/`** after PR — document gotchas and decisions

### For Bug Fixes
1. Identify affected data flow (NFT enrichment, prices, wallets, calculations?)
2. Check if similar issues documented in `/docs/notes/`
3. Add null-checks and error boundaries where needed
4. Verify fix with multiple test wallets (mainnet + testnet if applicable)
5. Run `npm run build && npm test` before committing

### For New Features
1. Check CLAUDE.md "Never Do" section — avoid past mistakes
2. Determine: server-side (API route)? Client component? Database? All three?
3. Define data types in `/lib/types` — no ad-hoc interfaces
4. Implement in isolated branch, test thoroughly
5. Update documentation when adding new API routes or patterns

---

## Quick Command Reference

```bash
# Development
npm run dev                 # Start dev server (localhost:3000)
npm run build              # Typecheck + build
npm run lint               # Run ESLint

# Testing
npm test                   # Run Vitest once
npm run test:watch        # Watch mode for TDD

# Database
npx prisma studio        # Open Prisma Studio (SQLite UI)
npx prisma generate      # Generate Prisma Client

# Deployment
npm run build             # Build for production
npm start                 # Start production server
```

---

## Example Patterns

### Adding a New API Route
```typescript
// /app/api/newfeature/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const data = await fetchExternalData();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch' },
      { status: 500 }
    );
  }
}
```

### NFT Null-Check Pattern
```typescript
const displayPrice = nft.floorPrice && nft.floorPrice > 0 
  ? formatUsd(nft.floorPrice)
  : 'Price unavailable';
```

### Component Loading State
```typescript
'use client';
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  loadData()
    .then(data => setData(data))
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
}, []);

if (loading) return <LoadingSpinner />;
if (error) return <ErrorMessage message={error} />;
return <DataDisplay data={data} />;
```

---

**Last Updated**: February 2, 2026  
**Maintained by**: GUNZscope Development Team
