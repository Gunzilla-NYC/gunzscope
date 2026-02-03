'use client';

import { NFT, NFTPaginationInfo } from '@/lib/types';
import Image from 'next/image';
import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { buildTokenKey } from '@/lib/utils/nftCache';
import { getSpecificItemType } from '@/lib/nft/itemTypeUtils';

// Dynamic import for NFTDetailModal - only loaded when user clicks an NFT
// This reduces initial bundle size as the modal has heavy dependencies
const NFTDetailModal = dynamic(() => import('./NFTDetailModal'), {
  ssr: false,
  loading: () => null, // Modal is hidden by default, no loading UI needed
});

type SortOption = 'name-asc' | 'name-desc' | 'mint-asc' | 'mint-desc' | 'quantity-desc' | 'value-desc' | 'pnl-desc';
type ViewMode = 'small' | 'medium' | 'list';
type Rarity = 'Epic' | 'Rare' | 'Uncommon' | 'Common';

interface NFTGalleryProps {
  nfts: NFT[];
  chain: string;
  walletAddress?: string;
  paginationInfo?: NFTPaginationInfo;
  onLoadMore?: () => void;
  /** True when background enrichment is fetching P&L data */
  isEnriching?: boolean;
}

// Rarity color mapping (only actual in-game rarities)
const RARITY_COLORS: Record<string, string> = {
  Epic: '#cc44ff',      // Purple
  Rare: '#4488ff',      // Blue
  Uncommon: '#44ff44',  // Green
  Common: '#888888',    // Gray
};

// Rarity display order when filters are active (Epic → Rare → Uncommon → Common)
const RARITY_ORDER: Rarity[] = ['Epic', 'Rare', 'Uncommon', 'Common'];

// Rarity color from NFT traits (matches NFTDetailModal colors)
function getRarityColor(nft: NFT): string {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  return RARITY_COLORS[rarity] || '#888888';
}

// Rarity color from rarity string (for filter tag)
function getRarityColorByName(rarity: string): string {
  return RARITY_COLORS[rarity] || '#888888';
}

// Get rarity rank for sorting (lower = rarer)
function getRarityRank(nft: NFT): number {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  switch (rarity) {
    case 'Epic':
      return 1;
    case 'Rare':
      return 2;
    case 'Uncommon':
      return 3;
    case 'Common':
      return 4;
    default:
      return 5; // Unknown rarity goes last
  }
}

// Get rarity name from NFT
function getRarityName(nft: NFT): string {
  return nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || 'Unknown';
}

// Get item class from NFT (e.g., "Weapon", "Weapon Skin", etc.)
function getItemClass(nft: NFT): string {
  // Check CLASS first as that's the actual trait name in the data
  return nft.traits?.['CLASS'] || nft.traits?.['Class'] || nft.traits?.['ITEM_CLASS'] || nft.traits?.['Item Class'] || 'Unknown';
}

// Display-friendly labels for item classes (pluralized for dropdown)
function getItemClassDisplayName(itemClass: string): string {
  const displayNames: Record<string, string> = {
    // Exact matches from trait values
    'Weapon': 'Weapons',
    'Weapon Skin': 'Weapon Skins',
    'Character': 'Characters',
    'Character Skin': 'Character Skins',
    'Vehicle': 'Vehicles',
    'Vehicle Skin': 'Vehicle Skins',
    'Accessory': 'Accessories',
    'Emote': 'Emotes',
    'Banner': 'Banners',
    'Spray': 'Sprays',
    'Charm': 'Charms',
    'LMG': 'LMGs',
    'SMG': 'SMGs',
    'AR': 'ARs',
    'Shotgun': 'Shotguns',
    'Pistol': 'Pistols',
    'Sniper': 'Snipers',
  };
  return displayNames[itemClass] || itemClass;
}

// Regex for pure numeric strings - hoisted for performance
const NUMERIC_ONLY_RE = /^\d+$/;

// Strip leading zeros from mint number string
function stripLeadingZeros(mint: string): string {
  // Check if mint is purely numeric (possibly with leading zeros)
  if (NUMERIC_ONLY_RE.test(mint)) {
    return String(parseInt(mint, 10));
  }
  // For alphanumeric mints, return as-is
  return mint;
}

