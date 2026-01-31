# Contract ABIs Reference

## ERC-20 Token (GUN)

```typescript
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];
```

## ERC-721 NFT (Off The Grid)

```typescript
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenByIndex(uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
];
```

## ERC-1155 Multi-Token

```typescript
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
  'function uri(uint256 id) view returns (string)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
  'event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)',
  'event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)',
];
```

## Seaport 1.6 (OpenSea)

```typescript
// Key event for detecting OpenSea purchases
const SEAPORT_EVENTS = {
  OrderFulfilled: 'event OrderFulfilled(bytes32 orderHash, address indexed offerer, address indexed zone, address recipient, tuple(uint8 itemType, address token, uint256 identifier, uint256 amount)[] offer, tuple(uint8 itemType, address token, uint256 identifier, uint256 amount, address recipient)[] consideration)',
};

// Event topic hash
const ORDER_FULFILLED_TOPIC = '0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31';

// Function selectors
const SEAPORT_FUNCTIONS = {
  fulfillBasicOrder: '0xfb0f3ee1',
  fulfillBasicOrder_efficient: '0x87201b41',
  fulfillOrder: '0xb3a34c4c',
  fulfillAvailableOrders: '0xe7acab24',
  fulfillAvailableAdvancedOrders: '0xed98a574',
  matchOrders: '0xf2d12b12',
  matchAdvancedOrders: '0x88147732',
};
```

## In-Game Marketplace

```typescript
// Trade event for in-game marketplace
const INGAME_TRADE_TOPIC = '0xdc1da0bf7038060851086ae316261313bb58ae31a3c217e4ba5f5baf0c7756b8';

// Contract address
const INGAME_MARKETPLACE = '0x4c9b291874fb5363e3a46cd3bf4a352ffa26a124';
```

## Event Topic Calculations

```typescript
import { ethers } from 'ethers';

// Calculate event topic from signature
const transferTopic = ethers.id('Transfer(address,address,uint256)');
// Result: 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef

// Pad address for topic filtering
const paddedAddress = ethers.zeroPadValue(walletAddress, 32);
```
