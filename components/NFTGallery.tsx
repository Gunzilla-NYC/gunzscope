'use client';

import { NFT, NFTPaginationInfo } from '@/lib/types';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import NFTDetailModal from './NFTDetailModal';
import { buildTokenKey } from '@/lib/utils/nftCache';

type SortOption = 'name-asc' | 'name-desc' | 'mint-asc' | 'mint-desc' | 'floor-asc' | 'floor-desc' | 'quantity-desc' | 'rarity-high' | 'rarity-low';
type ViewMode = 'small' | 'medium' | 'list';

interface NFTGalleryProps {
  nfts: NFT[];
  chain: string;
  walletAddress?: string;
  paginationInfo?: NFTPaginationInfo;
  onLoadMore?: () => void;
}

// Rarity color mapping based on NFT traits (matches NFTDetailModal colors)
function getRarityColor(nft: NFT): string {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  switch (rarity) {
    case 'Mythic':
      return '#ff44ff'; // Bright magenta
    case 'Legendary':
      return '#ff8800'; // Orange
    case 'Epic':
      return '#cc44ff'; // Purple
    case 'Rare':
      return '#4488ff'; // Blue
    case 'Uncommon':
      return '#44ff44'; // Green
    case 'Common':
    default:
      return '#888888'; // Gray
  }
}

