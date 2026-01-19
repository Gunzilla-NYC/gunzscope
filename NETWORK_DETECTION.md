# Network Detection Feature

## Overview

The GUN Token Tracker now includes automatic network and wallet type detection to help users understand which environment they're viewing.

## Features

### Network Detection
Automatically detects which GunzChain network the wallet is on:
- **🌐 Mainnet** (Chain ID: 43419) - Production environment
- **🧪 Testnet** (Chain ID: 49321) - Testing environment
- **❓ Unknown Network** - Fallback for unrecognized chains

### Wallet Type Detection
Heuristically determines the type of wallet:
- **🎮 In-Game Wallet** - Fresh wallets with minimal transactions (likely game-managed)
- **💼 External Wallet** - Active wallets with transaction history (MetaMask, Phantom, etc.)
- **👛 Unknown Type** - Unable to determine wallet type

## Visual Display

Badges are shown prominently in the Portfolio Summary section:

```
┌─────────────────────────────────────────┐
│ Portfolio Summary                       │
│ 0x1234...5678                          │
│                                         │
│ 🌐 Mainnet  💼 External Wallet  Chain ID: 43419 │
│                                         │
│ [Token Value] [NFT Holdings] [GUN Price]│
└─────────────────────────────────────────┘
```

## Badge Colors

### Network Badges
- **Mainnet**: Green background (`bg-green-100`) with green text (`text-green-800`)
- **Testnet**: Yellow background (`bg-yellow-100`) with yellow text (`text-yellow-800`)
- **Unknown**: Gray background (`bg-gray-100`) with gray text (`text-gray-800`)

### Wallet Type Badges
- **In-Game**: Purple background (`bg-purple-100`) with purple text (`text-purple-800`)
- **External**: Blue background (`bg-blue-100`) with blue text (`text-blue-800`)
- **Unknown**: Gray background (`bg-gray-100`) with gray text (`text-gray-800`)

### Chain ID Badge
- Subtle gray background (`bg-gray-50`) with gray text (`text-gray-600`)

## Components

### NetworkBadge Component
**File**: [components/NetworkBadge.tsx](components/NetworkBadge.tsx)

Displays network and wallet type information in a visually appealing badge format.

**Props**:
```typescript
interface NetworkBadgeProps {
  networkInfo: NetworkInfo | null;
  walletType?: 'in-game' | 'external' | 'unknown';
  loading?: boolean;
}
```

**Usage**:
```tsx
<NetworkBadge
  networkInfo={networkInfo}
  walletType={walletType}
/>
```

### NetworkDetector Utility
**File**: [lib/utils/networkDetector.ts](lib/utils/networkDetector.ts)

Core utility for detecting network environment and wallet types.

**Key Methods**:
```typescript
class NetworkDetector {
  // Detect network information
  async getNetworkInfo(): Promise<NetworkInfo>

  // Detect wallet type based on transaction patterns
  async detectWalletType(address: string): Promise<'in-game' | 'external' | 'unknown'>
}
```

## Detection Logic

### Network Detection
1. Query the RPC endpoint for chain ID using `provider.getNetwork()`
2. Match chain ID against known networks:
   - `43419` → GunzChain Mainnet
   - `49321` → GunzChain Testnet
3. For unknown chains, use heuristics:
   - Check if RPC URL contains "testnet" → Testnet
   - Otherwise → Unknown

### Wallet Type Detection
Uses transaction count and balance to determine wallet type:

```typescript
const txCount = await provider.getTransactionCount(address);
const balance = await provider.getBalance(address);

if (txCount === 0 && balance > 0n) {
  return 'in-game'; // Fresh wallet, likely managed by game
}
if (txCount > 10) {
  return 'external'; // Active wallet with history
}
return 'unknown';
```

**Heuristic Reasoning**:
- **In-Game Wallets**: Typically created by the game, receive tokens, but have minimal on-chain activity
- **External Wallets**: User-controlled wallets (MetaMask, etc.) with regular transaction history
- **Edge Cases**: New external wallets or inactive in-game wallets may be misclassified

## Configuration

### Environment Variables

**Mainnet** (default):
```env
NEXT_PUBLIC_AVALANCHE_RPC_URL=https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc
```

**Testnet** (optional):
```env
NEXT_PUBLIC_TESTNET_RPC_URL=https://rpc.gunz.dev/ext/bc/ryk9vkvNuKtewME2PeCgybo9sdWXGmCkBrrx4VPuZPdVdAak8/rpc
```

### Network Explorers

