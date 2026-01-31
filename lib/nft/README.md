# NFT Detail Helpers

This module contains pure helper functions for NFT detail display, market reference computation, and position tracking.

## Architecture

```
lib/nft/
├── types.ts              # Shared types (FetchStatus, DataQualityLevel, etc.)
├── nftDetailHelpers.ts   # Pure helper functions
├── README.md             # This file
└── __tests__/
    └── nftDetailHelpers.test.ts
```

## Key Concepts

### Cost Basis (`costBasisGun`)

The canonical cost basis source is computed via `normalizeCostBasis()`.

**Rules:**
- Returns `null` for: `null`, `undefined`, `NaN`, `Infinity`, `<=0`, `-0`
- Returns the input value unchanged for positive finite numbers
- Always use this function when validating cost basis values
- Never compute cost basis directly; always pass through `normalizeCostBasis()`

```typescript
const costBasis = normalizeCostBasis(rawValue); // null | number
```

### Market Reference (`computeMarketInputs`)

Single source of truth for market reference values used by hero display and position labels.

**Fallback Order:**
1. `listings.average` (if present and finite)
2. Midpoint of low/high (if both bounds exist)
3. `low` (if only low exists)
4. `high` (if only high exists)
5. `null`

**Data Quality Criteria:**
- Only computed when both bounds exist and `low > 0`
- Based on spread ratio: `(high - low) / low`
  - `strong`: spread ≤ 25%
  - `fair`: spread ≤ 60%
  - `limited`: spread > 60%
- Returns `null` if bounds insufficient

```typescript
const { low, high, ref, dataQuality } = computeMarketInputs(listings, nftFloor, nftCeiling);
```

### Position Label (`getPositionLabel`)

Computes position state (UP/DOWN/FLAT) from acquisition price and market reference.

**Invariants:**
- Never returns `NaN` or `Infinity` in `pnlPct`/`pnlGun`
- **Deadband:** `abs(pnlPct) < 3%` → `FLAT`
- `acquisitionPriceGun` null/undefined/≤0/non-finite → `NO_COST_BASIS`
- `marketRefGun` null/undefined/non-finite/≤0 → `NO_MARKET_REF`
- `pnlPct` clamped to ±1000% (±10) to prevent UI overflow

**States:**
- `UP`: pnlPct ≥ 3%
- `DOWN`: pnlPct ≤ -3%
- `FLAT`: abs(pnlPct) < 3%
- `NO_COST_BASIS`: Missing/invalid acquisition price
- `NO_MARKET_REF`: Missing/invalid market reference

```typescript
const result = getPositionLabel({
  acquisitionPriceGun: costBasis,
  marketRefGun: marketInputs.ref,
  dataQuality: marketInputs.dataQuality,
});
// result.state: 'UP' | 'DOWN' | 'FLAT' | 'NO_COST_BASIS' | 'NO_MARKET_REF'
// result.pnlPct: number | null (clamped to ±10)
// result.pnlGun: number | null
```

### Per-Token Maps & FIFO Eviction

To prevent memory leaks when users browse many NFTs, per-token state maps use FIFO eviction via `FIFOKeyTracker`.

**Rationale:**
- `FetchStatus` and error maps are keyed by `tokenId`
- Without eviction, browsing 1000+ NFTs could accumulate unbounded state
- `TOKEN_MAP_SOFT_CAP` (200) limits max entries
- Oldest entries evicted when capacity exceeded

**Implementation:**
```typescript
const tracker = new FIFOKeyTracker(TOKEN_MAP_SOFT_CAP);

// On each token access:
const keysToEvict = tracker.track(tokenId);
setStateMap(prev => {
  const next = { ...prev, [tokenId]: newValue };
  keysToEvict.forEach(key => delete next[key]);
  return next;
});
```

### Abort Error Detection (`isAbortError`)

Detects AbortController errors for silent handling.

**Recognized patterns:**
1. `DOMException` with `name === 'AbortError'` (standard browser)
2. Object with `name === 'AbortError'` (Node.js/polyfills)
3. `Error` with message containing "abort" (fallback, only when name is generic)

**Usage:**
```typescript
try {
  await fetchData();
} catch (error) {
  if (isAbortError(error)) {
    return; // Silent exit - user cancelled or token changed
  }
  // Handle actual error
}
```

## Guardrails

**DO NOT:**
- Compute market reference outside `computeMarketInputs()`
- Duplicate data quality logic; use `computeMarketInputs().dataQuality`
- Bypass `normalizeCostBasis()` for cost basis validation
- Import React or any component into `nftDetailHelpers.ts`

## Testing

```bash
npm test                    # Run all tests
npm run test:watch          # Watch mode
```

Tests are deterministic with no network/time dependencies.
