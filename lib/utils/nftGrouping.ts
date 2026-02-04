import { NFT } from '../types';

/**
 * Groups NFTs by their metadata (name, image, traits) to consolidate duplicates
 * NFTs with the same metadata but different token IDs will be grouped together
 */
export function groupNFTsByMetadata(nfts: NFT[]): NFT[] {
  // Create a map to group NFTs by their metadata signature
  const groupedMap = new Map<string, NFT[]>();

  for (const nft of nfts) {
    // Create a unique key based on metadata (name, image, traits)
    const metadataKey = createMetadataKey(nft);

    if (!groupedMap.has(metadataKey)) {
      groupedMap.set(metadataKey, []);
    }

    groupedMap.get(metadataKey)!.push(nft);
  }

  // Convert grouped NFTs into consolidated NFT objects
  const consolidatedNFTs: NFT[] = [];

  for (const [_key, nftGroup] of groupedMap) {
    if (nftGroup.length === 1) {
      // Single NFT - keep as is
      consolidatedNFTs.push(nftGroup[0]);
    } else {
      // Multiple NFTs with same metadata - consolidate
      const firstNFT = nftGroup[0];
      const allTokenIds = nftGroup.map((nft) => nft.tokenId);
      const allMintNumbers = nftGroup.map((nft) => nft.mintNumber).filter(Boolean) as string[];

      // Capture individual rarities for each item (parallel to mintNumbers)
      // This allows UI to color each mint number by its rarity
      const allRarities = nftGroup
        .filter((nft) => nft.mintNumber) // Only for items with mint numbers
        .map((nft) => nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || 'Unknown');

      // For grouped items, remove unique identifiers from traits
      // to show only the common traits
      const commonTraits = firstNFT.traits
        ? Object.fromEntries(
            Object.entries(firstNFT.traits).filter(([key]) => {
              const upperKey = key.toUpperCase().replace(/[_\s-]/g, '');
              return !EXCLUDED_TRAIT_KEYS.some(
                (excludedKey) => upperKey === excludedKey.toUpperCase().replace(/[_\s-]/g, '')
              );
            })
          )
        : undefined;

      consolidatedNFTs.push({
        ...firstNFT,
        tokenId: firstNFT.tokenId, // Keep the first token ID as primary
        tokenIds: allTokenIds, // Store all token IDs
        mintNumber: firstNFT.mintNumber, // Keep first mint number as primary
        mintNumbers: allMintNumbers.length > 0 ? allMintNumbers : undefined, // Store all mint numbers
        groupedRarities: allRarities.length > 0 ? allRarities : undefined, // Rarities parallel to mintNumbers
        quantity: nftGroup.length, // Set quantity to number of copies
        traits: commonTraits, // Only show common traits (exclude serial numbers)
      });
    }
  }

  return consolidatedNFTs;
}

/**
 * Quality/rarity indicators found in image URLs.
 * These are stripped when creating the grouping key so items of different
 * qualities are grouped together (e.g., Kestrel Epic and Kestrel Rare → same group).
 */
const IMAGE_QUALITY_PATTERNS = [
  /_Epic_/gi,
  /_Rare_/gi,
  /_Uncommon_/gi,
  /_Common_/gi,
  /_Legendary_/gi,
  /_Mythic_/gi,
];

/**
 * Normalize image URL for grouping by removing quality-specific portions.
 * This allows items of the same type but different qualities to be grouped.
 *
 * @example
 * normalizeImageForGrouping('...Weapon_AR05_S03_Epic_hd.png')
 * // Returns: '...Weapon_AR05_S03__hd.png' (quality stripped)
 */
function normalizeImageForGrouping(imageUrl: string | undefined): string {
  if (!imageUrl) return '';

  let normalized = imageUrl;
  for (const pattern of IMAGE_QUALITY_PATTERNS) {
    normalized = normalized.replace(pattern, '_');
  }
  return normalized;
}

/**
 * Trait keys that should be excluded from grouping
 * These represent unique identifiers that make each NFT instance unique,
 * OR quality/rarity traits that should allow same-type items to be grouped
 * (e.g., 10 Proton Rifles of varying qualities should show as one card with ×10)
 */
const EXCLUDED_TRAIT_KEYS = [
  // Unique identifiers
  'SERIAL_NUMBER',
  'SERIAL NUMBER',
  'Serial Number',
  'serial_number',
  'serialNumber',
  'TOKEN_ID',
  'Token ID',
  'tokenId',
  'ID',
  'Mint Number',
  'MINT_NUMBER',
  'Edition',
  'EDITION',
  // Quality/rarity - same items with different qualities should be grouped together
  'RARITY',
  'Rarity',
  'rarity',
  'QUALITY',
  'Quality',
  'quality',
];

/**
 * Creates a unique key for NFT based on its metadata
 * NFTs with identical metadata will get the same key
 * Excludes unique identifiers like serial numbers from the grouping
 * Normalizes image URLs to group items of different qualities together
 */
function createMetadataKey(nft: NFT): string {
  // Use name and normalized image as primary identifiers
  // Image is normalized to strip quality indicators (Epic, Rare, etc.)
  // so items of same type but different qualities are grouped
  const normalizedImage = normalizeImageForGrouping(nft.image);

  // Traits are also included to distinguish variants, but exclude unique identifiers
  const traitsKey = nft.traits
    ? Object.entries(nft.traits)
        .filter(([key]) => {
          // Exclude traits that are unique identifiers
          const upperKey = key.toUpperCase().replace(/[_\s-]/g, '');
          return !EXCLUDED_TRAIT_KEYS.some(
            (excludedKey) => upperKey === excludedKey.toUpperCase().replace(/[_\s-]/g, '')
          );
        })
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}:${value}`)
        .join('|')
    : '';

  return `${nft.name}::${normalizedImage}::${traitsKey}`;
}

/**
 * Checks if two NFTs have the same metadata
 */
export function haveSameMetadata(nft1: NFT, nft2: NFT): boolean {
  return createMetadataKey(nft1) === createMetadataKey(nft2);
}
