# GUNZscope 🔍

**Live at: [GUNZscope.xyz](https://GUNZscope.xyz)**

GUNZscope is a comprehensive portfolio tracker for the GUNZILLA ecosystem, enabling users to monitor their GUN tokens and NFTs across multiple blockchains in real-time.

## Features

### 🎯 Multi-Chain Portfolio Tracking
- **GunzChain**: Native GUN token and NFT holdings
- **Solana**: SPL token and NFT support
- Real-time balance updates
- Historical price tracking
- NFT metadata and traits

### 🔗 Universal Wallet Connection (Dynamic)
- **300+ Wallets Supported**: MetaMask, Phantom, Coinbase Wallet, WalletConnect, and more
- **Multi-Chain**: Connect EVM (GunzChain) and Solana wallets seamlessly
- **One-Click Connection**: Unified wallet connection interface
- Auto-network detection and switching

### 💎 Advanced NFT Features
- Display mint numbers from NFT traits
- Group duplicate NFTs automatically
- Show purchase history with dates
- Historical price calculations (GUN, USD, AVAX)
- NFT detail modals with full metadata
- Floor price and market data

### 📊 Portfolio Analytics
- Total portfolio value in USD
- Token balances across chains
- NFT collection overview
- Network type detection (in-game vs external wallets)
- Real-time price data from CoinGecko

## Tech Stack

- **Framework**: Next.js 16.1.3 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Blockchain**:
  - Ethers.js v6 (EVM/GunzChain)
  - Solana Web3.js (Solana)
  - Viem (Wallet interactions)
- **Wallet Connection**:
  - Dynamic Labs SDK (300+ wallet support)
- **APIs**:
  - CoinGecko (price data)
  - OpenSea (NFT metadata)
  - Custom RPC providers

## Supported Networks

### GunzChain Mainnet
- **Chain ID**: 43419 (0xA99B)
- **RPC**: https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc
- **Currency**: GUN
- **Explorer**: https://explorer.gunzchain.io

### GunzChain Testnet
- **Chain ID**: 49321 (0xC099)
- **RPC**: https://rpc.gunzchain.io/ext/bc/6oHyPp9BxGDPfFZf2n6LgBsP8ugRw3VwUkGaY96K72b2kzT9w/rpc
- **Currency**: GUN
- **Explorer**: https://testnet.explorer.gunzchain.io

## Documentation

All detailed documentation is located in the [docs/](docs/) folder:

- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Dynamic Wallet Setup](docs/DYNAMIC_SETUP.md)** - Setting up Dynamic wallet connections
- **[Migration Summary](docs/MIGRATION_SUMMARY.md)** - Migration notes and history
- **[Network Detection](docs/NETWORK_DETECTION.md)** - Network detection implementation
- **[Next Steps](docs/NEXT_STEPS.md)** - Roadmap and planned features
- **[NFT Feature](docs/NFT_FEATURE.md)** - NFT functionality documentation
- **[NFT Grouping](docs/NFT_GROUPING.md)** - NFT grouping and deduplication
- **[Performance Optimization](docs/PERFORMANCE_OPTIMIZATION.md)** - Performance tuning guide
- **[Setup Guide](docs/SETUP_GUIDE.md)** - Initial setup instructions
- **[UI Updates](docs/UI_UPDATES.md)** - UI changes and improvements
- **[Wallet Integration](docs/WALLET_INTEGRATION.md)** - Legacy MetaMask & Phantom documentation

## Wallet Infrastructure

GUNZscope uses [Dynamic](https://www.dynamic.xyz/) for wallet connections:
- **300+ Wallets**: Support for MetaMask, Phantom, Coinbase Wallet, WalletConnect, and more
- **Multi-Chain**: Seamless support for both EVM (GunzChain) and Solana wallets
- **Secure**: Industry-standard security practices
- **Customizable**: Fully customizable UI and branding

---

**GUNZscope.xyz** - Real-time blockchain portfolio tracking for the GUNZILLA ecosystem 🚀
