/**
 * Weapon compatibility utilities for matching weapons with their attachments/skins.
 * Uses asset path model IDs (e.g., AR05) as the primary matching strategy.
 */

import { NFT } from '@/lib/types';
import { RARITY_ORDER } from '@/lib/utils/rarityColors';

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

/** Attachment subtype derived from image URL segments */
export type AttachmentSubtype = 'scope' | 'skin' | 'other';

// Pattern: WeaponAttachment_DA_WA_{MODEL}_{SUBTYPE}_...
// Use [A-Z]+ (not \w+) to capture only the subtype code before the next underscore
const ATTACHMENT_SUBTYPE_PATTERN = /WeaponAttachment_\w+_WA_[A-Z]+\d+_([A-Z]+)/;

// Known subtype codes from asset URLs
const SUBTYPE_MAP: Record<string, AttachmentSubtype> = {
  SGT: 'scope',  // Sight (Reflex, Holographic, etc.)
  SKIN: 'skin',  // Weapon skin (classified as attachment in URL)
};

/**
 * Extract the attachment subtype from an image URL.
 * Returns 'scope' for sights, 'skin' for skins, 'other' for unrecognized.
 *
 * NOTE: This is best-effort based on known URL patterns.
 * More subtypes (grip, barrel, magazine) may exist but haven't been catalogued yet.
 *
 * @example
 * extractAttachmentSubtype('...WeaponAttachment_DA_WA_AR05_SGT_REF_02_hd.png') // => 'scope'
 * extractAttachmentSubtype('...WeaponAttachment_DA_WA_AR05_SKIN_hd.png') // => 'skin'
 */
