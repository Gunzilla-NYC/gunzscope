'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { deriveCardData } from './utils';
import type { NFTGalleryProps } from './types';
import { useNFTGalleryFilters } from './useNFTGalleryFilters';
import { NFTGalleryControls } from './NFTGalleryControls';
import { NFTGalleryPagination } from './NFTGalleryPagination';
import { NFTGalleryGridCard } from './NFTGalleryGridCard';
import { NFTGalleryListRow } from './NFTGalleryListRow';

// Dynamic import for NFTDetailModal - only loaded when user clicks an NFT
// This reduces initial bundle size as the modal has heavy dependencies
const NFTDetailModal = dynamic(() => import('../NFTDetailModal'), {
  ssr: false,
  loading: () => null, // Modal is hidden by default, no loading UI needed
});

export default function NFTGallery({ nfts, chain: _chain, walletAddress, paginationInfo, onLoadMore, isEnriching = false, stickyOffset, marketMap, portfolioViewMode }: NFTGalleryProps) {
  const {
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    selectedItemClass, setSelectedItemClass,
    activeRarities, toggleRarity, clearRarities,
    viewMode, setViewMode,
    selectedNFT, selectedTokenKeyString, isModalOpen,
    handleNFTClick, handleCloseModal,
    itemClasses, rarityCounts, filteredAndSortedNFTs,
    clearFilters, hasActiveFilters,
  } = useNFTGalleryFilters(nfts, marketMap);

  // Pre-compute card data for all visible NFTs — stable references for React.memo
  const cardDataMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof deriveCardData>>();
    for (const nft of filteredAndSortedNFTs) {
      map.set(`${nft.chain}-${nft.tokenId}`, deriveCardData(nft, marketMap));
    }
    return map;
  }, [filteredAndSortedNFTs, marketMap]);

  if (nfts.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="size-16 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-white/[0.06] flex items-center justify-center">
          <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
          </svg>
        </div>
        <h2 className="text-balance font-display text-2xl font-bold text-[var(--gs-white)] mb-3">
          No Game Assets Found
        </h2>
        <p className="text-pretty text-[var(--gs-gray-4)] mb-8 max-w-md mx-auto font-body">
          This wallet doesn&apos;t have any Off The Grid items yet. Browse the leaderboard to see top collectors, or search another wallet.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/leaderboard"
            className="inline-block font-display font-semibold text-sm uppercase px-6 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors clip-corner"
          >
            View Leaderboard
          </Link>
          <button
            onClick={() => {
              const input = document.getElementById('wallet-search-input-portfolio') || document.getElementById('wallet-search-input');
              if (input) { input.scrollIntoView({ behavior: 'smooth' }); input.focus(); }
            }}
            className="inline-block font-display font-semibold text-sm uppercase px-6 py-3 border border-white/[0.06] text-[var(--gs-gray-3)] hover:border-white/20 hover:text-[var(--gs-white)] transition-colors cursor-pointer"
          >
            Search Another Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--gs-dark-3)] p-6 border border-white/[0.06] clip-corner">
      {/* Sticky Controls Bar */}
      <NFTGalleryControls
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        selectedItemClass={selectedItemClass}
        setSelectedItemClass={setSelectedItemClass}
        activeRarities={activeRarities}
        toggleRarity={toggleRarity}
        clearRarities={clearRarities}
        viewMode={viewMode}
        setViewMode={setViewMode}
        nfts={nfts}
        itemClasses={itemClasses}
        rarityCounts={rarityCounts}
        hasActiveFilters={hasActiveFilters}
        clearFilters={clearFilters}
        stickyOffset={stickyOffset}
      />

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

      {/* Grid Views (Small & Medium) — content-visibility skips painting offscreen cards */}
      {viewMode !== 'list' && (
        <div className={`grid gap-4 ${
          viewMode === 'small'
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
            : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {filteredAndSortedNFTs.map((nft, i) => {
            const key = `${nft.chain}-${nft.tokenId}`;
            return (
              <div
                key={key}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: 'auto 280px',
                  animation: i < 24 ? 'gallery-card-enter 0.3s ease-out both' : undefined,
                  animationDelay: i < 24 ? `${i * 30}ms` : undefined,
                }}
              >
                <NFTGalleryGridCard
                  cardData={cardDataMap.get(key)!}
                  viewMode={viewMode as 'small' | 'medium'}
                  isEnriching={isEnriching}
                  onClick={handleNFTClick}
                  portfolioViewMode={portfolioViewMode}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* List View — content-visibility for offscreen optimization */}
      {viewMode === 'list' && (
        <div className="flex flex-col gap-2">
          {filteredAndSortedNFTs.map((nft, i) => {
            const key = `${nft.chain}-${nft.tokenId}`;
            return (
              <div
                key={key}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: 'auto 72px',
                  animation: i < 24 ? 'gallery-card-enter 0.3s ease-out both' : undefined,
                  animationDelay: i < 24 ? `${i * 20}ms` : undefined,
                }}
              >
                <NFTGalleryListRow
                  cardData={cardDataMap.get(key)!}
                  isEnriching={isEnriching}
                  onClick={handleNFTClick}
                  portfolioViewMode={portfolioViewMode}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Load More Button and Pagination Info */}
      {paginationInfo && (
        <NFTGalleryPagination paginationInfo={paginationInfo} onLoadMore={onLoadMore} />
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
