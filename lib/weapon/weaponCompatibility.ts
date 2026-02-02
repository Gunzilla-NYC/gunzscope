/**
 * Weapon compatibility utilities for matching weapons with their attachments/skins.
 * Uses asset path model IDs (e.g., AR05) as the primary matching strategy.
 */

import { NFT } from '@/lib/types';

/** Functional tier values from type_spec.Item.rarity */
export type FunctionalTier = 'Standard' | 'Refined' | 'Elite' | 'Premium' | 'Classified' | 'Unknown';

// Regex patterns for extracting model codes from asset URLs
const WEAPON_MODEL_PATTERN = /Weapon_Weapon_([A-Z]+\d+)/;
const ATTACHMENT_MODEL_PATTERN = /WeaponAttachment_\w+_WA_([A-Z]+\d+)/;

/**
 * Extract the weapon model code from an image URL.
 * Works for both weapons and attachments.
 *
 * @example
 * extractModelCode('...Weapon_Weapon_AR05_S03_Epic_hd.png') // => 'AR05'
 * extractModelCode('...WeaponAttachment_DA_WA_AR05_SGT_REF_02_hd.png') // => 'AR05'
 */
export function extractModelCode(imageUrl: string): string | null {
  if (!imageUrl) return null;

  // Try weapon pattern first
  const weaponMatch = imageUrl.match(WEAPON_MODEL_PATTERN);
  if (weaponMatch) return weaponMatch[1];

  // Try attachment pattern
  const attachmentMatch = imageUrl.match(ATTACHMENT_MODEL_PATTERN);
  if (attachmentMatch) return attachmentMatch[1];

  return null;
}

// Asset path patterns that indicate special/locked editions
const LOCKED_ASSET_PATTERNS = [
  /_RANK_/,      // Ranked reward: AR04_RANK_04_SN_01
  /_V_\d+[A-Z]/, // Variant: AR05_V_60A
];

/**
 * Detect if a weapon is a special/locked edition that cannot be modified.
 * Primary check: type_spec.Item.rarity === "Classified"
 * Fallback: asset path patterns (RANK_, V_XX)
 */
export function isWeaponLocked(nft: NFT): boolean {
  // Primary check: Classified functional tier
  const tier = nft.typeSpec?.Item?.rarity;
  if (tier === 'Classified') {
    return true;
  }

  // Fallback: check asset path for known locked patterns
  const imageUrl = nft.image || '';
  for (const pattern of LOCKED_ASSET_PATTERNS) {
    if (pattern.test(imageUrl)) {
      return true;
    }
  }

  return false;
}

/**
 * Get the functional tier from an NFT's type_spec.
 * Returns 'Unknown' if type_spec is missing or malformed.
 */
export function getFunctionalTier(nft: NFT): FunctionalTier {
  const tier = nft.typeSpec?.Item?.rarity;
  if (!tier) return 'Unknown';

  const validTiers: FunctionalTier[] = ['Standard', 'Refined', 'Elite', 'Premium', 'Classified'];
  return validTiers.includes(tier as FunctionalTier) ? (tier as FunctionalTier) : 'Unknown';
}