// Check if mint number is purely numeric
function isNumericMint(mint: string | undefined): boolean {
  if (!mint) return false;
  return NUMERIC_ONLY_RE.test(mint);
}

// Get numeric value from mint (returns Infinity for non-numeric)
function getMintNumericValue(mint: string | undefined): number {
  if (!mint) return Infinity;
  if (isNumericMint(mint)) {
    return parseInt(mint, 10);
  }
  return Infinity; // Alphanumeric mints sort after all numeric mints
}

// Format mint numbers for display (up to 3, then "more...")
function formatMintNumbers(nft: NFT): { display: string; hasMore: boolean } {
  const mintNumbers = nft.mintNumbers || (nft.mintNumber ? [nft.mintNumber] : []);
  if (mintNumbers.length === 0) {
    return { display: `#${nft.tokenId.slice(0, 8)}`, hasMore: false };
  }
  if (mintNumbers.length === 1) {
    return { display: `#${stripLeadingZeros(mintNumbers[0])}`, hasMore: false };
  }
  // Multiple mints - show up to 3, strip leading zeros from each
  const displayed = mintNumbers.slice(0, 3).map(m => `#${stripLeadingZeros(m)}`).join(', ');
  const hasMore = mintNumbers.length > 3;
  return { display: displayed, hasMore };
}

// Shorten collection names for dropdown display - kept for future use
// function getCollectionDisplayName(collection: string): string {
//   if (collection === 'Off The Grid NFT Collection') return 'Off The Grid';
//   return collection;
// }

