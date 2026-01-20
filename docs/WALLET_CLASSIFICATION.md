# Wallet Classification System

Deterministic detection of "in-game wallet" vs "external wallet" for NFT marketplace listing detection.

## Overview

The wallet classification system determines whether a given wallet address is:
- **INGAME**: A custodial/game-managed wallet that can list on the in-game marketplace
- **EXTERNAL**: A user-controlled EOA (MetaMask/Phantom) that can list on OpenSea
- **UNKNOWN**: Cannot be determined (check both marketplaces)

This classification drives which marketplace APIs are queried for NFT listings, avoiding unnecessary API calls and improving performance.

## Output Schema

```typescript
type WalletType = 'INGAME' | 'EXTERNAL' | 'UNKNOWN';

interface WalletClassification {
  walletType: WalletType;
  walletEvidence: {
    signals: string[];      // Signals that contributed to classification
    raw?: Record<string, unknown>;  // Debug data
  };
  address: string;          // Normalized to lowercase
  classifiedAt: string;     // ISO timestamp
  fromCache: boolean;       // True if result came from cache
}
```

## Classification Priority

The system uses the following signal priority (stops at first match):

### 0. Connected Wallet (Highest Priority)

**Priority: Highest**

If the wallet was connected via Dynamic (MetaMask, Phantom, etc.), the user proved key ownership by signing. Since in-game wallets are custodial (users don't have direct key access), a connected wallet is definitively EXTERNAL.

```typescript
interface WalletConnectionContext {
  connectedAddress?: string;    // Address connected via wallet provider
  isConnectedWallet: boolean;   // True if this is the connected wallet
}
```

**Logic:**
- If `isConnectedWallet === true` AND address matches `connectedAddress` → EXTERNAL

**Signal produced:**
- `connected_via_wallet_provider` → EXTERNAL

**Key insight**: Users cannot connect in-game wallets via MetaMask because they're custodial. Only external wallets can be connected.

### 1. Known Addresses (Allowlist/Denylist)

**Priority: High**

Hardcoded addresses for game infrastructure:

```typescript
// In walletClassifier.ts
const DEFAULT_KNOWN_INGAME_ADDRESSES = [
  // Game marketplace escrow contracts
  // Hot wallets used for distributions
];

const DEFAULT_KNOWN_EXTERNAL_ADDRESSES = [
  // CEX deposit addresses (if relevant)
  // Bridge contracts
];
```

**Signals produced:**
- `known_ingame_address` → INGAME
- `known_external_address` → EXTERNAL

### 2. User Account Mapping (Session Data)

**Priority: Medium**

If user session data is available:

```typescript
interface UserAccountMapping {
  custodialWalletAddress?: string;   // Game-managed wallet
  inGameWalletAddress?: string;      // Alias for custodial
  linkedExternalWallets?: string[];  // User's external wallets
}
```

**Logic:**
- If address matches `custodialWalletAddress` or `inGameWalletAddress` → INGAME
- If address is in `linkedExternalWallets[]` → EXTERNAL

**Signals produced:**
- `account_custodial_wallet` → INGAME
- `account_linked_external` → EXTERNAL

### 3. On-Chain Signals (Future)

**Priority: Medium**

Expansion points for future implementation:
- Contract code detection (is this a smart contract wallet?)
- Transaction pattern analysis
- Known game interaction detection

### 4. Fallback

**Priority: Lowest**

If no strong signal is found:
- Returns UNKNOWN
- Signal: `no_strong_signal`

## Caching

Classifications are cached in localStorage with:
- **Default TTL**: 30 minutes
- **Schema versioning**: Automatic invalidation on schema changes
- **Key format**: `zillascope:wallet:classification:v1:{address}`

### Cache Functions

```typescript
// Clear cache for a specific address
clearWalletClassificationCache(address: string): void

// Clear all wallet classification caches
clearAllWalletClassificationCaches(): void
```

## Listing Detection Integration

Based on wallet type, different marketplaces are checked:

### INGAME Wallets
- **Primary**: In-game marketplace
- **OpenSea**: Disabled by default (config: `enableOpenSeaForIngame`)

### EXTERNAL Wallets
- **Primary**: OpenSea
- **In-game**: Enabled by default (config: `enableIngameForExternal`)

### UNKNOWN Wallets
- **Both** marketplaces checked
- **Priority**: In-game first (for Gunzilla-native NFTs)
- Debug logs indicate uncertainty

### Configuration Flags

```typescript
interface WalletClassifierConfig {
  knownIngameAddresses: string[];
  knownExternalAddresses: string[];
  cacheTtlSeconds: number;              // Default: 1800 (30 min)
  enableOpenSeaForIngame: boolean;      // Default: false
  enableIngameForExternal: boolean;     // Default: true
}
```

## Usage

### Connected Wallet (Most Common)

When a user connects via Dynamic, pass the connection context:

```typescript
import { classifyWallet, WalletConnectionContext } from '@/lib/utils/walletClassifier';

// User connected their MetaMask wallet
const connectionContext: WalletConnectionContext = {
  isConnectedWallet: true,
  connectedAddress: '0xuser...',
};

const result = await classifyWallet('0xuser...', connectionContext);
// result.walletType === 'EXTERNAL' (proved key ownership)
// result.walletEvidence.signals includes 'connected_via_wallet_provider'
```

### Searched Address (No Connection)

When a user searches for an address without connecting:

```typescript
// No connection context - this is a searched/looked-up address
const result = await classifyWallet('0xsomeone...');
// result.walletType === 'UNKNOWN' (can't prove ownership)
// Both marketplaces will be checked for listings
```

### With User Account Mapping

```typescript
const userAccount = {
  custodialWalletAddress: '0xgame...',
  linkedExternalWallets: ['0xuser1...', '0xuser2...'],
};

const result = await classifyWallet('0xgame...', undefined, userAccount);
// result.walletType === 'INGAME'
```

### Get Listing Check Configuration

```typescript
import { getListingCheckConfig } from '@/lib/utils/walletClassifier';

const classification = await classifyWallet(address);
const config = getListingCheckConfig(classification);

if (config.checkOpenSea) {
  // Query OpenSea listings
}
if (config.checkIngameMarketplace) {
  // Query in-game marketplace
}
```

### Using the Unified Listing Service

```typescript
import { getListingsForNFT } from '@/lib/api/listingService';

// For a connected wallet
const listings = await getListingsForNFT(
  contractAddress,
  tokenId,
  walletAddress,
  'avalanche',
  {
    connectionContext: { isConnectedWallet: true, connectedAddress: walletAddress },
    includeDebug: true,
  }
);

console.log(listings.sources);           // ['opensea'] or ['ingame'] or both
console.log(listings.walletClassification.walletType);
```

## Updating Allowlists

### Adding Known In-Game Addresses

Edit `lib/utils/walletClassifier.ts`:

```typescript
const DEFAULT_KNOWN_INGAME_ADDRESSES: string[] = [
  '0x...escrow_contract_1...',
  '0x...hot_wallet_1...',
  // Add new addresses here
];
```

### Adding Known External Addresses

```typescript
const DEFAULT_KNOWN_EXTERNAL_ADDRESSES: string[] = [
  '0x...cex_deposit...',
  // Add new addresses here
];
```

### Runtime Configuration

Pass custom addresses via the config parameter:

```typescript
const result = await classifyWallet(address, undefined, {
  knownIngameAddresses: ['0x...'],
  knownExternalAddresses: ['0x...'],
});
```

## Error Handling

The `classifyWalletSafe` function never throws:

```typescript
import { classifyWalletSafe } from '@/lib/utils/walletClassifier';

// Always returns a result, even on error
const result = await classifyWalletSafe(address);
// On error: walletType === 'UNKNOWN', signals includes 'classification_error'
```

## Testing

Test file location: `lib/utils/__tests__/walletClassifier.test.ts`

### Test Cases Covered

1. **Mapped custodial wallet** → INGAME
2. **Mapped linked external wallet** → EXTERNAL
3. **Unknown address** → UNKNOWN
4. **Known ingame address (config)** → INGAME
5. **Known external address (config)** → EXTERNAL
6. **Error handling** → UNKNOWN
7. **Caching works** (second call hits cache)
8. **Address normalization** (case-insensitive)
9. **Listing config for INGAME**
10. **Listing config for EXTERNAL**
11. **Listing config for UNKNOWN**

### Running Tests

```bash
# After installing vitest
npm install -D vitest
npx vitest run lib/utils/__tests__/walletClassifier.test.ts
```

Or import and run manually:

```typescript
import { runAllTests } from '@/lib/utils/__tests__/walletClassifier.test';
await runAllTests();
```

## File Structure

```
lib/
├── types.ts                    # WalletType, WalletClassification types
├── utils/
│   ├── walletClassifier.ts     # Core classification logic
│   └── __tests__/
│       └── walletClassifier.test.ts
├── api/
│   ├── listingService.ts       # Unified listing service
│   └── opensea.ts              # OpenSea API client
docs/
└── WALLET_CLASSIFICATION.md    # This file
```

## Future Enhancements

1. **On-chain contract detection**: Check if address is a smart contract
2. **Game API integration**: Query game backend for wallet type
3. **Transaction pattern analysis**: Heuristics based on tx history
4. **Multi-chain support**: Extend to Solana wallets
5. **Admin dashboard**: UI for managing allowlists
