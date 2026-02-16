'use client';

import { useMemo } from 'react';
import { type NFT } from '@/lib/types';
import { isWeapon, isWeaponLocked } from '@/lib/weapon/weaponCompatibility';
import { findRelatedItems } from '@/lib/nft/nftDetailHelpers';

// =============================================================================
// Types
// =============================================================================

export interface UseWeaponCompatibilityResult {
  relatedItems: NFT[];
  weaponLabEligible: boolean;
  isLockedWeapon: boolean;
  hasRelatedItems: boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for weapon compatibility analysis.
 * Determines related items, weapon lab eligibility, and locked state.
 */
export function useWeaponCompatibility(
  nft: NFT | null,
  allNfts: NFT[],
): UseWeaponCompatibilityResult {
  const relatedItems = useMemo(() => {
    if (!nft || allNfts.length === 0) return [];
    return findRelatedItems(nft, allNfts);
  }, [nft, allNfts]);

  const weaponLabEligible = useMemo(() => {
    if (!nft) return false;
    if (!isWeapon(nft)) return false;
    return !isWeaponLocked(nft);
  }, [nft]);

  const isLockedWeapon = useMemo(() => {
    if (!nft) return false;
    return isWeapon(nft) && isWeaponLocked(nft);
  }, [nft]);

  const hasRelatedItems = !!(nft && isWeapon(nft) && relatedItems.length > 0);

  return {
    relatedItems,
    weaponLabEligible,
    isLockedWeapon,
    hasRelatedItems,
  };
}
