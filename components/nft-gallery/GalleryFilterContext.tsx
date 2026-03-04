'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { NFT } from '@/lib/types';
import type { SortOption, ViewMode, Rarity, MarketItemData } from './utils';
import { useNFTGalleryFilters } from './useNFTGalleryFilters';

// The context value is the return type of useNFTGalleryFilters
export type GalleryFilterState = ReturnType<typeof useNFTGalleryFilters>;

const GalleryFilterContext = createContext<GalleryFilterState | null>(null);

interface GalleryFilterProviderProps {
  children: ReactNode;
  nfts: NFT[];
  marketMap?: Map<string, MarketItemData>;
  currentGunPrice?: number;
}

/**
 * Provides filter/sort/search state for NFT gallery sub-components.
 * Wraps useNFTGalleryFilters and exposes its result via context,
 * eliminating the need to drill 20+ props to NFTGalleryControls.
 */
export function GalleryFilterProvider({ children, nfts, marketMap, currentGunPrice }: GalleryFilterProviderProps) {
  const filters = useNFTGalleryFilters(nfts, marketMap, currentGunPrice);

  return (
    <GalleryFilterContext.Provider value={filters}>
      {children}
    </GalleryFilterContext.Provider>
  );
}

export function useGalleryFilters(): GalleryFilterState {
  const ctx = useContext(GalleryFilterContext);
  if (!ctx) {
    throw new Error('useGalleryFilters must be used within GalleryFilterProvider');
  }
  return ctx;
}
