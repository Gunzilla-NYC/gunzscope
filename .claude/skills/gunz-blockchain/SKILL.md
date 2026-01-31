---
name: gunz-blockchain
description: GUNZ blockchain interaction patterns for GUNZSCOPE NFT portfolio tracker. Use when working with GunzChain RPC calls, NFT metadata, OpenSea integration, wallet classification, or block explorer queries. Provides chain configs, contract addresses, and ethers.js patterns specific to this project.
---

# GUNZ Blockchain Development Skill

Comprehensive reference for interacting with the GUNZ blockchain (Avalanche L1 subnet) in the GUNZSCOPE project.

## Chain Configuration

### Mainnet
- **Chain ID:** `43419` (hex: `0xA99B`)
- **RPC URL:** `https://rpc.gunzchain.io/ext/bc/2M47TxWHGnhNtq6pM5zPXdATBtuqubxn5EPFgFmEawCQr9WFML/rpc`
- **Explorer:** `https://gunzscan.io`
- **Currency:** GUN

### Testnet
- **Chain ID:** `49321` (hex: `0xC099`)
- **RPC URL:** `https://rpc.gunzchain.io/ext/bc/6oHyPp9BxGDPfFZf2n6LgBsP8ugRw3VwUkGaY96K72b2kzT9w/rpc`
- **Explorer:** `https://testnet.gunzscan.io`

## Contract Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| GUN Token | `0x26deBD39D5eD069770406FCa10A0E4f8d2c743eB` | ERC-20 GUN token |
| Off The Grid NFTs | `0x9ed98e159be43a8d42b64053831fcae5e4d7d271` | ERC-721 NFT collection |
| Seaport 1.6 | `0x00000000006687982678b03100b9bdc8be440814` | OpenSea marketplace |
| In-Game Marketplace | `0x4c9b291874fb5363e3a46cd3bf4a352ffa26a124` | Game marketplace |
| GUN Token (Solana) | `3jUf2RTyXp867piSB2dt8uUcNiLDW58asjGtXkRAkBbe` | SPL token mint |

## Ethers.js Patterns

### Provider Setup
```typescript
import { ethers } from 'ethers';

const GUNZ_RPC = process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL;
const provider = new ethers.JsonRpcProvider(GUNZ_RPC);
```

### ERC-20 Token Balance
```typescript
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

const contract = new ethers.Contract(GUN_TOKEN_ADDRESS, ERC20_ABI, provider);
const balance = await contract.balanceOf(walletAddress);
const decimals = await contract.decimals();
const formatted = ethers.formatUnits(balance, decimals);
```

### ERC-721 NFT Queries
```typescript
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
];

const nftContract = new ethers.Contract(NFT_ADDRESS, ERC721_ABI, provider);
const balance = await nftContract.balanceOf(walletAddress);

// Get all token IDs owned by wallet
for (let i = 0; i < balance; i++) {
  const tokenId = await nftContract.tokenOfOwnerByIndex(walletAddress, i);
  const tokenURI = await nftContract.tokenURI(tokenId);
}
```

### Transfer Event Logs
```typescript
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

const filter: ethers.Filter = {
  address: NFT_ADDRESS,
  topics: [
    TRANSFER_TOPIC,
    null, // from (any)
    ethers.zeroPadValue(walletAddress, 32), // to
  ],
  fromBlock: 1_000_000,
  toBlock: 'latest',
};

const logs = await provider.getLogs(filter);
```

## GunzScan API (Blockscout)

### NFT Metadata
```typescript
const response = await fetch(
  `https://gunzscan.io/api/v2/tokens/${contractAddress}/instances/${tokenId}`
);
const data = await response.json();
// Returns: { token: { name, symbol }, metadata: { name, description, image, attributes } }
```

### URL Builders
```typescript
const explorerBase = 'https://gunzscan.io';

// Address page
const addressUrl = `${explorerBase}/address/${address}`;

// Transaction page
const txUrl = `${explorerBase}/tx/${txHash}`;

