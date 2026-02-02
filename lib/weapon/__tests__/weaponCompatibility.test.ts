import { describe, it, expect } from 'vitest';
import { extractModelCode, isWeaponLocked, getFunctionalTier, FunctionalTier, findCompatibleItems, CompatibleItem, isWeapon } from '../weaponCompatibility';
import { NFT } from '@/lib/types';

// Test factory for creating NFT objects
function createWeaponNFT(overrides: Partial<NFT> = {}): NFT {
  return {
    tokenId: '1',
    name: 'Test Weapon',
    image: 'https://example.com/Weapon_Weapon_AR05_S03_Epic_hd.png',
    collection: 'Off The Grid NFT Collection',
    chain: 'avalanche',
    traits: { CLASS: 'Weapon' },
    ...overrides,
  };
}

describe('extractModelCode', () => {
  describe('weapon image URLs', () => {
    it('extracts AR05 from regular Vulture', () => {
      const url = 'https://cdne-g01-livepc-wu-itemsthumbnails.azureedge.net/ExportedAssets/Weapon_Weapon_AR05_S03_Epic_hd.png';
      expect(extractModelCode(url)).toBe('AR05');
    });

    it('extracts AR05 from special edition Vulture Solana', () => {
      const url = 'https://cdne-g01-livepc-wu-itemsthumbnails.azureedge.net/ExportedAssets/Weapon_Weapon_AR05_V_60A_hd.png';
      expect(extractModelCode(url)).toBe('AR05');
    });

    it('extracts AR04 from M4 Commodore Legacy', () => {
      const url = 'https://cdne-g01-livepc-wu-itemsthumbnails.azureedge.net/ExportedAssets/Weapon_Weapon_AR04_S03_Common_hd.png';
      expect(extractModelCode(url)).toBe('AR04');
    });

    it('extracts AR04 from M4 Commodore Celebrity (ranked)', () => {
      const url = 'https://cdne-g01-livepc-wu-itemsthumbnails.azureedge.net/ExportedAssets/Weapon_Weapon_AR04_RANK_04_SN_01_hd.png';
      expect(extractModelCode(url)).toBe('AR04');
    });
  });

  describe('attachment image URLs', () => {
    it('extracts AR05 from Vulture Reflex Sight', () => {
      const url = 'https://cdne-g01-livepc-wu-itemsthumbnails.azureedge.net/ExportedAssets/WeaponAttachment_DA_WA_AR05_SGT_REF_02_hd.png';
      expect(extractModelCode(url)).toBe('AR05');
    });
  });

  describe('edge cases', () => {
    it('returns null for non-weapon URLs', () => {
      const url = 'https://example.com/Character_Skin_01.png';
      expect(extractModelCode(url)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(extractModelCode('')).toBeNull();
    });

    it('returns null for malformed URLs', () => {
      expect(extractModelCode('not-a-url')).toBeNull();
    });
  });
});

describe('isWeaponLocked', () => {
  it('returns true for Classified tier weapons (Vulture Solana)', () => {
    const nft = createWeaponNFT({
      name: 'Vulture Solana',
      image: 'https://example.com/Weapon_Weapon_AR05_V_60A_hd.png',
      typeSpec: { Item: { rarity: 'Classified', name: 'Vulture Solana' } },
    });
    expect(isWeaponLocked(nft)).toBe(true);
  });

  it('returns true for Classified tier weapons (M4 Commodore Celebrity)', () => {
    const nft = createWeaponNFT({
      name: 'M4 Commodore Celebrity',
      image: 'https://example.com/Weapon_Weapon_AR04_RANK_04_SN_01_hd.png',
      typeSpec: { Item: { rarity: 'Classified', name: 'M4 Commodore Celebrity' } },
    });
    expect(isWeaponLocked(nft)).toBe(true);
  });

  it('returns false for Elite tier weapons (regular Vulture Legacy)', () => {
    const nft = createWeaponNFT({
      name: 'Vulture Legacy',
      image: 'https://example.com/Weapon_Weapon_AR05_S03_Epic_hd.png',
      typeSpec: { Item: { rarity: 'Elite', name: 'Vulture Legacy' } },
    });
    expect(isWeaponLocked(nft)).toBe(false);
  });

  it('returns false for Standard tier weapons', () => {
    const nft = createWeaponNFT({
      name: 'M4 Commodore Legacy',
      typeSpec: { Item: { rarity: 'Standard' } },
    });
    expect(isWeaponLocked(nft)).toBe(false);
  });

  it('falls back to asset path detection when typeSpec is missing', () => {
    // RANK_ pattern indicates special edition
    const nft = createWeaponNFT({
      name: 'M4 Commodore Celebrity',
      image: 'https://example.com/Weapon_Weapon_AR04_RANK_04_SN_01_hd.png',
      typeSpec: undefined,
    });
    expect(isWeaponLocked(nft)).toBe(true);
  });

  it('falls back to asset path detection for V_XX pattern', () => {
    const nft = createWeaponNFT({
      name: 'Vulture Solana',
      image: 'https://example.com/Weapon_Weapon_AR05_V_60A_hd.png',
      typeSpec: undefined,
    });
    expect(isWeaponLocked(nft)).toBe(true);
  });

  it('returns false when no indicators present', () => {
    const nft = createWeaponNFT({
      name: 'Generic Weapon',
      image: 'https://example.com/Weapon_Weapon_AR05_S03_Epic_hd.png',
      typeSpec: undefined,
    });
    expect(isWeaponLocked(nft)).toBe(false);
  });
});

describe('getFunctionalTier', () => {
  it('returns the tier from typeSpec', () => {
    const nft = createWeaponNFT({
      typeSpec: { Item: { rarity: 'Elite' } },
    });
    expect(getFunctionalTier(nft)).toBe('Elite');
  });

  it('returns Unknown when typeSpec is missing', () => {
    const nft = createWeaponNFT({ typeSpec: undefined });
    expect(getFunctionalTier(nft)).toBe('Unknown');
  });

  it('returns Unknown for invalid tier values', () => {
    const nft = createWeaponNFT({
      typeSpec: { Item: { rarity: 'InvalidTier' } },
    });
    expect(getFunctionalTier(nft)).toBe('Unknown');
  });
});

function createAttachmentNFT(modelCode: string, name: string): NFT {
  return {
    tokenId: Math.random().toString(),
    name,
    image: `https://example.com/WeaponAttachment_DA_WA_${modelCode}_SGT_REF_02_hd.png`,
    collection: 'Off The Grid NFT Collection',
    chain: 'avalanche',
    traits: { CLASS: 'Weapon Attachment', RARITY: 'Uncommon' },
  };
}

function createSkinNFT(weaponName: string): NFT {
  return {
    tokenId: Math.random().toString(),
    name: `${weaponName} Skin`,
    image: 'https://example.com/skin.png',
    collection: 'Off The Grid NFT Collection',
    chain: 'avalanche',
    traits: { CLASS: 'Weapon Skin', RARITY: 'Rare' },
  };
}

describe('isWeapon', () => {
  it('returns true for CLASS: Weapon', () => {
    const nft = createWeaponNFT({ traits: { CLASS: 'Weapon' } });
    expect(isWeapon(nft)).toBe(true);
  });

  it('returns true for CLASS: Primary Weapon', () => {
    const nft = createWeaponNFT({ traits: { CLASS: 'Primary Weapon' } });
    expect(isWeapon(nft)).toBe(true);
  });

  it('returns false for attachments', () => {
    const nft = createAttachmentNFT('AR05', 'Test Attachment');
    expect(isWeapon(nft)).toBe(false);
  });
});

describe('findCompatibleItems', () => {
  it('finds attachments by model code match (Tier 1)', () => {
    const weapon = createWeaponNFT({
      name: 'Vulture Legacy',
      image: 'https://example.com/Weapon_Weapon_AR05_S03_Epic_hd.png',
    });

    const inventory = [
      createAttachmentNFT('AR05', 'Vulture Reflex Sight'),
      createAttachmentNFT('AR04', 'M4 Commodore Grip'), // Different model
    ];

    const result = findCompatibleItems(weapon, inventory);

    expect(result).toHaveLength(1);
    expect(result[0].nft.name).toBe('Vulture Reflex Sight');
    expect(result[0].matchTier).toBe(1);
    expect(result[0].matchConfidence).toBe('high');
    expect(result[0].category).toBe('attachment');
  });

  it('falls back to name matching (Tier 2) when model code unavailable', () => {
    const weapon = createWeaponNFT({
      name: 'Kestrel Legacy',
      image: 'https://example.com/some_unknown_pattern.png', // No model code
    });

    const inventory = [
      createSkinNFT('Kestrel'),
    ];

    const result = findCompatibleItems(weapon, inventory);

    expect(result).toHaveLength(1);
    expect(result[0].nft.name).toBe('Kestrel Skin');
    expect(result[0].matchTier).toBe(2);
    expect(result[0].matchConfidence).toBe('medium');
    expect(result[0].category).toBe('skin');
  });

  it('returns empty array for non-weapon NFTs', () => {
    const character = createWeaponNFT({
      traits: { CLASS: 'Character' },
    });

    const result = findCompatibleItems(character, []);
    expect(result).toHaveLength(0);
  });

  it('excludes the weapon itself from results', () => {
    const weapon = createWeaponNFT({
      tokenId: 'weapon-123',
      image: 'https://example.com/Weapon_Weapon_AR05_S03_Epic_hd.png',
    });

    const inventory = [weapon]; // Same weapon in inventory

    const result = findCompatibleItems(weapon, inventory);
    expect(result).toHaveLength(0);
  });

  it('sorts results: skins first, then by rarity, then by name', () => {
    const weapon = createWeaponNFT({
      name: 'Vulture Legacy',
      image: 'https://example.com/Weapon_Weapon_AR05_S03_Epic_hd.png',
    });

    const inventory = [
      { ...createAttachmentNFT('AR05', 'Vulture Grip'), traits: { CLASS: 'Weapon Attachment', RARITY: 'Common' } },
      { ...createAttachmentNFT('AR05', 'Vulture Sight'), traits: { CLASS: 'Weapon Attachment', RARITY: 'Rare' } },
      { ...createSkinNFT(''), name: 'Vulture Skin', image: 'https://example.com/WeaponAttachment_DA_WA_AR05_SKIN_hd.png', traits: { CLASS: 'Weapon Skin', RARITY: 'Rare' } },
    ];

    const result = findCompatibleItems(weapon, inventory as NFT[]);

    // Skins first
    expect(result[0].category).toBe('skin');
    // Then higher rarity (Rare before Common)
    expect(result[1].nft.traits?.['RARITY']).toBe('Rare');
    expect(result[2].nft.traits?.['RARITY']).toBe('Common');
  });
});