- **Mainnet**: [https://gunzscan.io](https://gunzscan.io)
- **Testnet**: [https://testnet.gunzscan.io](https://testnet.gunzscan.io)

## Integration

### In app/page.tsx

The main page component now:
1. Creates a `NetworkDetector` instance when a wallet is submitted
2. Fetches network info and wallet type in parallel with other data
3. Passes this information to `PortfolioSummary`

```typescript
const networkDetector = new NetworkDetector(rpcUrl);

const [
  // ... other data
  detectedNetworkInfo,
  detectedWalletType,
] = await Promise.all([
  // ... other promises
  networkDetector.getNetworkInfo(),
  networkDetector.detectWalletType(address),
]);

setNetworkInfo(detectedNetworkInfo);
setWalletType(detectedWalletType);
```

### In PortfolioSummary.tsx

The portfolio summary now accepts and displays network information:

```typescript
interface PortfolioSummaryProps {
  walletData: WalletData;
  gunPrice?: number;
  networkInfo?: NetworkInfo | null;
  walletType?: 'in-game' | 'external' | 'unknown';
}
```

## Testing

### Manual Testing Steps

1. **Test Mainnet Detection**:
   - Use RPC: `https://rpc.gunzchain.io/...`
   - Expected: 🌐 Mainnet badge with Chain ID 43419

2. **Test Testnet Detection**:
   - Use RPC: `https://rpc.gunz.dev/...`
   - Expected: 🧪 Testnet badge with Chain ID 49321

3. **Test Wallet Type Detection**:
   - Fresh wallet (0 transactions): 🎮 In-Game Wallet
   - Active wallet (10+ transactions): 💼 External Wallet

### Test Script

Run the network detection script to verify configuration:

```bash
npx ts-node scripts/detect-network.ts
```

**Expected Output**:
```
🔍 Detecting GunzChain Network Information...

📡 Mainnet RPC: https://rpc.gunzchain.io/...

⏳ Fetching network details...

✅ MAINNET INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Chain ID: 43419
Chain Name: unknown
Current Block: 14222643
Gas Price: 1.000000001 gwei
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Known Limitations

### Wallet Type Detection
The heuristic approach has limitations:
1. **New External Wallets**: A freshly created MetaMask wallet may be detected as "in-game"
2. **Active In-Game Wallets**: Game wallets with many transactions may be detected as "external"
3. **No Direct Detection**: Cannot definitively identify MetaMask vs Phantom vs other wallets

**Why?**
On-chain data alone cannot distinguish wallet software. The blockchain only sees addresses and transactions, not the client application used.

**Potential Improvements**:
- Integrate with Web3 wallet connection to detect provider (`window.ethereum`, `window.solana`)
- Allow users to manually tag wallet type
- Use more sophisticated heuristics (transaction patterns, gas usage, etc.)

### Network Detection Edge Cases
- **Custom RPCs**: Users with custom RPC endpoints may see "Unknown Network"
- **Proxied Connections**: VPNs or proxies might affect detection
- **Multiple Networks**: Currently detects only one network per session

## Future Enhancements

1. **Web3 Wallet Integration**
   - Detect MetaMask/Phantom via browser extension
   - Show wallet icon based on detected provider

2. **Real-time Network Switching**
   - Allow users to switch between mainnet/testnet
   - Update UI dynamically

3. **Network-Specific Features**
   - Different contract addresses per network
   - Testnet-specific warnings or labels

4. **Advanced Wallet Analytics**
   - Transaction history analysis
   - Wallet activity patterns
   - Risk scoring

5. **User Preferences**
   - Allow manual wallet type override
   - Save preferred network settings

## Accessibility

- **Color Contrast**: All badges meet WCAG AA standards
- **Semantic HTML**: Proper use of semantic elements
- **Screen Readers**: Icons include text labels for accessibility
- **Keyboard Navigation**: Badges are non-interactive, no focus required

## Related Files

- [components/NetworkBadge.tsx](components/NetworkBadge.tsx) - Badge UI component
- [lib/utils/networkDetector.ts](lib/utils/networkDetector.ts) - Detection logic
- [app/page.tsx](app/page.tsx) - Integration in main app
- [components/PortfolioSummary.tsx](components/PortfolioSummary.tsx) - Badge display
- [scripts/detect-network.ts](scripts/detect-network.ts) - Testing script
- [.env.example](.env.example) - Configuration template

## Resources

- **GunzChain Mainnet Explorer**: https://gunzscan.io
- **GunzChain Testnet Explorer**: https://testnet.gunzscan.io
- **ChainList (Network Info)**: https://chainlist.org/

---

Built for the GUNZILLA community with ❤️
