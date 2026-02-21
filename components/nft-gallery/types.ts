/**
 * NFT Gallery Types
 *
 * Shared interfaces for gallery sub-components.
 */

import type { NFT, NFTPaginationInfo } from '@/lib/types';
import type { SortOption, ViewMode, Rarity, NFTCardData, MarketItemData } from './utils';

/** Props for the top-level NFTGallery component */
export interface NFTGalleryProps {
  nfts: NFT[];
  chain: string;
  walletAddress?: string;
  paginationInfo?: NFTPaginationInfo;
  onLoadMore?: () => void;
  /** True when background enrichment is fetching P&L data */
  isEnriching?: boolean;
  /** Offset in pixels from top of viewport for sticky controls (accounts for navbar + sticky header) */
  stickyOffset?: number;
  /** Market scarcity data keyed by item name */
  marketMap?: Map<string, MarketItemData>;
  /** Portfolio view mode — cards show extra detail (cost basis, venue) in detailed mode */
  portfolioViewMode?: 'simple' | 'detailed';
  /** Current GUN/USD price — used for USD-based P&L fallback when no item market data exists */
  currentGunPrice?: number;
}

/** Props for NFTGalleryControls (sticky controls bar) */
export interface NFTGalleryControlsProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  selectedItemClass: string;
  setSelectedItemClass: (c: string) => void;
  selectedOrigin: string;
  setSelectedOrigin: (o: string) => void;
  activeRarities: Set<Rarity>;
  toggleRarity: (r: Rarity) => void;
  clearRarities: () => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  nfts: NFT[];
  itemClasses: string[];
  originCounts: Map<string, number>;
  rarityCounts: Record<string, number>;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  stickyOffset?: number;
}

/** Props for NFTGalleryGridCard */
export interface NFTGalleryGridCardProps {
  cardData: NFTCardData;
  viewMode: 'small' | 'medium';
  isEnriching: boolean;
  onClick: (nft: NFT) => void;
  /** Portfolio view mode — shows cost basis, venue badge, enrichment indicator when 'detailed' */
  portfolioViewMode?: 'simple' | 'detailed';
}

/** Props for NFTGalleryListRow */
export interface NFTGalleryListRowProps {
  cardData: NFTCardData;
  isEnriching: boolean;
  onClick: (nft: NFT) => void;
  /** Portfolio view mode — shows cost column and venue badge when 'detailed' */
  portfolioViewMode?: 'simple' | 'detailed';
}

/** Props for NFTGalleryPagination */
export interface NFTGalleryPaginationProps {
  paginationInfo: NFTPaginationInfo;
  onLoadMore?: () => void;
}
