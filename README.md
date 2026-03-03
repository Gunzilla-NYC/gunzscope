# GUNZscope

**Portfolio intelligence for Off The Grid on GunzChain.**

Multi-chain portfolio tracker with on-chain attestations, dual-track P&L, and acquisition intelligence for the GUNZILLA gaming ecosystem.

**[Live App](https://gunzscope.xyz)** · **[On-Chain Explorer](https://gunzscope.xyz/explore)** · **[Build Games Submission](https://gunzscope.xyz/build-games)**

---

## What It Does

GUNZscope gives OTG players a complete view of their NFT portfolio across GunzChain and Solana — what they own, what they paid, and what it's worth now. It reconstructs acquisition history directly from on-chain data (HEX decodes, marketplace events, transfer logs) and computes P&L using a 6-tier valuation waterfall calibrated against real sales.

Portfolio snapshots can be attested on-chain via a smart contract on Avalanche C-Chain, producing verifiable, tamper-proof proofs of holdings backed by Merkle trees and decentralized storage.

## On-Chain Integration

The core on-chain component is the **PortfolioAttestation** contract deployed on Avalanche C-Chain:

| | |
|---|---|
| **Contract** | [`0xEBE8...c16`](https://snowtrace.io/address/0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16/contract/43114/code) |
| **Pattern** | UUPS Upgradeable Proxy (OpenZeppelin) |
| **Chain** | Avalanche C-Chain (43114) |
| **Storage** | Merkle root on-chain, full holdings on [Autonomys DSN](https://ai3.storage) |

**What triggers a transaction:**

1. User clicks "Attest Portfolio" — client computes a Merkle tree of all holdings
2. Holdings metadata is uploaded to Autonomys DSN (decentralized storage) → returns a CID
3. Client calls `attest(wallet, blockNumber, merkleRoot, totalValueGun, itemCount, metadataUri)` on C-Chain
4. Contract emits `PortfolioAttested` event — indexed by the [On-Chain Explorer](https://gunzscope.xyz/explore)
5. Anyone can verify individual holdings via `verifyHolding()` with a Merkle proof

**Why on-chain:** Proves portfolio holdings trustlessly. Shareable, verifiable, unfakeable. Useful for airdrop eligibility, tournament entry, and social proof.

## Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Dual-Track P&L** | Live | GUN appreciation (Track A) and market-based valuation (Track B) |
| **Cross-Chain** | Live | Unified view across GunzChain + Solana, 300+ wallets via Dynamic Labs |
| **Acquisition Intel** | Live | Auto-detects purchase venue and reconstructs original GUN cost basis |
| **6-Tier Valuation** | Live | Waterfall from exact item sales → same variant → same skin → weapon → similar → floor |
| **Rarity Intelligence** | Live | Dual rarity system with 7-tier hierarchy, locked edition detection |
| **On-Chain Attestations** | Live | Merkle-rooted portfolio proofs on C-Chain + Autonomys DSN |
| **Live Pricing** | Live | GUN token price via CoinGecko with historical cost basis tracking |
| **Weapon Lab** | WIP | Model code extraction for weapon compatibility and mod eligibility |
| **Reputation SBTs** | Next | Soulbound badges for milestones — collection size, trade volume, certifications |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router)                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Portfolio │  │  Market  │  │ Explorer │  │  Attestation  │   │
│  │Dashboard │  │ Analysis │  │  (Proofs)│  │    Flow       │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───────┬───────┘   │
│       │              │             │                │           │
├───────┼──────────────┼─────────────┼────────────────┼───────────┤
│  API Routes (/api)   │             │                │           │
│  ┌──────────┐  ┌─────┴────┐  ┌────┴─────┐  ┌──────┴────────┐  │
│  │ opensea/ │  │  price/  │  │attestation│  │  attestation  │  │
│  │ orders   │  │ history  │  │  events   │  │   upload      │  │
│  │ sales    │  │          │  │  metadata │  │               │  │
│  │ floor    │  │          │  │  status   │  │               │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬────────┘  │
├───────┼──────────────┼─────────────┼────────────────┼───────────┤
│  External Services   │             │                │           │
│  ┌──────────┐  ┌─────┴────┐  ┌────┴─────┐  ┌──────┴────────┐  │
│  │ OpenSea  │  │CoinGecko │  │ C-Chain  │  │  Autonomys    │  │
│  │   API    │  │   API    │  │   RPC    │  │    DSN        │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────┐                        │
│  │ GunzChain RPC    │  │  Solana RPC  │                        │
│  │ (Chain ID 43419) │  │              │                        │
│  └──────────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

**Attestation data flow:**

```
Portfolio Snapshot → Merkle Tree → Upload to Autonomys DSN → attest() on C-Chain
                                                                    ↓
                                           PortfolioAttested event emitted
                                                                    ↓
                                              Explorer indexes → Verify via Merkle proof
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.3 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, custom brand system |
| Blockchain | Ethers.js v6 (GunzChain/C-Chain), Solana Web3.js |
| Smart Contracts | Solidity 0.8.28, OpenZeppelin (UUPS), Hardhat |
| Wallet | Dynamic Labs SDK (300+ wallets) |
| Storage | Autonomys DSN (attestation metadata) |
| Database | Prisma ORM + Neon PostgreSQL |
| APIs | CoinGecko (prices), OpenSea (NFT data), GunzScan (metadata) |
| Analytics | PostHog, Vercel Analytics |

## Getting Started

```bash
# Clone and install
git clone https://github.com/cryptohaki/gunzscope.git
cd gunzscope
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys (see .env.example for docs)

# Run development server
npm run dev
```

**Smart contracts:**

```bash
cd onchain
npm install
npx hardhat compile

# Deploy to GunzChain or C-Chain (requires DEPLOYER_PRIVATE_KEY in .env)
npx hardhat run scripts/deploy.ts --network avalanche
```

## Project Structure

```
app/                        # Next.js App Router
├── api/                    # Server-side API routes
│   ├── attestation/        #   Upload, events, metadata, status
│   ├── opensea/            #   Orders, sales, floor, rarity floors
│   └── price/              #   Current + historical GUN prices
├── explore/                # On-chain attestation explorer
│   └── attestation/[cid]/  # Attestation verification page
├── portfolio/              # Main portfolio dashboard
├── market/                 # Market analysis
├── scarcity/               # Scarcity analysis
└── leaderboard/            # Global leaderboard

components/                 # React components
lib/                        # Shared business logic
├── api/                    # External API clients
├── blockchain/             # Chain-specific code (avalanche.ts, solana.ts)
├── nft/                    # NFT helpers and classification
├── portfolio/              # Portfolio calculation (pure functions)
├── pricing/                # Price resolution and history
└── types/                  # TypeScript interfaces

onchain/                    # Smart contracts (Hardhat)
├── contracts/              # Solidity sources
│   └── PortfolioAttestation.sol
├── scripts/                # Deploy + upgrade scripts
└── test/                   # Contract tests
```

## Networks

| Network | Chain ID | Usage |
|---------|----------|-------|
| GunzChain Mainnet | 43419 | NFT holdings, GUN token, game data |
| Avalanche C-Chain | 43114 | Portfolio attestation contract |
| Solana Mainnet | — | GUN SPL token |

## License

[Apache License 2.0](LICENSE)
