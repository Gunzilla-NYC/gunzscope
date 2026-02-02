import { NFT } from '@/lib/types';

/**
 * Rarity color definitions for NFT display
 * Used across NFTDetailModal, WeaponLabDrawer, NFTGallery, etc.
 */
export const RARITY_COLORS: Record<string, { primary: string; border: string }> = {
  'Mythic': {
    primary: '#ff44ff',
    border: 'rgba(255, 68, 255, 0.65)',
  },
  'Legendary': {
    primary: '#ff8800',
    border: 'rgba(255, 136, 0, 0.65)',
  },
  'Epic': {
    primary: '#cc44ff',
    border: 'rgba(204, 68, 255, 0.65)',
  },
  'Rare': {
    primary: '#4488ff',
    border: 'rgba(68, 136, 255, 0.65)',
  },
  'Uncommon': {
    primary: '#44ff44',
    border: 'rgba(68, 255, 68, 0.65)',
  },
  'Common': {
    primary: '#888888',
    border: 'rgba(136, 136, 136, 0.65)',
  },
};

/**
 * Default rarity colors when rarity is unknown
 */
export const DEFAULT_RARITY_COLORS = {
  primary: '#b05bff',
  border: 'rgba(176, 91, 255, 0.65)',
};

/**
 * Get rarity colors for an NFT
 */
export function getRarityColors(nft: NFT): { primary: string; border: string } {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  return RARITY_COLORS[rarity] || DEFAULT_RARITY_COLORS;
}

/**
 * Get rarity colors by rarity string
 */
export function getRarityColorsByName(rarity: string): { primary: string; border: string } {
  return RARITY_COLORS[rarity] || DEFAULT_RARITY_COLORS;
}

/**
 * Rarity order for sorting (lower = better/rarer)
 */
export const RARITY_ORDER: Record<string, number> = {
  'Mythic': 1,
  'Legendary': 2,
  'Epic': 3,
  'Rare': 4,
  'Uncommon': 5,
  'Common': 6,
};
