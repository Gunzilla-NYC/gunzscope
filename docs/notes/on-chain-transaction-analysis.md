# On-Chain Transaction Analysis for GUNZscope

> Prompt: "What triggers an on-chain transaction in your project? What are you planning to write to Avalanche C-Chain, and what's the user-facing reason it needs to be on-chain rather than just a database?"

## Current State: GUNZscope is Read-Only

Everything user-facing today is stored in Postgres — profiles, favorites, referrals, feature votes, portfolio snapshots, share links. The blockchain is only read from (NFT holdings, transfer history, prices). No writes.

## Honest Assessment: What Actually Needs Chain?

Most of what we store is fine in a database. Favorites, alert settings, UI preferences — nobody needs trustless verification of those. The question is: **where does on-chain add something a database can't?**

---

## Tier 1 — Strong Fit (verifiability matters)

### Portfolio Attestations

- **What it does**: Timestamped proof — "this wallet held X items worth Y GUN at block Z"
- **Why on-chain beats a database**: Shareable, verifiable, unfakeable. Useful for airdrop eligibility, tournament entry, social proof. Currently share links snapshot to a DB row that could be faked.

### Referral Rewards

- **What it does**: Distribute GUN/tokens when referrals convert
- **Why on-chain beats a database**: Transparent, auditable reward distribution. Users can verify they got paid correctly. Creates real economic incentive vs. current vanity stats.

### Achievement Soulbound Tokens

- **What it does**: Mint non-transferable NFTs for milestones — "Early Adopter", "Diamond Hands", "Whale Portfolio"
- **Why on-chain beats a database**: On-chain reputation that follows the wallet. Other dApps/games can gate on these. A DB badge means nothing outside GUNZscope.

---

## Tier 2 — Interesting But Optional

### Staked Feature Voting

- **What it does**: Lock small GUN amount to vote on feature requests
- **Why it's borderline**: Creates real signal vs. free clicks. But adds friction to a feature that already has a 20-NFT gate.

### On-Chain Favorites / Watchlists

- **What it does**: Publish your curated weapon list as an on-chain record
- **Why it's borderline**: Only useful if other apps want to read it. Currently no ecosystem for that.

---

## Tier 3 — Keep in Database

Profiles, settings, alert configs, portfolio cache, share link click analytics — all mutable, personal, high-frequency. No verification benefit.

---

## Recommendation

**Start with Portfolio Attestations.** It's the most natural fit because:

1. GUNZscope already computes the data (holdings, valuations, P&L)
2. The share feature already snapshots this — attestation is the on-chain upgrade
3. It creates a composable primitive other projects can build on (airdrop gates, tournament eligibility, reputation)
4. It's a single contract, low complexity, clear UX ("Attest your portfolio" button on the share flow)

The contract would live on **C-Chain** (or GunzChain depending on where the ecosystem wants composability), and the user-facing reason is simple: *"Prove what you own, trustlessly."*

---

*Date: 2026-02-25*


Player legacies should be attached to wallet... Player identity. Across games and ecosystems... why would a great CS2 player be good at OTG. Can we build something to answer this question? Gunzilla should grow to encompass all of gaming and GUNZscope can be an intergral part of that.