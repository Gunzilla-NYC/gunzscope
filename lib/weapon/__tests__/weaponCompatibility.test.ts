import { describe, it, expect } from 'vitest';
import { extractModelCode } from '../weaponCompatibility';

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
