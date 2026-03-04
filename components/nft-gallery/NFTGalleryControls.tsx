/**
 * NFT Gallery Controls
 *
 * Title (non-sticky) + compact sticky toolbar with inline search,
 * collections/sort dropdowns, view toggle, filter pills, and active tags.
 * Owns its own sticky detection via IntersectionObserver.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import {
  type SortOption,
  getItemClass, getItemClassDisplayName,
} from './utils';
import type { NFT } from '@/lib/types';
import { useGalleryFilters } from './GalleryFilterContext';

interface NFTGalleryControlsProps {
  nfts: NFT[];
  stickyOffset?: number;
}

export function NFTGalleryControls({ nfts, stickyOffset }: NFTGalleryControlsProps) {
  const {
    searchQuery, setSearchQuery,
    sortBy, setSortBy,
    selectedItemClass, setSelectedItemClass,
    selectedOrigin, setSelectedOrigin,
    activeRarities, toggleRarity, clearRarities,
    viewMode, setViewMode,
    itemClasses, originCounts, rarityCounts,
    hasActiveFilters, clearFilters,
  } = useGalleryFilters();
  // Sticky detection — internal to this component
  const [isSticky, setIsSticky] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: 1, rootMargin: '-1px 0px 0px 0px' }
    );

    observer.observe(controls);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={controlsRef}
      className={`sticky z-20 -mx-6 px-6 -mt-6 mb-4 bg-[var(--gs-dark-3)] transition-shadow duration-200 ${
        isSticky ? 'shadow-[0_4px_12px_rgba(0,0,0,0.5)] border-b border-white/[0.06]' : ''
      }`}
      style={{ top: stickyOffset ? `${stickyOffset}px` : '64px' }}
    >
      {/* Accent line at the top edge of the card */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line" />

      <div className="pt-6 pb-3">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
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

        <div className="flex flex-col gap-3">
        {/* Row 1: Search + Collections + Sort + View */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Inline Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs lg:max-w-[50%]">
            <label htmlFor="nft-search" className="sr-only">Search NFTs</label>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gs-gray-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="nft-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, mint #, traits..."
              className="font-body w-full pl-9 pr-8 py-2 text-sm bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg text-[var(--gs-white)] placeholder-[var(--gs-gray-3)] focus:outline-none focus:border-[var(--gs-lime)] focus:ring-0 focus:shadow-[0_0_12px_rgba(166,247,0,0.25)] transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

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

          {/* Origin Filter */}
          {originCounts.size > 0 && (
            <div className="flex items-center gap-2">
              <label className="font-mono text-xs text-[var(--gs-gray-4)]">Origin:</label>
              <select
                value={selectedOrigin}
                onChange={(e) => setSelectedOrigin(e.target.value)}
                className="select-dropdown font-body pl-3 pr-8 py-1.5 text-sm bg-[var(--gs-dark-2)] border border-white/[0.06] rounded-lg text-[var(--gs-white)] focus:outline-none focus:border-[var(--gs-lime)] transition cursor-pointer"
              >
                <option value="all">All</option>
                {[...originCounts.entries()]
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([name, count]) => (
                    <option key={name} value={name}>
                      {name} ({count})
                    </option>
                  ))}
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
              <option value="scarcity-asc">Scarcity (Rarest First)</option>
              <option value="date-desc">Date (Newest First)</option>
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
              className={`p-2 transition-all duration-150 hover:-translate-y-0.5 ${
                viewMode === 'small'
                  ? 'bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] border border-[var(--gs-lime)]/50'
                  : 'text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:bg-white/10 border border-transparent'
              }`}
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
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
              className={`p-2 transition-all duration-150 hover:-translate-y-0.5 ${
                viewMode === 'medium'
                  ? 'bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] border border-[var(--gs-lime)]/50'
                  : 'text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:bg-white/10 border border-transparent'
              }`}
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
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
              className={`p-2 transition-all duration-150 hover:-translate-y-0.5 ${
                viewMode === 'list'
                  ? 'bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] border border-[var(--gs-lime)]/50'
                  : 'text-[var(--gs-gray-4)] hover:text-[var(--gs-white)] hover:bg-white/10 border border-transparent'
              }`}
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
              title="List view"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Row 2: Filter pills + Active tags */}
        <div className="flex flex-wrap items-center gap-2 text-label font-mono uppercase tracking-wide">
          <span className="text-[var(--gs-gray-3)] normal-case tracking-normal">Filter:</span>
          {/* All pill - active when no rarities selected */}
          <button
            onClick={clearRarities}
            aria-pressed={activeRarities.size === 0}
            className={`px-2.5 py-1.5 rounded-sm border transition-all ${
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
              className="px-2.5 py-1.5 rounded-sm border transition-all"
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
              className="px-2.5 py-1.5 rounded-sm border transition-all"
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
              className="px-2.5 py-1.5 rounded-sm border transition-all"
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
              className="px-2.5 py-1.5 rounded-sm border transition-all"
              style={{
                backgroundColor: activeRarities.has('Common') ? 'rgba(136,136,136,0.2)' : 'rgba(136,136,136,0.08)',
                borderColor: activeRarities.has('Common') ? 'rgba(136,136,136,0.5)' : 'rgba(136,136,136,0.25)',
                color: '#888888',
              }}
            >
              Common: {rarityCounts.Common}
            </button>
          )}

          {/* Active Filter Tags */}
          {searchQuery && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--gs-lime)]/20 text-[var(--gs-lime)] text-xs border border-[var(--gs-lime)]/30 font-mono"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              &quot;{searchQuery.length > 15 ? searchQuery.slice(0, 15) + '...' : searchQuery}&quot;
              <button onClick={() => setSearchQuery('')} className="hover:text-[var(--gs-white)] ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {selectedItemClass !== 'all' && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--gs-purple)]/20 text-[var(--gs-purple)] text-xs border border-[var(--gs-purple)]/30 font-mono"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              {getItemClassDisplayName(selectedItemClass)}
              <button onClick={() => setSelectedItemClass('all')} className="hover:text-[var(--gs-white)] ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {selectedOrigin !== 'all' && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 bg-[#22d3ee]/20 text-[#22d3ee] text-xs border border-[#22d3ee]/30 font-mono"
              style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
            >
              {selectedOrigin}
              <button onClick={() => setSelectedOrigin('all')} className="hover:text-[var(--gs-white)] ml-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
