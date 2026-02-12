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
      const allTokenIds = nftGroup.flatMap((nft) => nft.tokenIds || [nft.tokenId]);
      const allMintNumbers = nftGroup.flatMap((nft) => nft.mintNumbers || (nft.mintNumber ? [nft.mintNumber] : []));


      // Capture individual rarities for each item (parallel to mintNumbers)
      // This allows UI to color each mint number by its rarity
      const allRarities = nftGroup.flatMap((nft) => {
        if (nft.groupedRarities && nft.groupedRarities.length > 0) return nft.groupedRarities;
        if (nft.mintNumber) return [nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || 'Unknown'];
        return [];
      });

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
        quantity: allTokenIds.length, // Set quantity to total number of individual tokens
        traits: commonTraits, // Only show common traits (exclude serial numbers)
      });
    }
  }

  return consolidatedNFTs;
}

/**
 * Trait keys that should be excluded from grouped display
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
 * Creates a grouping key for an NFT.
 * Groups by name only — items like Pierser (Rare, Epic, Common) are the same
 * weapon and should consolidate into one card with ×N quantity.
 * Individual per-mint rarities are tracked via groupedRarities for color display.
 */
export function createMetadataKey(nft: NFT): string {
  return nft.name;
}

/**
 * Checks if two NFTs have the same metadata
 */
export function haveSameMetadata(nft1: NFT, nft2: NFT): boolean {
  return createMetadataKey(nft1) === createMetadataKey(nft2);
}

/**
 * Merges new raw NFTs into an existing grouped array.
 * New NFTs that match an existing group are absorbed into it (tokenIds, mintNumbers,
 * quantity updated) WITHOUT overwriting enrichment data on the existing group.
 * New NFTs with no match are grouped among themselves and appended.
 */
export function mergeIntoGroups(existing: NFT[], incoming: NFT[]): NFT[] {
  // Build a lookup: metadataKey → index in result array
  const result = existing.map(nft => ({ ...nft })); // shallow clone to avoid mutation
  const keyToIndex = new Map<string, number>();
  for (let i = 0; i < result.length; i++) {
    keyToIndex.set(createMetadataKey(result[i]), i);
  }

  const unmatched: NFT[] = [];

  for (const nft of incoming) {
    const key = createMetadataKey(nft);
    const idx = keyToIndex.get(key);

    if (idx !== undefined) {
      // Absorb into existing group
      const group = result[idx];
      const existingIds = new Set(group.tokenIds || [group.tokenId]);
      const newId = nft.tokenId;

      if (existingIds.has(newId)) continue; // duplicate, skip

      const allTokenIds = [...(group.tokenIds || [group.tokenId]), newId];
      const allMintNumbers = [
        ...(group.mintNumbers || (group.mintNumber ? [group.mintNumber] : [])),
        ...(nft.mintNumber ? [nft.mintNumber] : []),
      ];
      const allRarities = [
        ...(group.groupedRarities || []),
        ...(nft.mintNumber ? [nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || 'Unknown'] : []),
      ];

      result[idx] = {
        ...group, // preserves enrichment data (purchasePriceGun, acquisitionVenue, etc.)
        tokenIds: allTokenIds,
        mintNumbers: allMintNumbers.length > 0 ? allMintNumbers : undefined,
        groupedRarities: allRarities.length > 0 ? allRarities : undefined,
        quantity: allTokenIds.length,
      };
    } else {
      unmatched.push(nft);
    }
  }

  // Group unmatched among themselves and append
  if (unmatched.length > 0) {
    const groupedUnmatched = groupNFTsByMetadata(unmatched);
    result.push(...groupedUnmatched);
  }

  return result;
}
