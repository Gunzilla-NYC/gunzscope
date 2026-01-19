# Wallet Integration - ZillaScope

**ZillaScope** (ZillaScope.xyz) supports one-click wallet connection via **MetaMask** (for GunzChain/EVM) and **Phantom** (for Solana)!

## Features

### 🦊 MetaMask Quick Connect (GunzChain/EVM)
- Click "Connect MetaMask" button to instantly connect your wallet
- Automatically populates your wallet address
- Instantly fetches your GUN token balance and NFTs from GunzChain
- Official MetaMask fox logo from brand kit

### 👻 Phantom Quick Connect (Solana)
- Click "Connect Phantom" button for Solana wallet connection
- Automatically detects Solana addresses
- Fetches Solana GUN token balance and NFTs
- Official Phantom ghost logo

### 🔄 Network Switching
- Automatically detects which network you're on
- One-click switch to GunzChain Mainnet or Testnet
- Automatically adds GunzChain to MetaMask if not already configured

### 🌐 Supported Networks

#### GunzChain Mainnet
- **Chain ID**: 43419 (0xA99B)
- **RPC URL**: `https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc`
- **Currency**: GUN
- **Explorer**: https://explorer.gunzchain.io

#### GunzChain Testnet
- **Chain ID**: 49321 (0xC099)
- **RPC URL**: `https://rpc.gunzchain.io/ext/bc/6oHyPp9BxGDPfFZf2n6LgBsP8ugRw3VwUkGaY96K72b2kzT9w/rpc`
- **Currency**: GUN
- **Explorer**: https://testnet.explorer.gunzchain.io

## How to Use

### Option 1: Connect with MetaMask (GunzChain/EVM)

#### 1. Install MetaMask
If you don't have MetaMask installed, click the "Install MetaMask" link to get the browser extension.

#### 2. Connect Your Wallet
Click the "Connect MetaMask" button. MetaMask will prompt you to:
1. Approve the connection
2. Select which account(s) to connect

#### 3. Switch Network (if needed)
If you're not on GunzChain, click "Switch to GunzChain Mainnet" to automatically:
1. Add GunzChain network to MetaMask (if not already added)
2. Switch to GunzChain network

#### 4. View Your Holdings
Once connected, the app will automatically fetch and display:
- GUN token balance on GunzChain
- NFT holdings
- Current prices and portfolio value

#### 5. Disconnect
Click "Disconnect" to remove the MetaMask connection and return to manual address entry.

### Option 2: Connect with Phantom (Solana)

#### 1. Install Phantom
If you don't have Phantom installed, click the "Install Phantom" link to get the browser extension.

#### 2. Connect Your Wallet
Click the "Connect Phantom" button. Phantom will prompt you to:
1. Approve the connection
2. Select which account to connect

#### 3. View Your Holdings
Once connected, the app will automatically fetch and display:
- GUN token balance on Solana
- Solana NFT holdings
- Current prices and portfolio value

#### 4. Disconnect
Click "Disconnect" to remove the Phantom connection.

## Alternative: Manual Address Entry
You can still manually enter any wallet address (GunzChain/Avalanche or Solana) in the input field below the MetaMask section.

## Technical Details

### Hook: `useMetaMask()`
Located in `lib/hooks/useMetaMask.ts`, this custom React hook provides:

```typescript
{
  isInstalled: boolean;        // Is MetaMask extension installed?
  isConnected: boolean;         // Is wallet currently connected?
  account: string | null;       // Connected account address
  chainId: string | null;       // Current chain ID (hex format)
  error: string | null;         // Error message (if any)
  connectWallet: () => Promise<string | null>;
  switchToGunzChain: (network: 'mainnet' | 'testnet') => Promise<boolean>;
  disconnectWallet: () => void;
  getNetworkName: (chainId: string | null) => string;
}
```

### Hook: `usePhantom()`
Located in `lib/hooks/usePhantom.ts`, this custom React hook provides:

```typescript
{
  isInstalled: boolean;        // Is Phantom extension installed?
  isConnected: boolean;         // Is wallet currently connected?
  publicKey: string | null;     // Connected Solana public key
  error: string | null;         // Error message (if any)
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
}
```

### Component Integration
The `WalletInput` component automatically:

**For MetaMask:**
1. Detects if MetaMask is installed
2. Shows connection status
3. Displays connected account address
4. Shows current network
5. Provides network switching functionality

**For Phantom:**
1. Detects if Phantom is installed
2. Shows connection status
3. Displays connected Solana public key
4. Automatically identifies as Solana Mainnet

### Brand Assets

**MetaMask:**
- Official fox logo from [MetaMask brand resources](https://metamask.io/assets)
- Orange brand colors from MetaMask color palette
- Full compliance with MetaMask brand guidelines

**Phantom:**
- Official ghost logo from [Phantom developer assets](https://docs.phantom.com/resources/assets)
- **Primary Brand Color**: `#4E44CE` (Purple Heart) - used for all buttons and icons
- **Supporting Colors**: `#2C2D30` (Shark/Dark), `#FFFFFF` (White)
- Based on [Phantom's 2024 brand identity](https://phantom.com/learn/blog/introducing-phantom-s-new-brand-identity)
- Hover state: `#3d35a3` (darker purple)

### Security
- Only requests the minimum permissions needed (account access)
- Never requests private keys or seed phrases
- Uses standard provider APIs (`window.ethereum` for MetaMask, `window.solana` for Phantom)
- Connection state is client-side only (not stored on server)

## Troubleshooting

### "MetaMask is not installed"
- Install the MetaMask browser extension from https://metamask.io/download/
- Refresh the page after installation

### "Failed to connect to MetaMask"
- Make sure you approved the connection request in MetaMask
- Try refreshing the page and connecting again
- Check that MetaMask is unlocked

### "Failed to switch to GunzChain"
- Make sure you approved the network switch in MetaMask
- Try manually adding the network to MetaMask first
- Check your internet connection

### Network not showing correctly
- The network name is detected based on chain ID
- If on a custom network, the chain ID will be displayed as a number
- Supported networks show friendly names (e.g., "GunzChain Mainnet")

### "Phantom is not installed"
- Install the Phantom browser extension from https://phantom.app/download
- Refresh the page after installation

### "Failed to connect to Phantom"
- Make sure you approved the connection request in Phantom
- Try refreshing the page and connecting again
- Check that Phantom is unlocked

### "Connection request rejected"
- This means you rejected the connection in the wallet popup
- Click the connect button again and approve the request

## Browser Support

**MetaMask** works in:
- Chrome/Chromium browsers
- Firefox
- Brave
- Edge
- Any browser with MetaMask extension support
- **Mobile**: Use MetaMask mobile app's built-in browser

**Phantom** works in:
- Chrome/Chromium browsers
- Firefox
- Brave
- Edge
- Any browser with Phantom extension support
- **Mobile**: Use Phantom mobile app's built-in browser
