# GUNZscope

> **Avalanche Build Games 2026 — Stage 2 MVP Submission**
> [Live App](https://gunzscope.xyz) · [Competition Page](https://gunzscope.xyz/build-games) · [Roadmap](https://gunzscope.xyz/build-games/roadmap)

**Portfolio intelligence and on-chain proof of holdings for Off The Grid.**

Multi-chain portfolio tracker with on-chain attestations, dual-track P&L, acquisition intelligence, real-time alerts, and community features — built on Avalanche and GunzChain.

---

## What It Does

GUNZscope gives OTG players a complete view of their NFT portfolio across GunzChain and Solana — what they own, what they paid, and what it's worth now. It reconstructs acquisition history directly from on-chain data (HEX decodes, marketplace events, transfer logs) and computes P&L using a 6-tier valuation waterfall calibrated against real sales.

Portfolio snapshots can be attested on-chain via a smart contract on Avalanche C-Chain, producing verifiable, tamper-proof proofs of holdings backed by Merkle trees and decentralized storage.

Beyond tracking, it's a full platform: real-time email alerts for price drops and whale movements, a market browser with live listings, scarcity analytics, community leaderboards, feature voting, referral system, and shareable portfolio snapshots.

## On-Chain Integration

The core on-chain component is the **PortfolioAttestation** contract deployed on Avalanche C-Chain:

| | |
|---|---|
| **Contract** | [`0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16`](https://snowtrace.io/address/0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16/contract/43114/code) |
| **Verified** | [View on Snowtrace](https://snowtrace.io/address/0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16/contract/43114/code) |
| **Pattern** | UUPS Upgradeable Proxy (OpenZeppelin) |
| **Chain** | Avalanche C-Chain (43114) |
| **Storage** | Merkle root on-chain, full holdings on [Autonomys DSN](https://ai3.storage) |
| **Tests** | Hardhat test suite (`onchain/test/PortfolioAttestation.test.ts`) |

**What triggers a transaction:**

1. User clicks "Attest Portfolio" — client computes a Merkle tree of all holdings
2. Holdings metadata is uploaded to Autonomys DSN (decentralized storage) → returns a CID
3. Client calls `attest(wallet, blockNumber, merkleRoot, totalValueGun, itemCount, metadataUri)` on C-Chain
4. Contract emits `PortfolioAttested` event — indexed by the [On-Chain Explorer](https://gunzscope.xyz/explore)
5. Anyone can verify individual holdings via `verifyHolding()` with a Merkle proof

**Why on-chain:** Proves portfolio holdings trustlessly. Shareable, verifiable, unfakeable. Foundation for expanded player identity — tournament entry, airdrop eligibility, reputation, and social proof.

## Features

### Portfolio Intelligence

| Feature | Status | Description |
|---------|--------|-------------|
| **Dual-Track P&L** | Live | GUN appreciation (Track A) and market-based valuation (Track B) |
| **Cross-Chain** | Live | Unified view across GunzChain + Solana, 300+ wallets via Dynamic Labs |
| **Acquisition Intel** | Live | Auto-detects purchase venue (HEX decode, marketplace, transfer) with original GUN cost basis |
| **6-Tier Valuation** | Live | Waterfall: exact item sales → same variant → same skin → weapon → similar items → floor |
| **Rarity Intelligence** | Live | Dual rarity system with 7-tier hierarchy (Common → Classified), locked edition detection |
| **Live Pricing** | Live | GUN token price via CoinGecko with historical cost basis tracking |
| **On-Chain Attestations** | Live | Merkle-rooted portfolio proofs on C-Chain + Autonomys DSN |

### Market & Analytics

| Feature | Status | Description |
|---------|--------|-------------|
| **Market Browser** | Live | Searchable table of live OpenSea listings with GUN/USD prices and rarity data |
| **Scarcity Analysis** | Live | Every OTG item ranked by mint count — find rare weapons, track supply |
| **Leaderboard** | Live | Global rankings by portfolio value, NFT count, and P&L percentage |
| **Share Links** | Live | Shareable portfolio snapshots via `/s/[code]` short links with view tracking |

### Alerts & Notifications

| Feature | Status | Description |
|---------|--------|-------------|
| **GUN Price Alerts** | Live | Email when GUN token crosses your threshold |
| **Floor Drop Alerts** | Live | Notified when OTG collection floor drops significantly |
| **Snipe Alerts** | Live | Flagged when listings appear below historical fair value |
| **Whale Tracker** | Live | Email alerts on large NFT transfers detected on-chain |
| **Collection Drop Monitor** | Live | Track new mints and supply changes |
| **Portfolio Digest** | Live | Periodic summary of portfolio performance |

### Community & Platform

| Feature | Status | Description |
|---------|--------|-------------|
| **User Accounts** | Live | Manage up to 5 portfolio wallets, 3 tracked addresses, alert preferences |
| **Feature Voting** | Live | Community submits and votes on feature requests |
| **Referral System** | Live | Custom referral slugs with click → connect → load conversion funnel |
| **Favorites** | Live | Save and track specific NFTs |

### Upcoming

| Feature | Status | Description |
|---------|--------|-------------|
| **Weapon Lab** | WIP | Model code extraction for weapon compatibility and mod eligibility |
| **Reputation SBTs** | Next | Soulbound badges for milestones — collection size, trade volume, certifications |
| **Tournament System** | Next | On-chain identity-gated tournaments with attested results |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router)                                       │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐  │
│  │Portfolio  │ │ Market │ │ Explorer │ │ Alerts  │ │  Account   │  │
│  │Dashboard │ │Browser │ │ (Proofs) │ │ & Crons │ │ & Social   │  │
│  └────┬─────┘ └───┬────┘ └────┬─────┘ └────┬────┘ └─────┬──────┘  │
├───────┼────────────┼──────────┼─────────────┼────────────┼──────────┤
│  API Routes (/api) — 61 endpoints                                   │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐  │
│  │opensea/* │ │price/* │ │attest/*  │ │cron/*   │ │referral/*  │  │
│  │market/*  │ │gun/*   │ │events    │ │alerts/* │ │share/*     │  │
│  │scarcity  │ │history │ │upload    │ │6 jobs   │ │features/*  │  │
│  └────┬─────┘ └───┬────┘ └────┬─────┘ └────┬────┘ └─────┬──────┘  │
├───────┼────────────┼──────────┼─────────────┼────────────┼──────────┤
│  External Services & Data                                           │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────┐ ┌────────────┐  │
│  │ OpenSea  │ │CoinGecko│ │ C-Chain  │ │  Email  │ │  Neon      │  │
│  │   API    │ │  API   │ │   RPC    │ │ (SMTP)  │ │ PostgreSQL │  │
│  └──────────┘ └────────┘ └──────────┘ └─────────┘ └────────────┘  │
│  ┌──────────────────┐ ┌──────────┐ ┌──────────┐                    │
│  │ GunzChain RPC    │ │ Solana   │ │Autonomys │                    │
│  │ (Chain ID 43419) │ │  RPC     │ │  DSN     │                    │
│  └──────────────────┘ └──────────┘ └──────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
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
| Database | Prisma ORM + Neon PostgreSQL (20+ tables) |
| APIs | CoinGecko (prices), OpenSea (NFT data), GunzScan (metadata) |
| Cron Jobs | Vercel Cron — 6 scheduled alert pipelines |
| Analytics | PostHog, Vercel Analytics |

## Getting Started

```bash
# Clone and install
git clone https://github.com/Gunzilla-NYC/gunzscope.git
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

# Run tests
npx hardhat test

# Deploy to C-Chain (requires DEPLOYER_PRIVATE_KEY in .env)
npx hardhat run scripts/deploy.ts --network avalanche
```

## Project Structure

```
app/                            # Next.js App Router (20+ pages)
├── api/                        # Server-side API routes (61 endpoints)
│   ├── attestation/            #   Upload, events, metadata, status
│   ├── opensea/                #   Orders, sales, floor, rarity floors, comparable sales
│   ├── price/                  #   Current + historical GUN prices
│   ├── market/                 #   Live listings, reference prices
│   ├── cron/                   #   6 scheduled alert jobs
│   ├── referral/               #   Register, track, stats
│   ├── share/                  #   Portfolio share links
│   ├── feature-requests/       #   Community voting
│   ├── admin/                  #   Whitelist, referrals, origins management
│   └── ...                     #   Account, alerts, favorites, leaderboard, scarcity
├── portfolio/                  # Main portfolio dashboard
├── market/                     # Market browser (live listings)
├── explore/                    # On-chain attestation explorer
│   └── attestation/[cid]/      #   Attestation verification page
├── scarcity/                   # Scarcity analysis
├── leaderboard/                # Global rankings
├── account/                    # User settings, wallets, alerts
├── feature-requests/           # Community feature voting
└── build-games/                # Competition submission + roadmap
    └── roadmap/                #   5-phase strategic roadmap

components/                     # React components
lib/                            # Shared business logic
├── api/                        #   External API clients (OpenSea, CoinGecko)
├── blockchain/                 #   Chain-specific code (avalanche.ts, solana.ts)
├── hooks/                      #   React hooks (enrichment, acquisition, filters)
├── nft/                        #   NFT helpers and classification
├── portfolio/                  #   Portfolio calculation (pure functions)
├── pricing/                    #   Price resolution and waterfall
├── types/                      #   TypeScript interfaces
└── utils/                      #   Formatting, caching, helpers

onchain/                        # Smart contracts (Hardhat)
├── contracts/                  #   Solidity sources
│   └── PortfolioAttestation.sol
├── scripts/                    #   Deploy + upgrade scripts
└── test/                       #   Contract tests (Hardhat + Chai)

prisma/                         # Database schema (20+ models)
```

## Networks

| Network | Chain ID | Usage |
|---------|----------|-------|
| GunzChain Mainnet | 43419 | NFT holdings, GUN token, game data |
| Avalanche C-Chain | 43114 | Portfolio attestation contract ([verified](https://snowtrace.io/address/0xEBE8FD7d40724Eb84d9C888ce88840577Cc79c16/contract/43114/code)) |
| Avalanche Fuji (testnet) | 43113 | Testnet attestation contract ([verified](https://testnet.snowtrace.io/address/0x6378B604276E54e040b531e5efABf7b444e1138D#code)) |
| Solana Mainnet | — | GUN SPL token |

## Roadmap

GUNZscope is built as a compounding flywheel — each phase creates the foundation for the next:

1. **Portfolio Intelligence & Proof** — Track holdings, attest on-chain (C-Chain), establish proof of holdings
2. **On-Chain Identity & Tournaments** — Expand attestations into player identity, tournament system with verified results
3. **Trusted Market Interface** — P2P offers with identity-backed trust, escrow, intent matching
4. **Cross-Game Intelligence** — Multi-game portfolio tracking, cross-game identity portability
5. **Infrastructure Layer** — SDK licensing, API tiers, oracle feeds for the gaming ecosystem

Full roadmap with research and strategy: [gunzscope.xyz/build-games/roadmap](https://gunzscope.xyz/build-games/roadmap)

## Documentation

Technical documentation is in the [docs/](docs/) directory:

- [Brand & Design System](docs/BRAND.md) — colors, typography, component patterns
- [Deployment Guide](docs/DEPLOYMENT.md) — Vercel production deployment
- [NFT Pipeline](docs/NFT_PIPELINE.md) — pricing, acquisition, P&L calculation
- [Wallet Classification](docs/WALLET_CLASSIFICATION.md) — in-game vs external detection
- [Network Detection](docs/NETWORK_DETECTION.md) — chain detection implementation

## License

[Business Source License 1.1](LICENSE)