// NFT page
const nftUrl = `${explorerBase}/token/${contractAddress}/instance/${tokenId}`;
```

## OpenSea Integration

### Chain Mapping
```typescript
// GUNZ chain maps to 'gunzilla' in OpenSea API
function toOpenSeaChain(chain: string): string {
  if (chain === 'avalanche' || chain === 'gunz' || chain === 'gunzilla') {
    return 'gunzilla';
  }
  return chain;
}
```

### API Endpoints
```typescript
const OPENSEA_BASE = 'https://api.opensea.io/api/v2';
const headers = { 'X-API-KEY': process.env.OPENSEA_API_KEY };

// Get NFT listings
const listings = await fetch(
  `${OPENSEA_BASE}/orders/gunzilla/seaport/listings?asset_contract_address=${contractAddress}&token_ids=${tokenId}`,
  { headers }
);

// Get NFT metadata
const nft = await fetch(
  `${OPENSEA_BASE}/chain/gunzilla/contract/${contractAddress}/nfts/${tokenId}`,
  { headers }
);

// Get collection floor price
const collection = await fetch(
  `${OPENSEA_BASE}/chain/gunzilla/contract/${contractAddress}`,
  { headers }
);
```

### Seaport Event Detection
```typescript
// OrderFulfilled event topic
const SEAPORT_ORDER_FULFILLED = '0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31';

// Function selectors for Seaport transactions
const SEAPORT_SELECTORS = [
  '0xfb0f3ee1', // fulfillBasicOrder
  '0x87201b41', // fulfillBasicOrder_efficient
  '0xb3a34c4c', // fulfillOrder
  '0xe7acab24', // fulfillAvailableOrders
];
```

## Wallet Classification

### Types
- `INGAME` - Custodial/game-managed wallet
- `EXTERNAL` - User-controlled EOA (MetaMask compatible)
- `UNKNOWN` - Cannot determine type

### Address Validation
```typescript
// EVM address
const isEvm = /^0x[a-fA-F0-9]{40}$/.test(address);

// Solana address (Base58, 32-44 chars, no 0x)
const isSolana = !address.startsWith('0x') && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
```

## Acquisition Venue Detection

The project classifies NFT acquisition sources:

| Venue | Detection Method |
|-------|-----------------|
| `decode` | Transfer from zero address (mint) |
| `opensea` | Seaport address or OrderFulfilled event |
| `in_game_marketplace` | In-game trade event or marketplace contract |
| `transfer` | Direct wallet-to-wallet transfer |

## Key Project Files

| File | Purpose |
|------|---------|
| `lib/blockchain/avalanche.ts` | Main blockchain service (ethers.js) |
| `lib/blockchain/solana.ts` | Solana blockchain service |
| `lib/api/opensea.ts` | OpenSea API client |
| `lib/utils/networkDetector.ts` | Chain detection utilities |
| `lib/utils/walletClassifier.ts` | Wallet type classification |
| `lib/explorer.ts` | Block explorer URL builders |

## Environment Variables

```bash
NEXT_PUBLIC_AVALANCHE_RPC_URL=https://rpc.gunzchain.io/ext/bc/.../rpc
NEXT_PUBLIC_GUN_TOKEN_AVALANCHE=0x26deBD39D5eD069770406FCa10A0E4f8d2c743eB
NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE=0x9ed98e159be43a8d42b64053831fcae5e4d7d271
OPENSEA_API_KEY=0cced6b579c54f549fc2e84369694913
```

## Common Patterns in This Codebase

1. **RPC calls use ethers.js v6** - Use `JsonRpcProvider`, not v5 patterns
2. **NFT metadata falls back** - Token URI → GunzScan API → IPFS gateways
3. **OpenSea chain is 'gunzilla'** - Not 'avalanche' or 'gunz'
4. **Transactions need ~3 block confirmations** - Snowman++ consensus
5. **In-game wallets are custodial** - Cannot connect MetaMask to them
