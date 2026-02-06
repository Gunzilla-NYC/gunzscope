/**
 * NFT Gallery Utilities
 *
 * Pure helper functions, constants, and types shared across gallery sub-components.
 */

import type { NFT } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export type SortOption = 'name-asc' | 'name-desc' | 'mint-asc' | 'mint-desc' | 'quantity-desc' | 'value-desc' | 'pnl-desc';
export type ViewMode = 'small' | 'medium' | 'list';
export type Rarity = 'Epic' | 'Rare' | 'Uncommon' | 'Common';

export interface MintWithRarity {
  mint: string;
  rarity: string;
}

/** Pre-computed display data for a single NFT card/row */
export interface NFTCardData {
  nft: NFT;
  rarityName: string;
  rarityColor: string;
  itemClass: string;
  mintDisplay: string;
  mintData: MintWithRarity[];
  nameInitials: string;
  hasPnL: boolean;
  pnlPct: number | null;
  isProfit: boolean;
  isLoss: boolean;
  priceGun: number | undefined;
  priceDisplay: string;
  pnlDisplay: string;
}

// ============================================================================
// Constants
// ============================================================================

// Rarity color mapping (only actual in-game rarities)
export const RARITY_COLORS: Record<string, string> = {
  Epic: '#cc44ff',      // Purple
  Rare: '#4488ff',      // Blue
  Uncommon: '#44ff44',  // Green
  Common: '#888888',    // Gray
};

// Rarity display order when filters are active (Epic -> Rare -> Uncommon -> Common)
export const RARITY_ORDER: Rarity[] = ['Epic', 'Rare', 'Uncommon', 'Common'];

// Regex for pure numeric strings - hoisted for performance
const NUMERIC_ONLY_RE = /^\d+$/;

// ============================================================================
// Rarity helpers
// ============================================================================

// Rarity color from NFT traits (matches NFTDetailModal colors)
export function getRarityColor(nft: NFT): string {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  return RARITY_COLORS[rarity] || '#888888';
}

// Rarity color from rarity string (for filter tag)
export function getRarityColorByName(rarity: string): string {
  return RARITY_COLORS[rarity] || '#888888';
}

// Get rarity rank for sorting (lower = rarer)
export function getRarityRank(nft: NFT): number {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  switch (rarity) {
    case 'Epic':
      return 1;
    case 'Rare':
      return 2;
    case 'Uncommon':
      return 3;
    case 'Common':
      return 4;
    default:
      return 5; // Unknown rarity goes last
  }
}

// Get rarity name from NFT
export function getRarityName(nft: NFT): string {
  return nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || 'Unknown';
}

// ============================================================================
// Item class helpers
// ============================================================================

// Get item class from NFT (e.g., "Weapon", "Weapon Skin", etc.)
export function getItemClass(nft: NFT): string {
  return nft.traits?.['CLASS'] || nft.traits?.['Class'] || nft.traits?.['ITEM_CLASS'] || nft.traits?.['Item Class'] || 'Unknown';
}

// Display-friendly labels for item classes (pluralized for dropdown)
export function getItemClassDisplayName(itemClass: string): string {
  const displayNames: Record<string, string> = {
    'Weapon': 'Weapons',
    'Weapon Skin': 'Weapon Skins',
    'Character': 'Characters',
    'Character Skin': 'Character Skins',
    'Vehicle': 'Vehicles',
    'Vehicle Skin': 'Vehicle Skins',
    'Accessory': 'Accessories',
    'Emote': 'Emotes',
    'Banner': 'Banners',
    'Spray': 'Sprays',
    'Charm': 'Charms',
    'LMG': 'LMGs',
    'SMG': 'SMGs',
    'AR': 'ARs',
    'Shotgun': 'Shotguns',
    'Pistol': 'Pistols',
    'Sniper': 'Snipers',
  };
  return displayNames[itemClass] || itemClass;
}

// ============================================================================
// Mint number helpers
// ============================================================================

// Strip leading zeros from mint number string
export function stripLeadingZeros(mint: string): string {
  if (NUMERIC_ONLY_RE.test(mint)) {
    return String(parseInt(mint, 10));
  }
  return mint;
}

// Check if mint number is purely numeric
export function isNumericMint(mint: string | undefined): boolean {
  if (!mint) return false;
  return NUMERIC_ONLY_RE.test(mint);
}

// Get numeric value from mint (returns Infinity for non-numeric)
export function getMintNumericValue(mint: string | undefined): number {
  if (!mint) return Infinity;
  if (isNumericMint(mint)) {
    return parseInt(mint, 10);
  }
  return Infinity;
}

// Format mint numbers for display (up to 3, then "more...")
export function formatMintNumbers(nft: NFT): { display: string; hasMore: boolean; mints: MintWithRarity[] } {
  const mintNumbers = nft.mintNumbers || (nft.mintNumber ? [nft.mintNumber] : []);
  const rarities = nft.groupedRarities || [];
  const defaultRarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || 'Unknown';

  if (mintNumbers.length === 0) {
    return {
      display: `#${nft.tokenId.slice(0, 8)}`,
      hasMore: false,
      mints: [{ mint: `#${nft.tokenId.slice(0, 8)}`, rarity: defaultRarity }],
    };
  }
  if (mintNumbers.length === 1) {
    return {
      display: `#${stripLeadingZeros(mintNumbers[0])}`,
      hasMore: false,
      mints: [{ mint: `#${stripLeadingZeros(mintNumbers[0])}`, rarity: defaultRarity }],
    };
  }
  // Multiple mints - show up to 3, strip leading zeros from each
  const displayed = mintNumbers.slice(0, 3).map(m => `#${stripLeadingZeros(m)}`).join(', ');
  const hasMore = mintNumbers.length > 3;
  const mints = mintNumbers.slice(0, 3).map((m, i) => ({
    mint: `#${stripLeadingZeros(m)}`,
    rarity: rarities[i] || defaultRarity,
  }));
  return { display: displayed, hasMore, mints };
}

// ============================================================================
// Card data derivation (shared between grid and list views)
// ============================================================================

/** Compute display-ready data for a single NFT — used by both grid cards and list rows */
export function deriveCardData(nft: NFT): NFTCardData {
  const rarityName = getRarityName(nft);
  const rarityColor = getRarityColor(nft);
  const itemClass = getItemClass(nft);
  const { display: mintDisplay, mints: mintData } = formatMintNumbers(nft);
  const nameInitials = nft.name.split(' ').map(w => w[0]).join('').slice(0, 2);

  const hasPnL = nft.purchasePriceGun !== undefined && nft.purchasePriceGun > 0 && nft.floorPrice !== undefined;
  const pnlPct = hasPnL ? ((nft.floorPrice! - nft.purchasePriceGun!) / nft.purchasePriceGun!) * 100 : null;
  const isProfit = pnlPct !== null && pnlPct > 1;
  const isLoss = pnlPct !== null && pnlPct < -1;

  const priceGun = nft.floorPrice ?? nft.purchasePriceGun;
  const priceDisplay = priceGun !== undefined ? `${priceGun.toLocaleString()} GUN` : '— GUN';
  const pnlDisplay = pnlPct !== null
    ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`
    : '—';

  return {
    nft,
    rarityName,
    rarityColor,
    itemClass,
    mintDisplay,
    mintData,
    nameInitials,
    hasPnL,
    pnlPct,
    isProfit,
    isLoss,
    priceGun,
    priceDisplay,
    pnlDisplay,
  };
}
