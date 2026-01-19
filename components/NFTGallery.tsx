'use client';

import { NFT, NFTPaginationInfo } from '@/lib/types';
import Image from 'next/image';
import { useState, useMemo } from 'react';
import NFTDetailModal from './NFTDetailModal';
import { buildTokenKey } from '@/lib/utils/nftCache';

type SortOption = 'name-asc' | 'name-desc' | 'mint-asc' | 'mint-desc' | 'floor-asc' | 'floor-desc' | 'quantity-desc';
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

// Format mint numbers for display (up to 3, then "more...")
function formatMintNumbers(nft: NFT): { display: string; hasMore: boolean } {
  const mintNumbers = nft.mintNumbers || (nft.mintNumber ? [nft.mintNumber] : []);
  if (mintNumbers.length === 0) {
    return { display: `#${nft.tokenId.slice(0, 8)}`, hasMore: false };
  }
  if (mintNumbers.length === 1) {
    return { display: `#${mintNumbers[0]}`, hasMore: false };
  }
  // Multiple mints - show up to 3
  const displayed = mintNumbers.slice(0, 3).map(m => `#${m}`).join(', ');
  const hasMore = mintNumbers.length > 3;
  return { display: displayed, hasMore };
}

export default function NFTGallery({ nfts, chain, walletAddress, paginationInfo, onLoadMore }: NFTGalleryProps) {
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [selectedTokenKeyString, setSelectedTokenKeyString] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  // Default view: small grid if >16 NFTs, medium grid if <=16
  const [viewMode, setViewMode] = useState<ViewMode>(() => nfts.length > 16 ? 'small' : 'medium');

  // Get the contract address for building token keys
  const nftContractAddress = process.env.NEXT_PUBLIC_NFT_COLLECTION_AVALANCHE || '';

  // Get unique collections for filter dropdown
  const collections = useMemo(() => {
    const uniqueCollections = [...new Set(nfts.map(nft => nft.collection))];
    return uniqueCollections.sort();
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
      result = result.filter(nft =>
        nft.name.toLowerCase().includes(query) ||
        nft.collection.toLowerCase().includes(query) ||
        nft.mintNumber?.toLowerCase().includes(query) ||
        nft.tokenId.toLowerCase().includes(query) ||
        matchesTraits(nft, query)
      );
    }

    // Apply collection filter
    if (selectedCollection !== 'all') {
      result = result.filter(nft => nft.collection === selectedCollection);
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'mint-asc':
          const mintA = parseInt(a.mintNumber || '0') || 0;
          const mintB = parseInt(b.mintNumber || '0') || 0;
          return mintA - mintB;
        case 'mint-desc':
          const mintA2 = parseInt(a.mintNumber || '0') || 0;
          const mintB2 = parseInt(b.mintNumber || '0') || 0;
          return mintB2 - mintA2;
        case 'floor-asc':
          return (a.floorPrice || 0) - (b.floorPrice || 0);
        case 'floor-desc':
          return (b.floorPrice || 0) - (a.floorPrice || 0);
        case 'quantity-desc':
          return (b.quantity || 1) - (a.quantity || 1);
        default:
          return 0;
      }
    });

    return result;
  }, [nfts, searchQuery, selectedCollection, sortBy]);

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
    setSelectedCollection('all');
    setSortBy('name-asc');
  };

  const hasActiveFilters = searchQuery || selectedCollection !== 'all' || sortBy !== 'name-asc';

  if (nfts.length === 0) {
    return (
      <div className="bg-[#181818] p-6 rounded-lg border border-[#64ffff]/20">
        <h3 className="text-lg font-semibold mb-2 capitalize text-white">
          {chain} NFTs
        </h3>
        <p className="text-gray-400">No NFTs found on {chain}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#181818] p-6 rounded-lg border border-[#64ffff]/20">
      {/* Header with Title */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold capitalize text-white">
              {chain} NFTs ({filteredAndSortedNFTs.length}{filteredAndSortedNFTs.length !== nfts.length ? ` of ${nfts.length}` : ''})
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
          {/* Collection Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Collection:</label>
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="px-3 py-1.5 text-sm bg-black/50 border border-[#64ffff]/30 rounded-lg text-white focus:outline-none focus:border-[#64ffff] transition cursor-pointer"
            >
              <option value="all">All</option>
              {collections.map(collection => (
                <option key={collection} value={collection}>{collection}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">Sort:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 text-sm bg-black/50 border border-[#64ffff]/30 rounded-lg text-white focus:outline-none focus:border-[#64ffff] transition cursor-pointer"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="mint-asc">Mint # (Low-High)</option>
              <option value="mint-desc">Mint # (High-Low)</option>
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
          {selectedCollection !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#beffd2]/20 text-[#beffd2] text-xs rounded-full border border-[#beffd2]/30">
              {selectedCollection.length > 20 ? selectedCollection.slice(0, 20) + '...' : selectedCollection}
              <button onClick={() => setSelectedCollection('all')} className="hover:text-white ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
      />
    </div>
  );
}
