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
 * Get the specific item type from typeSpec, with fallback to CLASS trait.
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

  // Fallback to CLASS trait (existing behavior)
  const classValue = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';
  return classValue || 'Unknown';
}

/**
 * Check if NFT is a classified (locked) item.
 * Classified items cannot have their attachments or skins changed.
 */
export function isClassified(nft: NFT): boolean {
  return nft.typeSpec?.Item?.rarity === 'Classified';
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
