import { NFT } from '@/lib/types';

/**
 * Maps typeSpec.Item.item_type values to display-friendly labels.
 */
const ITEM_TYPE_LABELS: Record<string, string> = {
  AssaultRifle: 'Assault Rifle',
  SniperRifle: 'Sniper Rifle',
  SMG: 'SMG',
  LMG: 'LMG',
  Shotgun: 'Shotgun',
  Pistol: 'Pistol',
  Melee: 'Melee',
  None: '', // Will fallback to CLASS trait
};

/**
 * Maps model code prefixes (from image URLs) to weapon types.
 * Model codes like AR05, SMG01, SR03 appear in image URLs.
 */
const MODEL_PREFIX_TO_TYPE: Record<string, string> = {
  AR: 'Assault Rifle',
  SR: 'Sniper Rifle',
  SMG: 'SMG',
  LMG: 'LMG',
  SG: 'Shotgun',
  PT: 'Pistol',
  ML: 'Melee',
};

// Regex to extract model code from image URLs (e.g., AR05 from Weapon_Weapon_AR05_S03_Epic_hd.png)
const WEAPON_MODEL_PATTERN = /Weapon_Weapon_([A-Z]+)\d+/;

/**
 * Extract weapon type from image URL model code.
 * @example
 * extractWeaponTypeFromImage('...Weapon_Weapon_AR05_S03_Epic_hd.png') // "Assault Rifle"
 */
function extractWeaponTypeFromImage(imageUrl: string | undefined): string | null {
  if (!imageUrl) return null;

  const match = imageUrl.match(WEAPON_MODEL_PATTERN);
  if (match && match[1]) {
    const prefix = match[1];
    return MODEL_PREFIX_TO_TYPE[prefix] || null;
  }
  return null;
}

/**
 * Get the specific item type from typeSpec, image URL, or CLASS trait.
 *
 * Priority:
 * 1. typeSpec.Item.item_type (if available from metadata)
 * 2. Image URL model code (AR05 → "Assault Rifle")
 * 3. CLASS trait fallback ("Weapon", "Weapon Skin", etc.)
 *
 * @example
 * getSpecificItemType(nft) // "Assault Rifle" or "Weapon Skin" or "Weapon"
 */
export function getSpecificItemType(nft: NFT): string {
  // First try typeSpec.Item.item_type for weapons
  const itemType = nft.typeSpec?.Item?.item_type;
  if (itemType && itemType !== 'None' && ITEM_TYPE_LABELS[itemType]) {
    return ITEM_TYPE_LABELS[itemType];
  }

  // Second: try to extract from image URL model code
  const classValue = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';
  if (classValue === 'Weapon') {
    const weaponType = extractWeaponTypeFromImage(nft.image);
    if (weaponType) {
      return weaponType;
    }
  }

  // Fallback to CLASS trait (existing behavior)
  return classValue || 'Unknown';
}

// Asset path patterns that indicate special/locked editions
const LOCKED_ASSET_PATTERNS = [
  /_RANK_/,       // Ranked reward: AR04_RANK_04_SN_01
  /_V_\d+[A-Z]/,  // Variant: AR05_V_60A (Solana editions, etc.)
];

/**
 * Check if NFT is a classified (locked) item.
 * Classified items cannot have their attachments or skins changed.
 *
 * Detection methods:
 * 1. typeSpec.Item.rarity === 'Classified' (primary)
 * 2. Image URL contains locked patterns like _RANK_ or _V_60A (fallback)
 */
export function isClassified(nft: NFT): boolean {
  // Primary: Check typeSpec functional tier
  if (nft.typeSpec?.Item?.rarity === 'Classified') {
    return true;
  }

  // Fallback: Check image URL for locked edition patterns
  const imageUrl = nft.image || '';
  for (const pattern of LOCKED_ASSET_PATTERNS) {
    if (pattern.test(imageUrl)) {
      return true;
    }
  }

  return false;
}

/**
 * Get the functional tier from typeSpec (Standard, Refined, Elite, Premium, Classified).
 * This is different from display rarity (Common, Uncommon, Rare, Epic).
 */
export function getFunctionalTierFromNFT(nft: NFT): string | null {
  const tier = nft.typeSpec?.Item?.rarity;
  if (!tier) return null;

  const validTiers = ['Standard', 'Refined', 'Elite', 'Premium', 'Classified'];
  return validTiers.includes(tier) ? tier : null;
}