// Get rarity rank for sorting (lower = rarer)
function getRarityRank(nft: NFT): number {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  switch (rarity) {
    case 'Mythic':
      return 1;
    case 'Legendary':
      return 2;
    case 'Epic':
      return 3;
    case 'Rare':
      return 4;
    case 'Uncommon':
      return 5;
    case 'Common':
      return 6;
    default:
      return 7; // Unknown rarity goes last
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

// Strip leading zeros from mint number string
function stripLeadingZeros(mint: string): string {
  // Check if mint is purely numeric (possibly with leading zeros)
  if (/^\d+$/.test(mint)) {
    return String(parseInt(mint, 10));
  }
  // For alphanumeric mints, return as-is
  return mint;
}

// Check if mint number is purely numeric
function isNumericMint(mint: string | undefined): boolean {
  if (!mint) return false;
  return /^\d+$/.test(mint);
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

export default function NFTGallery({ nfts, chain: _chain, walletAddress, paginationInfo, onLoadMore }: NFTGalleryProps) {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [selectedTokenKeyString, setSelectedTokenKeyString] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [selectedItemClass, setSelectedItemClass] = useState<string>('all');
  // Default view: small grid if >16 NFTs, medium grid if <=16
  const [viewMode, setViewMode] = useState<ViewMode>(() => nfts.length > 16 ? 'small' : 'medium');

  // Get the contract address for building token keys
  const nftContractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '';

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

  // Calculate total GUN spent on all NFTs
  const totalGunSpent = useMemo(() => {
    return nfts.reduce((total, nft) => {
      const price = nft.purchasePriceGun || 0;
      const quantity = nft.quantity || 1;
      return total + (price * quantity);
    }, 0);
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

  // Filter and sort NFTs
  const filteredAndSortedNFTs = useMemo(() => {
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

    // Apply sorting
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
        case 'floor-asc':
          return (a.floorPrice || 0) - (b.floorPrice || 0);
        case 'floor-desc':
          return (b.floorPrice || 0) - (a.floorPrice || 0);
        case 'quantity-desc':
          return (b.quantity || 1) - (a.quantity || 1);
        case 'rarity-high': {
          // Lower rank = rarer, so ascending order gives high-to-low rarity
          const rarityDiff = getRarityRank(a) - getRarityRank(b);
          if (rarityDiff !== 0) return rarityDiff;
          // Secondary sort: mint number low to high
          const mintA = getMintNumericValue(a.mintNumber);
          const mintB = getMintNumericValue(b.mintNumber);
          if (mintA !== mintB) return mintA - mintB;
          return (a.mintNumber || '').localeCompare(b.mintNumber || '');
        }
        case 'rarity-low': {
          // Higher rank = more common, so descending order gives low-to-high rarity
          const rarityDiff = getRarityRank(b) - getRarityRank(a);
          if (rarityDiff !== 0) return rarityDiff;
          // Secondary sort: mint number low to high
          const mintA = getMintNumericValue(a.mintNumber);
          const mintB = getMintNumericValue(b.mintNumber);
          if (mintA !== mintB) return mintA - mintB;
          return (a.mintNumber || '').localeCompare(b.mintNumber || '');
        }
        default:
          return 0;
      }
    });

    return result;
  }, [nfts, searchQuery, selectedItemClass, sortBy]);

  // Calculate rarity counts from filtered NFTs
  const rarityCounts = useMemo(() => {
    const counts = {
      Mythic: 0,
      Legendary: 0,
      Epic: 0,
      Rare: 0,
      Uncommon: 0,
      Common: 0,
    };
    for (const nft of filteredAndSortedNFTs) {
      const rarity = getRarityName(nft);
      if (rarity in counts) {
        counts[rarity as keyof typeof counts] += nft.quantity || 1;
      }
    }
    return counts;
  }, [filteredAndSortedNFTs]);

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
    setSortBy('name-asc');
  };

  const hasActiveFilters = searchQuery || selectedItemClass !== 'all' || sortBy !== 'name-asc';

  if (nfts.length === 0) {
    return (
      <div className="bg-[#181818] p-6 rounded-lg border border-[#64ffff]/20">
        <h3 className="text-lg font-semibold mb-2 text-white">
          Off The Grid Game Assets
        </h3>
        <p className="text-gray-400">No game assets found</p>
      </div>
    );
  }

  return (
    <div className="bg-[#181818] p-6 rounded-lg border border-[#64ffff]/20">
      {/* Header with Title */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-white">
              Off The Grid Game Assets ({filteredAndSortedNFTs.length}{filteredAndSortedNFTs.length !== nfts.length ? ` of ${nfts.length}` : ''})
            </h3>
            {totalGunSpent > 0 && (
              <span className="text-sm text-gray-400">
                Total Spent: <span className="text-[#beffd2] font-medium">{totalGunSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GUN</span>
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#64ffff] hover:text-[#96aaff] transition"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Always-visible Search Bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, mint #, traits (weapon, pants, legendary)..."
            className="w-full pl-10 pr-4 py-3 text-sm bg-black/50 border border-[#64ffff]/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#64ffff] focus:ring-1 focus:ring-[#64ffff] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition"
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
              <label className="text-xs text-gray-400">Collections:</label>
              <select
                value={selectedItemClass}
                onChange={(e) => setSelectedItemClass(e.target.value)}
                className="select-dropdown pl-3 pr-8 py-1.5 text-sm bg-black/50 border border-[#64ffff]/30 rounded-lg text-white focus:outline-none focus:border-[#64ffff] transition cursor-pointer"
              >
                <option value="all">All ({nfts.length})</option>
                {itemClasses.map(itemClass => {
                  const count = nfts.filter(nft => getItemClass(nft) === itemClass).length;
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
            <label className="text-xs text-gray-400">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="select-dropdown pl-3 pr-8 py-1.5 text-sm bg-black/50 border border-[#64ffff]/30 rounded-lg text-white focus:outline-none focus:border-[#64ffff] transition cursor-pointer"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="mint-asc">Mint # (Low-High)</option>
              <option value="mint-desc">Mint # (High-Low)</option>
              <option value="rarity-high">Rarity (High-Low)</option>
              <option value="rarity-low">Rarity (Low-High)</option>
              <option value="floor-asc">Floor (Low-High)</option>
              <option value="floor-desc">Floor (High-Low)</option>
              <option value="quantity-desc">Quantity</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 ml-auto">
            <label className="text-xs text-gray-400 mr-1">View:</label>
            {/* Small Grid */}
            <button
              onClick={() => setViewMode('small')}
              className={`p-1.5 rounded transition ${
                viewMode === 'small'
                  ? 'bg-[#64ffff]/20 text-[#64ffff] border border-[#64ffff]/50'
                  : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
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
              className={`p-1.5 rounded transition ${
                viewMode === 'medium'
                  ? 'bg-[#64ffff]/20 text-[#64ffff] border border-[#64ffff]/50'
                  : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
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
              className={`p-1.5 rounded transition ${
                viewMode === 'list'
                  ? 'bg-[#64ffff]/20 text-[#64ffff] border border-[#64ffff]/50'
                  : 'text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
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
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#64ffff]/20 text-[#64ffff] text-xs rounded-full border border-[#64ffff]/30">
              &quot;{searchQuery.length > 15 ? searchQuery.slice(0, 15) + '...' : searchQuery}&quot;
              <button onClick={() => setSearchQuery('')} className="hover:text-white ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {selectedItemClass !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#96aaff]/20 text-[#96aaff] text-xs rounded-full border border-[#96aaff]/30">
              {getItemClassDisplayName(selectedItemClass)}
              <button onClick={() => setSelectedItemClass('all')} className="hover:text-white ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>

        {/* Rarity Counters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-gray-500">Rarity:</span>
          {rarityCounts.Mythic > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ff44ff' }}></span>
              <span style={{ color: '#ff44ff' }}>Mythic: {rarityCounts.Mythic}</span>
            </span>
          )}
          {rarityCounts.Legendary > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ff8800' }}></span>
              <span style={{ color: '#ff8800' }}>Legendary: {rarityCounts.Legendary}</span>
            </span>
          )}
          {rarityCounts.Epic > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#cc44ff' }}></span>
              <span style={{ color: '#cc44ff' }}>Epic: {rarityCounts.Epic}</span>
            </span>
          )}
          {rarityCounts.Rare > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4488ff' }}></span>
              <span style={{ color: '#4488ff' }}>Rare: {rarityCounts.Rare}</span>
            </span>
          )}
          {rarityCounts.Uncommon > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#44ff44' }}></span>
              <span style={{ color: '#44ff44' }}>Uncommon: {rarityCounts.Uncommon}</span>
            </span>
          )}
          {rarityCounts.Common > 0 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#888888' }}></span>
              <span style={{ color: '#888888' }}>Common: {rarityCounts.Common}</span>
            </span>
          )}
        </div>
      </div>

      {/* No Results Message */}
      {filteredAndSortedNFTs.length === 0 && nfts.length > 0 && (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-lg mb-2">No NFTs match your search</p>
          <p className="text-sm text-gray-500 mb-4">Try adjusting your filters or search terms</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm bg-[#64ffff]/20 text-[#64ffff] rounded-lg hover:bg-[#64ffff]/30 transition border border-[#64ffff]/30"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Grid Views (Small & Medium) */}
      {viewMode !== 'list' && (
        <div className={`grid gap-4 ${
          viewMode === 'small'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {filteredAndSortedNFTs.map((nft) => (
            <div
              key={`${nft.chain}-${nft.tokenId}`}
              className="bg-black/30 border border-[#64ffff]/20 rounded-lg overflow-hidden hover:border-[#64ffff]/50 hover:shadow-lg hover:shadow-[#64ffff]/10 transition-all cursor-pointer transform hover:scale-[1.02]"
              onClick={() => handleNFTClick(nft)}
            >
              <div className="aspect-square relative bg-black/50">
                {nft.image ? (
                  <Image
                    src={nft.image}
                    alt={nft.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <svg className={`${viewMode === 'small' ? 'w-8 h-8' : 'w-12 h-12'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}

                {/* Quantity Badge */}
                {nft.quantity && nft.quantity > 1 && (
                  <div className={`absolute top-1 right-1 bg-[#96aaff] text-black rounded-full font-bold shadow-lg ${
                    viewMode === 'small' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
                  }`}>
                    ×{nft.quantity}
                  </div>
                )}
              </div>

              <div className={viewMode === 'small' ? 'p-2' : 'p-3'}>
                <p className={`font-semibold text-white truncate ${viewMode === 'small' ? 'text-xs' : 'text-sm'}`} title={nft.name}>
                  {nft.name}
                </p>
                {viewMode === 'medium' && (
                  <p className="text-xs text-gray-400 truncate" title={nft.collection}>
                    {nft.collection}
                  </p>
                )}

                {/* Mint Number - always show with rarity color */}
                {(() => {
                  const { display, hasMore } = formatMintNumbers(nft);
                  const rarityColor = getRarityColor(nft);
                  return (
                    <p
                      className={`truncate ${viewMode === 'small' ? 'text-[10px] mt-0.5' : 'text-xs mt-1'}`}
                      style={{ color: rarityColor }}
                    >
                      {display}{hasMore && <span className="text-gray-500">, more...</span>}
                    </p>
                  );
                })()}

                {/* Floor Price - only in medium view */}
                {viewMode === 'medium' && nft.floorPrice !== undefined && (
                  <p className="text-xs text-[#beffd2] mt-1">
                    Floor: {nft.floorPrice} GUN
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {filteredAndSortedNFTs.map((nft) => (
            <div
              key={`${nft.chain}-${nft.tokenId}`}
              className="bg-black/30 border border-[#64ffff]/20 rounded-lg overflow-hidden hover:border-[#64ffff]/50 hover:shadow-lg hover:shadow-[#64ffff]/10 transition-all cursor-pointer flex items-center gap-4 p-3"
              onClick={() => handleNFTClick(nft)}
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 flex-shrink-0 relative bg-black/50 rounded-lg overflow-hidden">
                {nft.image ? (
                  <Image
                    src={nft.image}
                    alt={nft.name}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-grow min-w-0">
                <p className="font-semibold text-sm text-white truncate" title={nft.name}>
                  {nft.name}
                </p>
                <p className="text-xs text-gray-400 truncate" title={nft.collection}>
                  {nft.collection}
                </p>
              </div>

              {/* Mint Number with rarity color */}
              <div className="flex-shrink-0 text-right hidden sm:block">
                <p className="text-xs text-gray-500">Mint</p>
                {(() => {
                  const { display, hasMore } = formatMintNumbers(nft);
                  const rarityColor = getRarityColor(nft);
                  return (
                    <p className="text-sm font-medium" style={{ color: rarityColor }}>
                      {display}{hasMore && <span className="text-gray-500 text-xs">, more...</span>}
                    </p>
                  );
                })()}
              </div>

              {/* Quantity */}
              {nft.quantity && nft.quantity > 1 && (
                <div className="flex-shrink-0 text-right hidden md:block">
                  <p className="text-xs text-gray-500">Qty</p>
                  <p className="text-sm text-[#96aaff] font-semibold">
                    ×{nft.quantity}
                  </p>
                </div>
              )}

              {/* Floor Price */}
              {nft.floorPrice !== undefined && (
                <div className="flex-shrink-0 text-right hidden lg:block">
                  <p className="text-xs text-gray-500">Floor</p>
                  <p className="text-sm text-[#beffd2] font-medium">
                    {nft.floorPrice} GUN
                  </p>
                </div>
              )}

              {/* Arrow */}
              <div className="flex-shrink-0 text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button and Pagination Info */}
      {paginationInfo && (
        <div className="mt-6 flex flex-col items-center gap-3">
          {/* Pagination Debug Info */}
          <div className="text-xs text-gray-500 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <span>
              <span className="text-gray-600">totalOwnedCount:</span>{' '}
              <span className="text-[#64ffff]">{paginationInfo.totalOwnedCount}</span>
            </span>
            <span>
              <span className="text-gray-600">fetchedCount:</span>{' '}
              <span className="text-[#beffd2]">{paginationInfo.fetchedCount}</span>
            </span>
            <span>
              <span className="text-gray-600">pageSize:</span>{' '}
              <span className="text-gray-400">{paginationInfo.pageSize}</span>
            </span>
            <span>
              <span className="text-gray-600">pagesLoaded:</span>{' '}
              <span className="text-gray-400">{paginationInfo.pagesLoaded}</span>
            </span>
          </div>

          {/* Load More Button */}
          {paginationInfo.hasMore && onLoadMore && (
            <button
              onClick={onLoadMore}
              disabled={paginationInfo.isLoadingMore}
              className="px-6 py-3 bg-gradient-to-r from-[#64ffff]/20 to-[#96aaff]/20 text-[#64ffff] font-medium rounded-lg border border-[#64ffff]/30 hover:border-[#64ffff]/60 hover:from-[#64ffff]/30 hover:to-[#96aaff]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {paginationInfo.isLoadingMore ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#64ffff]/30 border-t-[#64ffff] rounded-full animate-spin"></div>
                  Loading...
                </>
              ) : (
                <>
                  Load More NFTs
                  <span className="text-xs text-[#64ffff]/70">
                    ({paginationInfo.totalOwnedCount - paginationInfo.fetchedCount} remaining)
                  </span>
                </>
              )}
            </button>
          )}

          {/* All Loaded Message */}
          {!paginationInfo.hasMore && paginationInfo.totalOwnedCount > 0 && (
            <p className="text-xs text-gray-500">
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
