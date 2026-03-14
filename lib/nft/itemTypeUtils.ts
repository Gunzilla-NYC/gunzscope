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

/**
 * Name-based classification for items that lack a CLASS trait (e.g., event/airdrop items).
 * Patterns are tested against the NFT name (case-insensitive).
 */
const NAME_CLASSIFICATION_PATTERNS: Array<[RegExp, string]> = [
  [/\bmask\b/i, 'Facewear'],
  [/\bbalaklava\b/i, 'Facewear'],
  [/\bbandana\b/i, 'Facewear'],
  [/\bhelmet\b/i, 'Headwear'],
  [/\bberet\b/i, 'Headwear'],
  [/\bcap\b/i, 'Headwear'],
  [/\bhat\b/i, 'Headwear'],
  [/\bbeanie\b/i, 'Headwear'],
  [/\bbrim\b/i, 'Headwear'],
  [/\bgoggles\b/i, 'Eyewear'],
  [/\bshades\b/i, 'Eyewear'],
  [/\bvisor\b/i, 'Eyewear'],
  [/\bvest\b/i, 'Outerwear'],
  [/\bchest rig\b/i, 'Outerwear'],
  [/\bpuffer\b/i, 'Outerwear'],
  [/\bhoodie\b/i, 'Innerwear'],
  [/\bshirt\b/i, 'Innerwear'],
  [/\bshorts\b/i, 'Legwear'],
  [/\bpants\b/i, 'Legwear'],
  [/\bknees\b/i, 'Legwear'],
  [/\bsneaker(?:s)?\b/i, 'Footwear'],
  [/\bboot(?:ies|s)?\b/i, 'Footwear'],
  [/\bhammerhead(?:s)?\b/i, 'Cyberlegs'],
  [/\bleaper(?:s)?\b/i, 'Cyberlegs'],
  [/\bcyberlancer(?:s)?\b/i, 'Cyberlegs'],
  [/\bthumper(?:s)?\b/i, 'Cyberlegs'],
  [/\broadrunner(?:s)?\b/i, 'Cyberlegs'],
  [/\bjetpack\b/i, 'Backpack'],
  [/\bflex\b/i, 'Emote'],
  [/\bdance\b/i, 'Emote'],
  [/\bemote\b/i, 'Emote'],
  [/\btaunt\b/i, 'Emote'],
  [/\bsalute\b/i, 'Emote'],
  [/\bmoonwalk\b/i, 'Emote'],
  [/\bboogie\b/i, 'Emote'],
  [/\bgrind\b/i, 'Emote'],
  [/\bskin\b/i, 'Weapon Skin'],
  [/\bglykobitz\b/i, 'Sticker'],
];

/**
 * Known emote names that can't be caught by keyword patterns.
 * Normalized to lowercase for case-insensitive matching.
 */
const KNOWN_EMOTES = new Set([
  'snow and blow',
  'jingle and twitch',
  'the blitz down',
  "heads, you're liquidated.",
  'hopping vampyre emote',
  'westcol till i die',
  'firework farts & freedom',
  'light the fire',
  "keep 'em out",
  'trauma five',
  'hug me',
  'convulsions emote',
  'slow rise emote',
  'occupational hazard',
  'hot licks',
  'blackout',
  'toss my fruit salad',
  'permaban',
  'the hover touch',
  "eagle's cry",
  'circus inferno',
  'stuff that',
  'meat puppet',
  'neck snap emote',
  'broken puppet emote',
  'rma rampage',
  'cold snap',
  'no pulse',
  'impact replay',
  'circuit breaker',
  'karmacide',
  'techno tantrum',
  'salute and execute',
  'i want your cyberlimbs',
  'zero aura',
  'battle break',
  "you can't see me",
  'red carded',
  'fire and flex',
  'emergency ejection',
  'rage quitter',
  'final maul',
  'two finger salute',
  'bagged and tagged',
  'the flip maul',
  'the point and punish',
  'bow before the beaten',
  "hear that, b*tch?",
  'flip the salute',
  'give peace a chance',
  'throne of games',
  'going apeshit',
  'hump for dominance',
  'sleigh queen',
]);

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

  // For generic classes, try name-based reclassification first
  // (e.g., shorts/pants → Legwear, cap/hat → Headwear, hammerheads → Cyberlegs)
  const genericClasses = ['Customization Item', 'Body Part'];
  if (genericClasses.includes(classValue) && nft.name) {
    // Check known emotes list (exact name match)
    if (KNOWN_EMOTES.has(nft.name.trim().toLowerCase())) return 'Emote';

    for (const [pattern, label] of NAME_CLASSIFICATION_PATTERNS) {
      if (pattern.test(nft.name)) return label;
    }
  }

  // Fallback to CLASS trait
  if (classValue) return classValue;

  // Last resort: infer from item name (for event/airdrop items without CLASS trait)
  if (nft.name) {
    for (const [pattern, label] of NAME_CLASSIFICATION_PATTERNS) {
      if (pattern.test(nft.name)) return label;
    }
  }

  return 'Unknown';
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
