import { describe, it, expect } from 'vitest';
import { extractModelCode, isWeaponLocked, getFunctionalTier, FunctionalTier } from '../weaponCompatibility';
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
