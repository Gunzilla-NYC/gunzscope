/**
 * NFT Gallery Utilities
 *
 * Pure helper functions, constants, and types shared across gallery sub-components.
 */

import type { NFT } from '@/lib/types';

// ============================================================================
// Types
// ============================================================================

export type SortOption = 'name-asc' | 'name-desc' | 'mint-asc' | 'mint-desc' | 'quantity-desc' | 'value-desc' | 'pnl-desc' | 'scarcity-asc' | 'date-desc';
export type ViewMode = 'small' | 'medium' | 'list';
export type Rarity = 'Epic' | 'Rare' | 'Uncommon' | 'Common';

export interface MintWithRarity {
  mint: string;
  rarity: string;
}

/** Market data for an item name (from /api/scarcity) */
export interface MarketItemData {
  listingCount: number;
  floorPriceGun: number;
}

/** Pre-computed display data for a single NFT card/row */
export interface NFTCardData {
  nft: NFT;
  rarityName: string;
  rarityColor: string;
  isMixedRarity: boolean;
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
  marketListings: number | null;
  marketFloor: number | null;
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

/**
 * Build a CSS linear-gradient for the left accent stripe that visualizes
 * the proportional breakdown of rarities in a grouped item.
 * Each rarity gets a segment sized by its share of the total.
 * Returns a solid color string for single-rarity groups.
 */
export function buildRarityStripeGradient(mintData: MintWithRarity[]): string {
  if (mintData.length <= 1) return getRarityColorByName(mintData[0]?.rarity || 'Common');

  // Count per rarity, preserving rarity order (Epic first → Common last)
  const counts = new Map<string, number>();
  for (const m of mintData) {
    const r = m.rarity || 'Unknown';
    counts.set(r, (counts.get(r) || 0) + 1);
  }

  // Sort by rarity rank (Epic → Rare → Uncommon → Common → Unknown)
  const order: Record<string, number> = { Epic: 0, Rare: 1, Uncommon: 2, Common: 3 };
  const sorted = [...counts.entries()].sort(
    (a, b) => (order[a[0]] ?? 4) - (order[b[0]] ?? 4),
  );

  // Build hard-stop gradient segments
  const total = mintData.length;
  const stops: string[] = [];
  let pct = 0;
  for (const [rarity, count] of sorted) {
    const color = getRarityColorByName(rarity);
    const end = pct + (count / total) * 100;
    stops.push(`${color} ${pct.toFixed(1)}%`, `${color} ${end.toFixed(1)}%`);
    pct = end;
  }

  return `linear-gradient(to bottom, ${stops.join(', ')})`;
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
    const quantity = nft.quantity || 1;
    if (quantity > 1) {
      // Grouped item without mint numbers — show quantity multiplier
      return {
        display: `\u00d7${quantity}`,
        hasMore: false,
        mints: [{ mint: `\u00d7${quantity}`, rarity: defaultRarity }],
      };
    }
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
// Venue & cost basis helpers (for detailed portfolio view)
// ============================================================================

/** Map acquisition venue to a short display label */
export function getVenueLabel(venue?: string): string {
  if (!venue) return '\u2014';
  switch (venue) {
    case 'decode':
    case 'decoder':
    case 'mint':
    case 'system_mint':
      return 'MINTED';
    case 'opensea':
      return 'OPENSEA';
    case 'otg_marketplace':
    case 'in_game_marketplace':
      return 'MARKET';
    case 'transfer':
      return 'TRANSFER';
    default:
      return venue.toUpperCase().slice(0, 8);
  }
}

/** Get display text and color for an NFT's cost basis */
export function getCostBasisDisplay(nft: NFT): { label: string; color: string } {
  if (nft.purchasePriceGun !== undefined && nft.purchasePriceGun > 0) {
    return { label: `${nft.purchasePriceGun.toLocaleString()} GUN`, color: 'var(--gs-gray-3)' };
  }
  const venue = nft.acquisitionVenue;
  if (venue === 'decode' || venue === 'decoder' || venue === 'mint' || venue === 'system_mint') {
    return { label: 'HEX', color: 'var(--gs-lime)' };
  }
  if (nft.isFreeTransfer) {
    return { label: 'FREE', color: 'var(--gs-gray-2)' };
  }
  return { label: '?', color: 'var(--gs-gray-2)' };
}

// ============================================================================
// Card data derivation (shared between grid and list views)
// ============================================================================

// Scarcity color by marketplace listing count
export function getMarketScarcityColor(listingCount: number): string {
  if (listingCount <= 2) return '#ff44ff';   // Magenta — very scarce
  if (listingCount <= 5) return '#ff8800';   // Orange — limited
  if (listingCount <= 15) return '#4488ff';  // Blue — moderate
  return '#888888';                           // Gray — available
}

/** Rarity rank for sorting — lower = rarer */
const RARITY_RANK: Record<string, number> = { Epic: 1, Rare: 2, Uncommon: 3, Common: 4 };

/** Compute display-ready data for a single NFT — used by both grid cards and list rows */
export function deriveCardData(nft: NFT, marketMap?: Map<string, MarketItemData>): NFTCardData {
  // Derive rarity from groupedRarities (accurate for mixed-rarity groups)
  // Falls back to nft.traits for single items
  let rarityName: string;
  let rarityColor: string;
  let isMixedRarity = false;

  if (nft.groupedRarities && nft.groupedRarities.length > 0) {
    const unique = [...new Set(nft.groupedRarities)].filter(r => r !== 'Unknown');
    if (unique.length > 1) {
      isMixedRarity = true;
      // Use highest rarity for primary color
      unique.sort((a, b) => (RARITY_RANK[a] ?? 5) - (RARITY_RANK[b] ?? 5));
      rarityName = 'Mixed';
      rarityColor = getRarityColorByName(unique[0]);
    } else if (unique.length === 1) {
      rarityName = unique[0];
      rarityColor = getRarityColorByName(unique[0]);
    } else {
      rarityName = getRarityName(nft);
      rarityColor = getRarityColor(nft);
    }
  } else {
    rarityName = getRarityName(nft);
    rarityColor = getRarityColor(nft);
  }

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

  const market = marketMap?.get(nft.name);

  return {
    nft,
    rarityName,
    rarityColor,
    isMixedRarity,
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
    marketListings: market?.listingCount ?? null,
    marketFloor: market?.floorPriceGun ?? null,
  };
}
