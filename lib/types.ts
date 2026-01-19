export interface TokenBalance {
  balance: number;
  decimals: number;
  symbol: string;
  usdValue?: number;
}

export interface NFT {
  tokenId: string; // Primary token ID (first one if grouped)
  tokenIds?: string[]; // All token IDs if this represents multiple copies
  mintNumber?: string; // Display mint number (from traits)
  mintNumbers?: string[]; // All mint numbers if grouped
  name: string;
  image: string;
  collection: string;
  chain: 'avalanche' | 'solana';
  floorPrice?: number;
  ceilingPrice?: number;
  traits?: Record<string, string>;
  quantity?: number; // Number of copies (length of tokenIds if grouped)
  purchasePriceGun?: number; // Purchase price in GUN tokens (0 for free transfers)
  purchasePriceUsd?: number; // Purchase price in USD at time of purchase
  purchaseDate?: Date;
  transferredFrom?: string; // Wallet address if this was a free transfer
  isFreeTransfer?: boolean; // True if NFT was transferred for free (no payment)
  currentLowestListing?: number;
  currentHighestListing?: number;
}

export interface WalletData {
  address: string;
  avalanche: {
    gunToken: TokenBalance | null;
    nfts: NFT[];
  };
  solana: {
    gunToken: TokenBalance | null;
    nfts: NFT[];
  };
  totalValue: number;
  lastUpdated: Date;
}

export interface PriceData {
  gunTokenPrice: number;
  source: string;
  timestamp: Date;
}

export interface MarketplaceData {
  totalListings: number;
  floorPrice: number;
  volume24h: number;
  liveMints?: number;
}

// Marketplace purchase record for matching acquisitions
// Uses ISO string for dates to avoid serialization issues with Date objects
export interface MarketplacePurchase {
  purchaseId: string;          // Unique order/purchase ID
  tokenKey: string;            // Format: {chain}:{contract}:{tokenId}
  buyerAddress: string;        // Wallet address of buyer
  priceGun: number;            // Purchase price in GUN
  priceUsd?: number;           // Purchase price in USD (if available)
  purchaseDateIso: string;     // Timestamp of purchase as ISO string (serialization-safe)
  txHash?: string;             // Transaction hash (if available)
  orderId?: string;            // Marketplace order ID (if different from purchaseId)
}

// Paginated NFT fetch result
export interface NFTPageResult {
  nfts: NFT[];
  totalCount: number;          // Total NFTs owned by wallet
  startIndex: number;          // Starting index of this page
  pageSize: number;            // Number of NFTs requested
  hasMore: boolean;            // True if more NFTs available
}

// Pagination state for UI
export interface NFTPaginationInfo {
  totalOwnedCount: number;     // Total NFTs owned
  fetchedCount: number;        // Number of NFTs fetched so far
  pageSize: number;            // Page size used
  pagesLoaded: number;         // Number of pages loaded
  hasMore: boolean;            // True if more NFTs available
  isLoadingMore: boolean;      // True if currently loading more
}
