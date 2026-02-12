/**
 * NFT Gallery Filters Hook
 *
 * All filter, sort, and summary state for the NFT gallery.
 * Extracted from NFTGallery.tsx for separation of concerns.
 */

import { useState, useMemo, useCallback } from 'react';
import { NFT } from '@/lib/types';
import { buildTokenKey } from '@/lib/utils/nftCache';
import {
  SortOption, ViewMode, Rarity, MarketItemData,
  getRarityRank, getRarityName,
  getItemClass, getMintNumericValue, isNumericMint,
} from './utils';

// Helper function to check if any trait matches the query
function matchesTraits(nft: NFT, query: string): boolean {
  if (!nft.traits) return false;

  for (const [traitType, traitValue] of Object.entries(nft.traits)) {
    if (traitValue && traitValue.toLowerCase() !== 'none') {
      if (traitValue.toLowerCase().includes(query)) {
        return true;
      }
      if (traitType.toLowerCase().includes(query)) {
        return true;
      }
    }
  }
  return false;
}

export function useNFTGalleryFilters(nfts: NFT[], marketMap?: Map<string, MarketItemData>) {
  // Modal state
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [selectedTokenKeyString, setSelectedTokenKeyString] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter/sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('mint-asc');
  const [selectedItemClass, setSelectedItemClass] = useState<string>('all');
  const [activeRarities, setActiveRarities] = useState<Set<Rarity>>(() => new Set());
  // Default view: small grid if >16 NFTs, medium grid if <=16
  const [viewMode, setViewMode] = useState<ViewMode>(() => nfts.length > 16 ? 'small' : 'medium');

  // Toggle a rarity on/off (multi-select)
  const toggleRarity = useCallback((rarity: Rarity) => {
    setActiveRarities(prev => {
      const next = new Set(prev);
      if (next.has(rarity)) {
        next.delete(rarity);
      } else {
        next.add(rarity);
      }
      return next;
    });
  }, []);

  // Clear all rarity selections (show all)
  const clearRarities = useCallback(() => setActiveRarities(new Set()), []);

  // Get the contract address for building token keys
  // NFT_COLLECTION_AVALANCHE is server-side only; hardcoded fallback for production
  const nftContractAddress = process.env.NFT_COLLECTION_AVALANCHE || '0x9ED98e159BE43a8d42b64053831FCAE5e4d7d271';

  // Get unique item classes for filter dropdown
  const itemClasses = useMemo(() => {
    const uniqueClasses = [...new Set(nfts.map(nft => getItemClass(nft)))];
    return uniqueClasses.sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });
  }, [nfts]);

  // Calculate portfolio summary: spent, estimated value, and P&L
  const portfolioSummary = useMemo(() => {
    let totalSpent = 0;
    let totalEstValue = 0;
    let itemsWithBothValues = 0;
    let spentForPnlCalc = 0;

    for (const nft of nfts) {
      const price = nft.purchasePriceGun || 0;
      const quantity = nft.quantity || 1;
      const floor = nft.floorPrice;

      totalSpent += price * quantity;

      if (floor !== undefined && floor > 0) {
        totalEstValue += floor * quantity;
      }

      if (price > 0 && floor !== undefined && floor > 0) {
        itemsWithBothValues += quantity;
        spentForPnlCalc += price * quantity;
      }
    }

    const unrealizedPnlGun = itemsWithBothValues > 0 ? totalEstValue - spentForPnlCalc : null;
    const unrealizedPnlPct = (itemsWithBothValues > 0 && spentForPnlCalc > 0)
      ? (unrealizedPnlGun! / spentForPnlCalc) * 100
      : null;

    return {
      totalSpent,
      totalEstValue,
      itemsWithBothValues,
      unrealizedPnlGun,
      unrealizedPnlPct,
    };
  }, [nfts]);

  // Filter NFTs by search and item class (before rarity filter, for counting)
  const preRarityFilteredNFTs = useMemo(() => {
    let result = [...nfts];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const mintSearchMatch = query.match(/^#?(\d+)$/);

      if (mintSearchMatch) {
        const searchedMintNum = parseInt(mintSearchMatch[1], 10);
        result = result.filter(nft => {
          const mintNumbers = nft.mintNumbers || (nft.mintNumber ? [nft.mintNumber] : []);
          return mintNumbers.some(mint => {
            const mintValue = parseInt(mint, 10);
            return !isNaN(mintValue) && mintValue === searchedMintNum;
          });
        });
      } else {
        result = result.filter(nft =>
          nft.name.toLowerCase().includes(query) ||
          nft.collection.toLowerCase().includes(query) ||
          nft.tokenId.toLowerCase().includes(query) ||
          matchesTraits(nft, query)
        );
      }
    }

    if (selectedItemClass !== 'all') {
      result = result.filter(nft => getItemClass(nft) === selectedItemClass);
    }

    return result;
  }, [nfts, searchQuery, selectedItemClass]);

  // Calculate rarity counts from pre-rarity-filtered NFTs (so counts are always visible)
  const rarityCounts = useMemo(() => {
    const counts = {
      Epic: 0,
      Rare: 0,
      Uncommon: 0,
      Common: 0,
    };
    for (const nft of preRarityFilteredNFTs) {
      const rarity = getRarityName(nft);
      if (rarity in counts) {
        counts[rarity as keyof typeof counts] += nft.quantity || 1;
      }
    }
    return counts;
  }, [preRarityFilteredNFTs]);

  // Apply rarity filter and sorting
  const filteredAndSortedNFTs = useMemo(() => {
    let result = [...preRarityFilteredNFTs];

    if (activeRarities.size > 0) {
      result = result.filter(nft => {
        const rarity = getRarityName(nft);
        return activeRarities.has(rarity as Rarity);
      });
    }

    if (activeRarities.size > 0) {
      result.sort((a, b) => {
        const rarityDiff = getRarityRank(a) - getRarityRank(b);
        if (rarityDiff !== 0) return rarityDiff;
        const mintA = getMintNumericValue(a.mintNumber);
        const mintB = getMintNumericValue(b.mintNumber);
        if (mintA !== mintB) return mintA - mintB;
        return (a.mintNumber || '').localeCompare(b.mintNumber || '');
      });
    } else {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'mint-asc': {
            const mintA = getMintNumericValue(a.mintNumber);
            const mintB = getMintNumericValue(b.mintNumber);
            if (mintA !== mintB) return mintA - mintB;
            return (a.mintNumber || '').localeCompare(b.mintNumber || '');
          }
          case 'mint-desc': {
            const aIsNumeric = isNumericMint(a.mintNumber);
            const bIsNumeric = isNumericMint(b.mintNumber);
            if (aIsNumeric && !bIsNumeric) return -1;
            if (!aIsNumeric && bIsNumeric) return 1;
            if (!aIsNumeric && !bIsNumeric) {
              return (a.mintNumber || '').localeCompare(b.mintNumber || '');
            }
            const mintA = parseInt(a.mintNumber || '0', 10);
            const mintB = parseInt(b.mintNumber || '0', 10);
            return mintB - mintA;
          }
          case 'quantity-desc':
            return (b.quantity || 1) - (a.quantity || 1);
          case 'value-desc': {
            const aVal = a.floorPrice ?? a.purchasePriceGun ?? -Infinity;
            const bVal = b.floorPrice ?? b.purchasePriceGun ?? -Infinity;
            if (aVal !== bVal) return bVal - aVal;
            return a.name.localeCompare(b.name);
          }
          case 'pnl-desc': {
            const getEffectivePnl = (nft: NFT): number => {
              if (!nft.purchasePriceGun || nft.purchasePriceGun <= 0) return -Infinity;
              if (nft.floorPrice !== undefined) {
                return ((nft.floorPrice - nft.purchasePriceGun) / nft.purchasePriceGun) * 100;
              }
              return 0;
            };
            const aPnl = getEffectivePnl(a);
            const bPnl = getEffectivePnl(b);
            if (aPnl !== bPnl) return bPnl - aPnl;
            const aVal = a.floorPrice ?? a.purchasePriceGun ?? 0;
            const bVal = b.floorPrice ?? b.purchasePriceGun ?? 0;
            return bVal - aVal;
          }
          case 'scarcity-asc': {
            const aListings = marketMap?.get(a.name)?.listingCount ?? Infinity;
            const bListings = marketMap?.get(b.name)?.listingCount ?? Infinity;
            if (aListings !== bListings) return aListings - bListings;
            return a.name.localeCompare(b.name);
          }
          case 'date-desc': {
            const aTime = a.purchaseDate ? new Date(a.purchaseDate).getTime() : 0;
            const bTime = b.purchaseDate ? new Date(b.purchaseDate).getTime() : 0;
            if (aTime !== bTime) return bTime - aTime;
            return a.name.localeCompare(b.name);
          }
          default:
            return 0;
        }
      });
    }

    return result;
  }, [preRarityFilteredNFTs, activeRarities, sortBy, marketMap]);

  // Event handlers
  const handleNFTClick = useCallback((nft: NFT) => {
    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
    const tokenKey = buildTokenKey(nft.chain, nftContractAddress, primaryTokenId);
    setSelectedTokenKeyString(tokenKey);
    setSelectedNFT(nft);
    setIsModalOpen(true);
  }, [nftContractAddress]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedNFT(null);
      setSelectedTokenKeyString(null);
    }, 300);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedItemClass('all');
    clearRarities();
    setSortBy('mint-asc');
  }, [clearRarities]);

  const hasActiveFilters = !!(searchQuery || selectedItemClass !== 'all' || activeRarities.size > 0 || sortBy !== 'mint-asc');

  return {
    // Filter state + setters
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    selectedItemClass, setSelectedItemClass,
    activeRarities, toggleRarity, clearRarities,
    viewMode, setViewMode,
    // Modal state
    selectedNFT, selectedTokenKeyString, isModalOpen,
    handleNFTClick, handleCloseModal,
    // Derived data
    itemClasses,
    portfolioSummary,
    rarityCounts,
    filteredAndSortedNFTs,
    // Actions
    clearFilters,
    hasActiveFilters,
  };
}
