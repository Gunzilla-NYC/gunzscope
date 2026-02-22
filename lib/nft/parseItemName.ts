/**
 * Parse OTG item names to extract skin design and weapon information.
 *
 * Skins follow the pattern: "{Skin Design} for the {Weapon}"
 * e.g. "I'm Fine Skin for the Kestrel" → skinDesign: "I'm Fine Skin", weapon: "Kestrel"
 *
 * Items not matching this pattern are weapons/other (skinDesign=null, weapon=null).
 */

export interface ParsedItemName {
  baseName: string;          // Full item name as-is
  skinDesign: string | null; // "I'm Fine Skin" if skin, null if weapon/other
  weapon: string | null;     // "Kestrel" if skin, null otherwise
  isSkin: boolean;
}

const SKIN_PATTERN = /^(.+?)\s+for\s+the\s+(.+)$/i;

export function parseItemName(name: string): ParsedItemName {
  const trimmed = name.trim();
  const match = trimmed.match(SKIN_PATTERN);

  if (match) {
    return {
      baseName: trimmed,
      skinDesign: match[1].trim(),
      weapon: match[2].trim(),
      isSkin: true,
    };
  }

  return {
    baseName: trimmed,
    skinDesign: null,
    weapon: null,
    isSkin: false,
  };
}