export function extractAttachmentSubtype(imageUrl: string): AttachmentSubtype {
  if (!imageUrl) return 'other';

  const match = imageUrl.match(ATTACHMENT_SUBTYPE_PATTERN);
  if (!match) return 'other';

  return SUBTYPE_MAP[match[1]] || 'other';
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

/** Match confidence level */
export type MatchConfidence = 'high' | 'medium' | 'low';

/** Category of compatible item */
export type ItemCategory = 'attachment' | 'skin';

/** Result of matching a compatible item */
export interface CompatibleItem {
  nft: NFT;
  matchTier: 1 | 2 | 3;
  matchConfidence: MatchConfidence;
  category: ItemCategory;
  /** Attachment subtype derived from URL (scope, skin, other). Only meaningful for attachments. */
  subtype: AttachmentSubtype;
}

/** Options for findCompatibleItems */
export interface FindCompatibleItemsOptions {
  /** When true, filters out skins and non-scope attachments (Classified weapons) */
  locked?: boolean;
}

/**
 * Check if an NFT is a weapon.
 */
export function isWeapon(nft: NFT): boolean {
  const itemClass = nft.traits?.['CLASS'] || nft.traits?.['Class'] || '';
  return itemClass === 'Weapon' ||
         itemClass === 'Primary Weapon' ||
         itemClass === 'Secondary Weapon' ||
         itemClass === 'Melee Weapon';
}

/**
 * Get item category from class trait.
 */
function getItemCategory(nft: NFT): ItemCategory | null {
  const itemClass = (nft.traits?.['CLASS'] || nft.traits?.['Class'] || '').toLowerCase();
  if (itemClass.includes('skin')) return 'skin';
  if (itemClass.includes('attachment') || itemClass.includes('accessory')) return 'attachment';
  return null;
}

/**
 * Extract weapon family name for Tier 2 matching.
 * Strips suffixes like Legacy, MK2, Celebrity, Solana, etc.
 */
function getWeaponFamily(name: string): string {
  return name
    .replace(/\s+(Legacy|MK\d+|Pro|Elite|Prime|Standard|Celebrity|Enforcer|Liberator|Templar|Banananizer|Feedkiller|Buzzboy|Pioneer|Solana)\s*$/i, '')
    .trim();
}

/**
 * Extract the target weapon name from a skin/attachment name.
 * Patterns: "XXX for the {WEAPON}", "XXX for {WEAPON}", or "{WEAPON} Skin"
 *
 * @example
 * extractTargetWeapon('Day 365 Skin for the M4 Commodore') // => 'm4 commodore'
 * extractTargetWeapon('Vulture Reflex Sight') // => null (no "for" pattern)
 * extractTargetWeapon('Vulture Skin') // => 'vulture'
 */
function extractTargetWeapon(itemName: string): string | null {
  const lower = itemName.toLowerCase();

  // "for the {WEAPON}" — most common skin naming pattern
  const forTheMatch = lower.match(/for the (.+?)$/);
  if (forTheMatch) return forTheMatch[1].trim();

  // "for {WEAPON}" — alternate pattern
  const forMatch = lower.match(/for ([^,]+?)$/);
  if (forMatch) return forMatch[1].trim();

  // "{WEAPON} Skin" — simple skin naming
  const skinMatch = lower.match(/^(.+?)\s+skin$/);
  if (skinMatch) return skinMatch[1].trim();

  return null;
}

/**
 * Check if a weapon family name matches an item via Tier 2 name matching.
 * Prefers extracting the target weapon from the item name for precise matching.
 * Falls back to substring matching only for multi-word weapon families.
 */
function isNameMatch(itemName: string, weaponFamilyLower: string): boolean {
  const itemNameLower = itemName.toLowerCase();

  // Strategy 1: Extract target weapon from item name and compare
  const target = extractTargetWeapon(itemName);
  if (target) {
    // Target must match the full family name (or family is a prefix of target)
    return target === weaponFamilyLower ||
           target.startsWith(weaponFamilyLower + ' ') ||
           weaponFamilyLower.startsWith(target + ' ') ||
           weaponFamilyLower === target;
  }

  // Strategy 2: Fallback substring match — only for multi-word weapon families
  // Single-word families (e.g., "M4") are too ambiguous for substring matching
  if (weaponFamilyLower.includes(' ')) {
    return itemNameLower.includes(weaponFamilyLower);
  }

  // Single-word family: require word-boundary match with "for" context
  return itemNameLower.includes(`for the ${weaponFamilyLower} `) ||
         itemNameLower.includes(`for ${weaponFamilyLower} `) ||
         itemNameLower.endsWith(`for the ${weaponFamilyLower}`) ||
         itemNameLower.endsWith(`for ${weaponFamilyLower}`);
}

/**
 * Find all compatible items (attachments, skins) for a weapon.
 * Uses tiered matching: asset-path model ID (Tier 1), name-based (Tier 2).
 *
 * When `options.locked` is true (Classified weapons), skins are excluded
 * and only scope-type attachments are returned.
 */
export function findCompatibleItems(weapon: NFT, inventory: NFT[], options?: FindCompatibleItemsOptions): CompatibleItem[] {
  if (!isWeapon(weapon)) return [];
  const skipSkins = options?.locked === true;

  const weaponModelCode = extractModelCode(weapon.image);
  const weaponFamily = getWeaponFamily(weapon.name);
  const weaponFamilyLower = weaponFamily.toLowerCase();
  const results: CompatibleItem[] = [];

  for (const item of inventory) {
    // Skip the weapon itself
    if (item.tokenId === weapon.tokenId) continue;

    // Only consider attachments and skins
    const category = getItemCategory(item);
    if (!category) continue;

    // Classified weapons: skip skins entirely
    if (skipSkins && category === 'skin') continue;

    const subtype = category === 'attachment' ? extractAttachmentSubtype(item.image) : 'other';

    // Classified weapons: only allow scope-type attachments
    // NOTE: Not all Classified weapons support scope changes — needs in-game research
    if (skipSkins && category === 'attachment' && subtype !== 'scope') continue;

    // Tier 1: Model code match (highest confidence)
    if (weaponModelCode) {
      const itemModelCode = extractModelCode(item.image);
      if (itemModelCode === weaponModelCode) {
        results.push({
          nft: item,
          matchTier: 1,
          matchConfidence: 'high',
          category,
          subtype,
        });
        continue;
      }
    }

    // Tier 2: Name-based match (fallback)
    if (isNameMatch(item.name, weaponFamilyLower)) {
      results.push({
        nft: item,
        matchTier: 2,
        matchConfidence: 'medium',
        category,
        subtype,
      });
    }
  }

  // Sort: skins first, then by rarity (best first), then by name
  return results.sort((a, b) => {
    // Skins before attachments
    if (a.category === 'skin' && b.category !== 'skin') return -1;
    if (b.category === 'skin' && a.category !== 'skin') return 1;

    // Then by rarity
    const rarityA = RARITY_ORDER[a.nft.traits?.['RARITY'] || a.nft.traits?.['Rarity'] || ''] || 99;
    const rarityB = RARITY_ORDER[b.nft.traits?.['RARITY'] || b.nft.traits?.['Rarity'] || ''] || 99;
    if (rarityA !== rarityB) return rarityA - rarityB;

    // Then by name
    return a.nft.name.localeCompare(b.nft.name);
  });
}
