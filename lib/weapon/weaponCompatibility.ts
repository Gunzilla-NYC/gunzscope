/**
 * Weapon compatibility utilities for matching weapons with their attachments/skins.
 * Uses asset path model IDs (e.g., AR05) as the primary matching strategy.
 */

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
