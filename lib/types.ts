export interface TokenBalance {
  balance: number;
  decimals: number;
  symbol: string;
  usdValue?: number;
}

// Acquisition venue classification
// - 'decode': In-game hex decode resulting in a mint (from zero address)
// - 'opensea': Purchased on OpenSea marketplace
// - 'in_game_marketplace': Purchased in in-game marketplace
// - 'otg_marketplace': Legacy OTG marketplace
// - 'decoder': Legacy decoder contract (separate from decode mint)
// - 'transfer': Free transfer between wallets
// - 'mint': Generic mint (legacy, prefer 'decode' for hex decodes)
// - 'system_mint': System-initiated mint (mintForUser) - decode fee paid off-chain
// - 'unknown': Could not determine venue
export type AcquisitionVenue = 'decode' | 'opensea' | 'otg_marketplace' | 'in_game_marketplace' | 'decoder' | 'transfer' | 'mint' | 'system_mint' | 'unknown';

// Metadata source tracking for debugging
export type MetadataSource = 'tokenURI' | 'gunzscan' | 'canonical' | 'cache' | 'none';

// Debug info for NFT metadata resolution
export interface NFTMetadataDebug {
  tokenURI?: string;           // Raw tokenURI from contract
  metadataSource: MetadataSource; // Where description came from
  hasDescription: boolean;     // Whether description is present
  descriptionLength: number;   // Length of description (0 if missing)
  error?: string;              // Error message if resolution failed
}

// Raw metadata type_spec from GUNZ chain (used for functional tier detection)
export interface NFTTypeSpec {
  Item?: {
    item_type?: string;    // e.g., "AssaultRifle", "None"
    name?: string;         // e.g., "Vulture Legacy"
    part?: string | null;
    rarity?: string;       // Functional tier: "Standard", "Refined", "Elite", "Premium", "Classified"
  };
}

export interface NFT {
  tokenId: string; // Primary token ID (first one if grouped)
  tokenIds?: string[]; // All token IDs if this represents multiple copies
  mintNumber?: string; // Display mint number (from traits)
  mintNumbers?: string[]; // All mint numbers if grouped
  groupedRarities?: string[]; // Rarities of each item in group (parallel to mintNumbers)
  name: string;
  description?: string; // NFT description from metadata
  image: string;
  collection: string;
  contractAddress?: string; // Contract address for the NFT collection
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
  acquisitionVenue?: AcquisitionVenue; // Where the NFT was acquired
  acquisitionTxHash?: string; // Transaction hash of acquisition
  currentLowestListing?: number;
  currentHighestListing?: number;
  comparableSalesMedian?: number; // Median GUN price from recent sales of same item+rarity
  rarityFloor?: number; // Floor price for this item's rarity tier
  metadataDebug?: NFTMetadataDebug; // Debug info for metadata resolution
  /** Raw type_spec from metadata - contains functional tier (rarity field differs from display rarity) */
  typeSpec?: NFTTypeSpec;
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
  sparkline7d?: number[];
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

// Enrichment progress tracking for UI feedback
export interface EnrichmentProgress {
  completed: number;           // Number of NFTs enriched so far
  total: number;               // Total NFTs needing enrichment
  phase: 'cache' | 'enriching' | 'complete';  // Current enrichment phase
  failedCount: number;         // Number of NFTs that failed enrichment
}

// =============================================================================
// Wallet Classification Types
// =============================================================================

/**
 * Wallet type classification for marketplace listing detection
 * - INGAME: Custodial/game-managed wallet (lists on in-game marketplace)
 * - EXTERNAL: User-controlled EOA (lists on OpenSea)
 * - UNKNOWN: Cannot determine (check both marketplaces)
 */
export type WalletType = 'INGAME' | 'EXTERNAL' | 'UNKNOWN';

/**
 * Evidence used to determine wallet type
 */
export interface WalletEvidence {
  /** Signals that contributed to the classification */
  signals: string[];
  /** Raw data from classification sources (for debugging) */
  raw?: Record<string, unknown>;
}

/**
 * Complete wallet classification result
 */
export interface WalletClassification {
  walletType: WalletType;
  walletEvidence: WalletEvidence;
  /** Address that was classified (normalized to lowercase) */
  address: string;
  /** ISO timestamp of classification */
  classifiedAt: string;
  /** Whether this result came from cache */
  fromCache: boolean;
}

// Scarcity page types
export interface ScarcityTraitStats {
  weaponTypes: Record<string, number>;
  qualities: Record<string, number>;
  classes: Record<string, number>;
}

export interface MarketplaceListing {
  itemName: string;
  imageUrl: string | null;
  listingCount: number;
  floorPriceGun: number;
  recentSales: number;
  avgSalePriceGun: number | null;
}

export interface ScarcityPageData {
  traitStats: ScarcityTraitStats;
  listings: MarketplaceListing[];
  lastUpdated: string;
}

// Leaderboard entry from /api/leaderboard
export interface LeaderboardEntry {
  rank: number;
  address: string;
  chain: string;
  totalPortfolioUsd: number;
  gunBalance: number;
  gunBalanceUsd: number;
  nftCount: number;
  nftValueUsd: number;
  totalGunSpent: number;
  unrealizedPnlUsd: number;
  pnlPercentage: number | null;
  lastUpdated: string;
}