export default function NFTGallery({ nfts, chain: _chain, walletAddress, paginationInfo, onLoadMore, isEnriching = false }: NFTGalleryProps) {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [selectedTokenKeyString, setSelectedTokenKeyString] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    // Sort alphabetically, keeping 'Unknown' at the end if present
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
    let spentForPnlCalc = 0; // Only from items that have both purchase price and floor

    for (const nft of nfts) {
      const price = nft.purchasePriceGun || 0;
      const quantity = nft.quantity || 1;
      const floor = nft.floorPrice;

      // Always add to total spent
      totalSpent += price * quantity;

      // Add to estimated value if floor price available
      if (floor !== undefined && floor > 0) {
        totalEstValue += floor * quantity;
      }

      // Track items with both values for accurate P&L calculation
      if (price > 0 && floor !== undefined && floor > 0) {
        itemsWithBothValues += quantity;
        spentForPnlCalc += price * quantity;
      }
    }

    // Calculate unrealized P&L only if we have items with both values
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


  // Helper function to check if any trait matches the query
  const matchesTraits = (nft: NFT, query: string): boolean => {
    if (!nft.traits) return false;

    // Check each trait value
    for (const [traitType, traitValue] of Object.entries(nft.traits)) {
      if (traitValue && traitValue.toLowerCase() !== 'none') {
        // Match against trait value (e.g., "weapon", "pants", "legendary")
        if (traitValue.toLowerCase().includes(query)) {
          return true;
        }
        // Also match against trait type (e.g., "RARITY", "WEAPON_TYPE")
        if (traitType.toLowerCase().includes(query)) {
          return true;
        }
      }
    }
    return false;
  };

  // Filter NFTs by search and item class (before rarity filter, for counting)
  const preRarityFilteredNFTs = useMemo(() => {
    let result = [...nfts];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();

      // Check if query is a mint number search (just digits, or # followed by digits)
      const mintSearchMatch = query.match(/^#?(\d+)$/);

      if (mintSearchMatch) {
        // Exact mint number search - match the numeric value exactly
        const searchedMintNum = parseInt(mintSearchMatch[1], 10);
        result = result.filter(nft => {
          // Check all mint numbers for this NFT (could be grouped)
          const mintNumbers = nft.mintNumbers || (nft.mintNumber ? [nft.mintNumber] : []);
          return mintNumbers.some(mint => {
            const mintValue = parseInt(mint, 10);
            return !isNaN(mintValue) && mintValue === searchedMintNum;
          });
        });
      } else {
        // Text search - search by name, collection, traits, etc.
        result = result.filter(nft =>
          nft.name.toLowerCase().includes(query) ||
          nft.collection.toLowerCase().includes(query) ||
          nft.tokenId.toLowerCase().includes(query) ||
          matchesTraits(nft, query)
        );
      }
    }

    // Item class filter (Collections dropdown)
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

    // Apply rarity filter (multi-select: union of selected rarities)
    // If no rarities selected, show all (no filtering)
    if (activeRarities.size > 0) {
      result = result.filter(nft => {
        const rarity = getRarityName(nft);
        return activeRarities.has(rarity as Rarity);
      });
    }

    // Apply sorting
    // When rarity filters are active, group by rarity order (Epic → Rare → Uncommon → Common),
    // then sort by mint number ascending within each group
    if (activeRarities.size > 0) {
      result.sort((a, b) => {
        // Primary sort: by rarity rank (lower = rarer)
        const rarityDiff = getRarityRank(a) - getRarityRank(b);
        if (rarityDiff !== 0) return rarityDiff;
        // Secondary sort: mint number low to high
        const mintA = getMintNumericValue(a.mintNumber);
        const mintB = getMintNumericValue(b.mintNumber);
        if (mintA !== mintB) return mintA - mintB;
        return (a.mintNumber || '').localeCompare(b.mintNumber || '');
      });
    } else {
      // No rarity filters active - use sortBy dropdown
      result.sort((a, b) => {
        switch (sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'mint-asc': {
            // Numeric mints first (low to high), then alphanumeric mints
            const mintA = getMintNumericValue(a.mintNumber);
            const mintB = getMintNumericValue(b.mintNumber);
            if (mintA !== mintB) return mintA - mintB;
            // Both are alphanumeric or same numeric, sort by string
            return (a.mintNumber || '').localeCompare(b.mintNumber || '');
          }
          case 'mint-desc': {
            // Alphanumeric mints first (they're "low"), then numeric mints (high to low)
            const aIsNumeric = isNumericMint(a.mintNumber);
            const bIsNumeric = isNumericMint(b.mintNumber);
            if (aIsNumeric && !bIsNumeric) return -1; // Numeric comes before alphanumeric in desc
            if (!aIsNumeric && bIsNumeric) return 1;
            if (!aIsNumeric && !bIsNumeric) {
              // Both alphanumeric - sort alphabetically
              return (a.mintNumber || '').localeCompare(b.mintNumber || '');
            }
            // Both numeric - high to low
            const mintA = parseInt(a.mintNumber || '0', 10);
            const mintB = parseInt(b.mintNumber || '0', 10);
            return mintB - mintA;
          }
          case 'quantity-desc':
            return (b.quantity || 1) - (a.quantity || 1);
          case 'value-desc': {
            // Sort by value descending: prefer floorPrice, fall back to cost basis
            // NFTs without any value data go last
            const aVal = a.floorPrice ?? a.purchasePriceGun ?? -Infinity;
            const bVal = b.floorPrice ?? b.purchasePriceGun ?? -Infinity;
            if (aVal !== bVal) return bVal - aVal;
            // Secondary sort by name for stability
            return a.name.localeCompare(b.name);
          }
          case 'pnl-desc': {
            // Sort by unrealized P&L % descending
            // If floor price available: (floor - cost) / cost * 100
            // If no floor price: use 0% (break even assumption) to still show NFTs with cost data
            // NFTs missing cost data go last
            const getEffectivePnl = (nft: NFT): number => {
              if (!nft.purchasePriceGun || nft.purchasePriceGun <= 0) return -Infinity;
              if (nft.floorPrice !== undefined) {
                return ((nft.floorPrice - nft.purchasePriceGun) / nft.purchasePriceGun) * 100;
              }
              // No floor price but has cost basis - assume 0% for now
              return 0;
            };
            const aPnl = getEffectivePnl(a);
            const bPnl = getEffectivePnl(b);
            if (aPnl !== bPnl) return bPnl - aPnl;
            // Secondary sort by value for NFTs with same P&L
            const aVal = a.floorPrice ?? a.purchasePriceGun ?? 0;
            const bVal = b.floorPrice ?? b.purchasePriceGun ?? 0;
            return bVal - aVal;
          }
          default:
            return 0;
        }
      });
    }

    return result;
  }, [preRarityFilteredNFTs, activeRarities, sortBy]);

  const handleNFTClick = (nft: NFT) => {
    // Build unique token key for modal keying
    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
    const tokenKey = buildTokenKey(nft.chain, nftContractAddress, primaryTokenId);
    setSelectedTokenKeyString(tokenKey);
    setSelectedNFT(nft);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Clear selection after animation completes
    setTimeout(() => {
      setSelectedNFT(null);
      setSelectedTokenKeyString(null);
    }, 300);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedItemClass('all');
    clearRarities();
    setSortBy('mint-asc');
  };

  const hasActiveFilters = searchQuery || selectedItemClass !== 'all' || activeRarities.size > 0 || sortBy !== 'mint-asc';

  if (nfts.length === 0) {
    return (
      <div className="bg-[var(--gs-dark-3)] p-6 rounded-lg border border-white/[0.06]">
        <h3 className="font-display text-lg font-semibold mb-2 text-[var(--gs-white)]">
          Off The Grid Game Assets
        </h3>
        <p className="font-body text-[var(--gs-gray-4)]">No game assets found</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--gs-dark-3)] p-6 rounded-lg border border-white/[0.06]">
      {/* Header with Title */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-[var(--gs-white)]">
            Off The Grid Game Assets
          </h3>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="font-mono text-xs text-[var(--gs-lime)] hover:text-[var(--gs-purple)] transition"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Always-visible Search Bar */}
        <div className="relative">
          <label htmlFor="nft-search" className="sr-only">Search NFTs</label>
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--gs-gray-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="nft-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, mint #, traits (weapon, pants, legendary)..."
            className="font-body w-full pl-10 pr-4 py-3 text-sm bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg text-[var(--gs-white)] placeholder-[var(--gs-gray-3)] focus:outline-none focus:border-[var(--gs-lime)] focus:ring-1 focus:ring-[var(--gs-lime)] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Collections Filter (Item Class) */}
          {itemClasses.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="font-mono text-xs text-[var(--gs-gray-4)]">Collections:</label>
              <select
                value={selectedItemClass}
                onChange={(e) => setSelectedItemClass(e.target.value)}
                className="select-dropdown font-body pl-3 pr-8 py-1.5 text-sm bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg text-[var(--gs-white)] focus:outline-none focus:border-[var(--gs-lime)] transition cursor-pointer"
              >
                <option value="all">All ({nfts.reduce((sum, nft) => sum + (nft.quantity || 1), 0)})</option>
                {itemClasses.map(itemClass => {
                  const count = nfts
                    .filter(nft => getItemClass(nft) === itemClass)
                    .reduce((sum, nft) => sum + (nft.quantity || 1), 0);
                  return (
                    <option key={itemClass} value={itemClass}>
                      {getItemClassDisplayName(itemClass)} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs text-[var(--gs-gray-4)]">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="select-dropdown font-body pl-3 pr-8 py-1.5 text-sm bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg text-[var(--gs-white)] focus:outline-none focus:border-[var(--gs-lime)] transition cursor-pointer"
            >
              <option value="mint-asc">Mint # (Low-High)</option>
              <option value="mint-desc">Mint # (High-Low)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="quantity-desc">Quantity</option>
              <option value="value-desc">Value (High-Low)</option>
              <option value="pnl-desc">P&L % (Best-Worst)</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <label className="font-mono text-xs text-[var(--gs-gray-4)] mr-1">View:</label>
            {/* Small Grid */}
            <button
              onClick={() => setViewMode('small')}
              aria-pressed={viewMode === 'small'}
              aria-label="Small grid view"
              className={`p-1.5 rounded transition-all duration-150 ${
                viewMode === 'small'
                  ? 'bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] border border-[var(--gs-lime)]/50 scale-105'
                  : 'text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:bg-white/10 border border-transparent'
              }`}
              title="Small grid"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V4zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM3 9a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V9zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V9zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1V9zM3 14a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1v-2zm5 0a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2z" />
              </svg>
            </button>
            {/* Medium Grid */}
            <button
              onClick={() => setViewMode('medium')}
              aria-pressed={viewMode === 'medium'}
              aria-label="Medium grid view"
              className={`p-1.5 rounded transition-all duration-150 ${
                viewMode === 'medium'
                  ? 'bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] border border-[var(--gs-lime)]/50 scale-105'
                  : 'text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:bg-white/10 border border-transparent'
              }`}
              title="Medium grid"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 3a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V3zM3 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm8 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            </button>
            {/* List View */}
            <button
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              className={`p-1.5 rounded transition-all duration-150 ${
                viewMode === 'list'
                  ? 'bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] border border-[var(--gs-lime)]/50 scale-105'
                  : 'text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:bg-white/10 border border-transparent'
              }`}
              title="List view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Active Filter Tags */}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] text-xs rounded-full border border-[var(--gs-lime)]/30 font-mono">
              &quot;{searchQuery.length > 15 ? searchQuery.slice(0, 15) + '...' : searchQuery}&quot;
              <button onClick={() => setSearchQuery('')} className="hover:text-[var(--gs-white)] ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {selectedItemClass !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--gs-purple)]/20 text-[var(--gs-purple)] text-xs rounded-full border border-[var(--gs-purple)]/30 font-mono">
              {getItemClassDisplayName(selectedItemClass)}
              <button onClick={() => setSelectedItemClass('all')} className="hover:text-[var(--gs-white)] ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {Array.from(activeRarities).map(rarity => (
            <span
              key={rarity}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border font-mono"
              style={{
                backgroundColor: `${getRarityColorByName(rarity)}20`,
                color: getRarityColorByName(rarity),
                borderColor: `${getRarityColorByName(rarity)}50`,
              }}
            >
              {rarity}
              <button onClick={() => toggleRarity(rarity)} className="hover:text-[var(--gs-white)] ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>

        {/* Rarity Filter Pills (multi-select) */}
        <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono uppercase tracking-wide">
          <span className="text-[var(--gs-gray-3)] normal-case tracking-normal">Rarity:</span>
          {/* All pill - active when no rarities selected */}
          <button
            onClick={clearRarities}
            aria-pressed={activeRarities.size === 0}
            className={`px-2 py-1 rounded-sm border transition-all ${
              activeRarities.size === 0
                ? 'bg-white/15 border-white/30 text-[var(--gs-white)]'
                : 'bg-transparent border-white/10 text-[var(--gs-gray-4)] hover:border-white/20'
            }`}
          >
            All
          </button>
          {rarityCounts.Epic > 0 && (
            <button
              onClick={() => toggleRarity('Epic')}
              aria-pressed={activeRarities.has('Epic')}
              className="px-2 py-1 rounded-sm border transition-all"
              style={{
                backgroundColor: activeRarities.has('Epic') ? 'rgba(204,68,255,0.2)' : 'rgba(204,68,255,0.08)',
                borderColor: activeRarities.has('Epic') ? 'rgba(204,68,255,0.5)' : 'rgba(204,68,255,0.25)',
                color: '#cc44ff',
              }}
            >
              Epic: {rarityCounts.Epic}
            </button>
          )}
          {rarityCounts.Rare > 0 && (
            <button
              onClick={() => toggleRarity('Rare')}
              aria-pressed={activeRarities.has('Rare')}
              className="px-2 py-1 rounded-sm border transition-all"
              style={{
                backgroundColor: activeRarities.has('Rare') ? 'rgba(68,136,255,0.2)' : 'rgba(68,136,255,0.08)',
                borderColor: activeRarities.has('Rare') ? 'rgba(68,136,255,0.5)' : 'rgba(68,136,255,0.25)',
                color: '#4488ff',
              }}
            >
              Rare: {rarityCounts.Rare}
            </button>
          )}
          {rarityCounts.Uncommon > 0 && (
            <button
              onClick={() => toggleRarity('Uncommon')}
              aria-pressed={activeRarities.has('Uncommon')}
              className="px-2 py-1 rounded-sm border transition-all"
              style={{
                backgroundColor: activeRarities.has('Uncommon') ? 'rgba(68,255,68,0.2)' : 'rgba(68,255,68,0.08)',
                borderColor: activeRarities.has('Uncommon') ? 'rgba(68,255,68,0.5)' : 'rgba(68,255,68,0.25)',
                color: '#44ff44',
              }}
            >
              Uncommon: {rarityCounts.Uncommon}
            </button>
          )}
          {rarityCounts.Common > 0 && (
            <button
              onClick={() => toggleRarity('Common')}
              aria-pressed={activeRarities.has('Common')}
              className="px-2 py-1 rounded-sm border transition-all"
              style={{
                backgroundColor: activeRarities.has('Common') ? 'rgba(136,136,136,0.2)' : 'rgba(136,136,136,0.08)',
                borderColor: activeRarities.has('Common') ? 'rgba(136,136,136,0.5)' : 'rgba(136,136,136,0.25)',
                color: '#888888',
              }}
            >
              Common: {rarityCounts.Common}
            </button>
          )}
        </div>
      </div>

      {/* No Results Message */}
      {filteredAndSortedNFTs.length === 0 && nfts.length > 0 && (
        <div className="text-center py-12 text-[var(--gs-gray-4)]">
          <svg className="w-16 h-16 mx-auto mb-4 text-[var(--gs-gray-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="font-display text-lg mb-2">No NFTs match your search</p>
          <p className="font-body text-sm text-[var(--gs-gray-3)] mb-4">Try adjusting your filters or search terms</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] rounded-lg hover:bg-[var(--gs-lime)]/30 transition border border-[var(--gs-lime)]/30 font-body"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Grid Views (Small & Medium) */}
      {viewMode !== 'list' && (
        <div className={`grid gap-4 ${
          viewMode === 'small'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {filteredAndSortedNFTs.map((nft) => {
            const rarityName = getRarityName(nft);
            const rarityColor = getRarityColor(nft);
            const itemClass = getItemClass(nft);
            const { display: mintDisplay } = formatMintNumbers(nft);
            const nameInitials = nft.name.split(' ').map(w => w[0]).join('').slice(0, 2);

            // Calculate P&L
            const hasPnL = nft.purchasePriceGun !== undefined && nft.purchasePriceGun > 0 && nft.floorPrice !== undefined;
            const pnlPct = hasPnL ? ((nft.floorPrice! - nft.purchasePriceGun!) / nft.purchasePriceGun!) * 100 : null;
            const isProfit = pnlPct !== null && pnlPct > 1;
            const isLoss = pnlPct !== null && pnlPct < -1;

            // Price display
            const priceGun = nft.floorPrice ?? nft.purchasePriceGun;
            const priceDisplay = priceGun !== undefined ? `${priceGun.toLocaleString()} GUN` : '— GUN';

            // P&L display - show percentage if calculable, otherwise "—"
            const pnlDisplay = pnlPct !== null
              ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%`
              : '—';

            return (
              <div
                key={`${nft.chain}-${nft.tokenId}`}
                className="group bg-[var(--gs-dark-3)] border p-3 transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg"
                style={{ borderColor: `${rarityColor}20` }}
                onClick={() => handleNFTClick(nft)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${rarityColor}60`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${rarityColor}20`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${rarityColor}20`;
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Image Container */}
                <div className="aspect-square relative bg-[var(--gs-dark-4)] mb-2 overflow-hidden">
                  {/* Rarity Badge - Top Left */}
                  <span
                    className="absolute top-1.5 left-1.5 z-10 font-mono text-[8px] tracking-wide uppercase px-1.5 py-0.5 rounded-sm border"
                    style={{
                      backgroundColor: `${rarityColor}15`,
                      color: rarityColor,
                      borderColor: `${rarityColor}30`,
                    }}
                  >
                    {rarityName === 'Unknown' ? 'N/A' : rarityName}
                  </span>

                  {/* Quantity Badge - Top Right */}
                  {nft.quantity && nft.quantity > 1 && (
                    <span className="absolute top-1.5 right-1.5 z-10 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-[var(--gs-purple)] text-black">
                      ×{nft.quantity}
                    </span>
                  )}

                  {/* Image or Placeholder */}
                  {nft.image ? (
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      loading="lazy"
                      sizes={viewMode === 'small' ? '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display text-3xl font-bold text-[var(--gs-gray-1)] group-hover:text-[var(--gs-gray-2)] transition-colors">
                        {nameInitials}
                      </span>
                    </div>
                  )}
                </div>

                {/* Name */}
                <p
                  className={`font-display font-semibold uppercase tracking-wide text-[var(--gs-white)] truncate mb-0.5 ${
                    viewMode === 'small' ? 'text-[11px]' : 'text-xs'
                  }`}
                  title={nft.name}
                >
                  {nft.name}
                </p>

                {/* Item Type - Uses specific weapon type from typeSpec */}
                <p className={`font-mono uppercase tracking-wide text-[var(--gs-gray-3)] truncate ${
                  viewMode === 'small' ? 'text-[8px]' : 'text-[9px]'
                }`}>
                  {getSpecificItemType(nft) || nft.collection}
                </p>

                {/* Footer with Price & P&L */}
                <div className={`flex justify-between items-baseline border-t border-white/[0.06] ${
                  viewMode === 'small' ? 'pt-2 mt-2' : 'pt-2.5 mt-2.5'
                }`}>
                  <span className={`font-mono text-[var(--gs-white)] ${
                    viewMode === 'small' ? 'text-[10px]' : 'text-[11px]'
                  }`}>
                    {priceDisplay}
                  </span>
                  {/* P&L: Show shimmer if enriching and no data yet */}
                  {isEnriching && pnlPct === null ? (
                    <span className={`skeleton-stat ${viewMode === 'small' ? 'w-8 h-3' : 'w-10 h-3.5'}`} />
                  ) : (
                    <span className={`font-mono ${
                      viewMode === 'small' ? 'text-[9px]' : 'text-[10px]'
                    } ${
                      isProfit ? 'text-[var(--gs-profit)]' :
                      isLoss ? 'text-[var(--gs-loss)]' :
                      'text-[var(--gs-gray-3)]'
                    }`}>
                      {pnlDisplay}
                    </span>
                  )}
                </div>

                {/* Mint Number - Bottom subtle */}
                <p
                  className={`font-mono truncate mt-1 ${
                    viewMode === 'small' ? 'text-[8px]' : 'text-[9px]'
                  }`}
                  style={{ color: `${rarityColor}99` }}
                  title={mintDisplay}
                >
                  {mintDisplay}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {filteredAndSortedNFTs.map((nft) => {
            const rarityName = getRarityName(nft);
            const rarityColor = getRarityColor(nft);
            const itemClass = getItemClass(nft);
            const { display: mintDisplay } = formatMintNumbers(nft);
            const nameInitials = nft.name.split(' ').map(w => w[0]).join('').slice(0, 2);

            // Calculate P&L
            const hasPnL = nft.purchasePriceGun !== undefined && nft.purchasePriceGun > 0 && nft.floorPrice !== undefined;
            const pnlPct = hasPnL ? ((nft.floorPrice! - nft.purchasePriceGun!) / nft.purchasePriceGun!) * 100 : null;
            const isProfit = pnlPct !== null && pnlPct > 1;
            const isLoss = pnlPct !== null && pnlPct < -1;
            const priceGun = nft.floorPrice ?? nft.purchasePriceGun;

            return (
              <div
                key={`${nft.chain}-${nft.tokenId}`}
                className="group bg-[var(--gs-dark-3)] border overflow-hidden transition-all duration-200 cursor-pointer flex items-center gap-4 p-3 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderColor: `${rarityColor}20` }}
                onClick={() => handleNFTClick(nft)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${rarityColor}60`;
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${rarityColor}15`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = `${rarityColor}20`;
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 flex-shrink-0 relative bg-[var(--gs-dark-4)] overflow-hidden">
                  {/* Rarity Badge */}
                  <span
                    className="absolute top-0.5 left-0.5 z-10 font-mono text-[6px] tracking-wide uppercase px-1 py-0.5 rounded-sm"
                    style={{
                      backgroundColor: `${rarityColor}20`,
                      color: rarityColor,
                    }}
                  >
                    {rarityName === 'Unknown' ? '—' : rarityName.slice(0, 4)}
                  </span>

                  {nft.image ? (
                    <Image
                      src={nft.image}
                      alt={nft.name}
                      fill
                      className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      loading="lazy"
                      sizes="56px"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display text-lg font-bold text-[var(--gs-gray-1)]">
                        {nameInitials}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <p className="font-display font-semibold text-xs uppercase tracking-wide text-[var(--gs-white)] truncate" title={nft.name}>
                    {nft.name}
                  </p>
                  <p className="font-mono text-[9px] uppercase tracking-wide text-[var(--gs-gray-3)] truncate">
                    {getSpecificItemType(nft) || nft.collection}
                  </p>
                </div>

                {/* Mint Number */}
                <div className="flex-shrink-0 text-right hidden sm:block">
                  <p className="font-mono text-[9px] text-[var(--gs-gray-4)] uppercase">Mint</p>
                  <p className="font-mono text-[10px] font-medium" style={{ color: rarityColor }}>
                    {mintDisplay}
                  </p>
                </div>

                {/* Quantity */}
                {nft.quantity && nft.quantity > 1 && (
                  <div className="flex-shrink-0 text-right hidden md:block">
                    <p className="font-mono text-[9px] text-[var(--gs-gray-4)] uppercase">Qty</p>
                    <p className="font-mono text-[10px] text-[var(--gs-purple)] font-bold">
                      ×{nft.quantity}
                    </p>
                  </div>
                )}

                {/* Price */}
                <div className="flex-shrink-0 text-right hidden lg:block min-w-[80px]">
                  <p className="font-mono text-[9px] text-[var(--gs-gray-4)] uppercase">Price</p>
                  <p className="font-mono text-[10px] text-[var(--gs-white)] font-medium">
                    {priceGun !== undefined ? `${priceGun.toLocaleString()} GUN` : '—'}
                  </p>
                </div>

                {/* P&L */}
                <div className="flex-shrink-0 text-right min-w-[50px]">
                  <p className="font-mono text-[9px] text-[var(--gs-gray-4)] uppercase">P&L</p>
                  {isEnriching && pnlPct === null ? (
                    <span className="skeleton-stat w-10 h-3.5 mt-0.5" />
                  ) : (
                    <p className={`font-mono text-[10px] font-medium ${
                      isProfit ? 'text-[var(--gs-profit)]' :
                      isLoss ? 'text-[var(--gs-loss)]' :
                      'text-[var(--gs-gray-3)]'
                    }`}>
                      {pnlPct !== null ? `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}%` : '—'}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-[var(--gs-gray-3)] group-hover:text-[var(--gs-lime)] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button and Pagination Info */}
      {paginationInfo && (
        <div className="mt-6 flex flex-col items-center gap-3">
          {/* Pagination Debug Info - only visible in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="font-mono text-xs text-[var(--gs-gray-3)] flex flex-wrap justify-center gap-x-4 gap-y-1">
              <span>
                <span className="text-[var(--gs-gray-4)]">totalOwnedCount:</span>{' '}
                <span className="text-[var(--gs-lime)]">{paginationInfo.totalOwnedCount}</span>
              </span>
              <span>
                <span className="text-[var(--gs-gray-4)]">fetchedCount:</span>{' '}
                <span className="text-[var(--gs-lime)]">{paginationInfo.fetchedCount}</span>
              </span>
              <span>
                <span className="text-[var(--gs-gray-4)]">pageSize:</span>{' '}
                <span className="text-[var(--gs-gray-4)]">{paginationInfo.pageSize}</span>
              </span>
              <span>
                <span className="text-[var(--gs-gray-4)]">pagesLoaded:</span>{' '}
                <span className="text-[var(--gs-gray-4)]">{paginationInfo.pagesLoaded}</span>
              </span>
            </div>
          )}

          {/* Load More Button */}
          {paginationInfo.hasMore && onLoadMore && (
            <button
              onClick={onLoadMore}
              disabled={paginationInfo.isLoadingMore}
              className="font-body px-6 py-3 bg-gradient-to-r from-[var(--gs-lime)]/20 to-[var(--gs-purple)]/20 text-[var(--gs-lime)] font-medium rounded-lg border border-[var(--gs-lime)]/30 hover:border-[var(--gs-lime)]/60 hover:from-[var(--gs-lime)]/30 hover:to-[var(--gs-purple)]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {paginationInfo.isLoadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-[var(--gs-lime)]/30 border-t-[var(--gs-lime)] rounded-full animate-spin"></div>
                  Loading...
                </>
              ) : (
                <>
                  Load More NFTs
                  <span className="font-mono text-xs text-[var(--gs-lime)]/70">
                    ({paginationInfo.totalOwnedCount - paginationInfo.fetchedCount} remaining)
                  </span>
                </>
              )}
            </button>
          )}

          {/* All Loaded Message */}
          {!paginationInfo.hasMore && paginationInfo.totalOwnedCount > 0 && (
            <p className="font-mono text-xs text-[var(--gs-gray-3)]">
              All {paginationInfo.totalOwnedCount} NFTs loaded
            </p>
          )}
        </div>
      )}

      {/* NFT Detail Modal - keyed by tokenKeyString to force remount on NFT change */}
      <NFTDetailModal
        key={selectedTokenKeyString || 'no-selection'}
        nft={selectedNFT}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        walletAddress={walletAddress}
        allNfts={nfts}
      />
    </div>
  );
}
