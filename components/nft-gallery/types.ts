/**
 * NFT Gallery Types
 *
 * Shared interfaces for gallery sub-components.
 */

import type { NFT, NFTPaginationInfo } from '@/lib/types';
import type { SortOption, ViewMode, Rarity, NFTCardData } from './utils';

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
}

/** Props for NFTGalleryControls (sticky controls bar) */
export interface NFTGalleryControlsProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortBy: SortOption;
  setSortBy: (s: SortOption) => void;
  selectedItemClass: string;
  setSelectedItemClass: (c: string) => void;
  activeRarities: Set<Rarity>;
  toggleRarity: (r: Rarity) => void;
  clearRarities: () => void;
  viewMode: ViewMode;
  setViewMode: (v: ViewMode) => void;
  nfts: NFT[];
  itemClasses: string[];
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
}

/** Props for NFTGalleryListRow */
export interface NFTGalleryListRowProps {
  cardData: NFTCardData;
  isEnriching: boolean;
  onClick: (nft: NFT) => void;
}

/** Props for NFTGalleryPagination */
export interface NFTGalleryPaginationProps {
  paginationInfo: NFTPaginationInfo;
  onLoadMore?: () => void;
}
