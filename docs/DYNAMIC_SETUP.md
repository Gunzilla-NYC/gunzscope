# Dynamic Wallet Setup Guide

ZillaScope now uses [Dynamic](https://www.dynamic.xyz/) for wallet connections, replacing the previous MetaMask and Phantom integrations. Dynamic provides a unified interface for connecting to multiple wallets across different blockchains.

## Why Dynamic?

- **Multi-wallet support**: Supports 300+ wallets including MetaMask, Phantom, WalletConnect, Coinbase Wallet, and more
- **Unified interface**: Single SDK for both EVM (GunzChain) and Solana wallets
- **Better UX**: Modern, customizable wallet connection modal
- **Cross-chain support**: Easy switching between different blockchain networks
- **Security**: Industry-standard security practices built-in

## Setup Instructions

### 1. Create a Dynamic Account

1. Go to [https://app.dynamic.xyz/](https://app.dynamic.xyz/)
2. Sign up for a free account
3. Create a new project

### 2. Get Your Environment ID

1. In the Dynamic dashboard, navigate to **Settings** → **API**
2. Copy your **Environment ID**
3. Add it to your `.env.local` file:

```bash
NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID=your_environment_id_here
```

### 3. Configure Networks (Optional)

The ZillaScope app is pre-configured with GunzChain Mainnet and Testnet. You can customize the network configuration in `lib/providers/DynamicProvider.tsx`.

Current configuration includes:

**GunzChain Mainnet:**
- Chain ID: 43419
- RPC: https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc
- Explorer: https://explorer.gunzchain.io

**GunzChain Testnet:**
- Chain ID: 49321
- RPC: https://rpc.gunzchain.io/ext/bc/6oHyPp9BxGDPfFZf2n6LgBsP8ugRw3VwUkGaY96K72b2kzT9w/rpc
- Explorer: https://testnet.explorer.gunzchain.io

### 4. Customize Dynamic Settings (Optional)

In the Dynamic dashboard, you can customize:

- **Wallet providers**: Enable/disable specific wallet options
- **Branding**: Customize colors, logo, and styling
- **Networks**: Add or remove supported blockchain networks
- **Authentication**: Configure social logins, email authentication, etc.

## Features

### Supported Wallets

Dynamic automatically supports:

**EVM Wallets (for GunzChain):**
- MetaMask
- Coinbase Wallet
- WalletConnect
- Trust Wallet
- Rainbow Wallet
- And 100+ more

**Solana Wallets:**
- Phantom
- Solflare
- Backpack
- And more

### Auto-Detection

The app automatically:
1. Detects when a wallet is connected
2. Retrieves the wallet address
3. Determines if it's an EVM (GunzChain) or Solana address
4. Fetches the appropriate token balances and NFTs

### Manual Address Entry

Users can still manually enter wallet addresses without connecting a wallet. The app will auto-detect the chain based on the address format.

## Technical Implementation

### 1. Provider Setup

The `DynamicProvider` component wraps the entire application in `app/layout.tsx`:

```tsx
import { DynamicProvider } from "@/lib/providers/DynamicProvider";

<DynamicProvider>
  {children}
</DynamicProvider>
```

### 2. Using Dynamic in Components

The `WalletInput` component uses Dynamic's hooks:

```tsx
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { DynamicWidget } from '@dynamic-labs/sdk-react-core';

const { primaryWallet } = useDynamicContext();

// Access wallet address
const address = primaryWallet?.address;
```

### 3. Custom Network Configuration

Custom networks are configured in `lib/providers/DynamicProvider.tsx`:

```tsx
overrides: {
  evmNetworks: [
    {
      blockExplorerUrls: ['https://explorer.gunzchain.io'],
      chainId: 43419,
      chainName: 'GunzChain Mainnet',
      nativeCurrency: {
        decimals: 18,
        name: 'GUN',
        symbol: 'GUN',
      },
      rpcUrls: ['https://rpc.gunzchain.io/...'],
    }
  ]
}
```

## Migration from MetaMask/Phantom

The previous MetaMask and Phantom wallet integrations have been replaced with Dynamic. The old hooks (`useMetaMask` and `usePhantom`) are no longer used.

### Key Changes:

1. **Single Connect Button**: Instead of separate MetaMask and Phantom buttons, there's now a single `DynamicWidget` that shows all available wallets
2. **Automatic Chain Detection**: No need to manually switch networks - Dynamic handles this automatically
3. **Better Mobile Support**: Dynamic provides better mobile wallet integration
4. **More Wallet Options**: Users can connect with 300+ different wallets

## Troubleshooting

### Environment ID Not Set

If you see a warning about `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID`, make sure you've:
1. Created a Dynamic account
2. Copied your Environment ID from the dashboard
3. Added it to `.env.local`
4. Restarted your development server

### Wallet Not Connecting

1. Make sure the wallet extension is installed
2. Check that you're on a supported network
3. Try refreshing the page
4. Check the browser console for errors

### Custom Network Not Showing

1. Verify the network configuration in `DynamicProvider.tsx`
2. Make sure the chain ID matches your network
3. Check that the RPC URL is accessible

## Resources

- [Dynamic Documentation](https://docs.dynamic.xyz/)
- [Dynamic Dashboard](https://app.dynamic.xyz/dashboard)
- [Dynamic React SDK](https://www.npmjs.com/package/@dynamic-labs/sdk-react-core)
- [Dynamic Ethereum Integration](https://www.npmjs.com/package/@dynamic-labs/ethereum)

## Support

For Dynamic-related issues:
- [Dynamic Discord](https://discord.gg/dynamic)
- [Dynamic Support](https://www.dynamic.xyz/support)

For ZillaScope issues:
- Email: hello@zillascope.xyz
- GitHub Issues: [Report an issue](https://github.com/yourusername/zillascope/issues)
