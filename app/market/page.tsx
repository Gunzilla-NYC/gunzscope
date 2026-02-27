'use client';

import { Suspense, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WalletRequiredGate from '@/components/WalletRequiredGate';
import ScrollToTopButton from '@/components/ui/ScrollToTopButton';
import { useMarket, type MarketSortField } from '@/lib/hooks/useMarket';
import { useVirtualizer } from '@tanstack/react-virtual';
import { getRelativeTime } from '@/lib/hooks/useScarcity';
import { SearchAutocomplete } from './components/SearchAutocomplete';
import { SortArrow } from './components/SortArrow';
import { ListingDetail } from './components/ListingDetail';
import { formatGunPrice, formatUsdPrice, buildCollectionUrl } from './utils';

function MarketContent() {
  const parentRef = useRef<HTMLDivElement>(null);
  const {
    filteredItems,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSort,
    selectedItem,
    setSelectedItemName,
    gunPrice,
    refetch,
    totalListingCount,
    uniqueItemCount,
    lastUpdated,
    suggestions,
  } = useMarket();

  const rowVirtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 10,
  });

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] flex flex-col">
      <Navbar />
      <WalletRequiredGate feature="Market">
      <main className="flex-1">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-4">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-xl font-bold uppercase tracking-wider text-[var(--gs-white)]">
                Market
              </h1>
              <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[#FF9F43] border border-[#FF9F43]/30 bg-[#FF9F43]/[0.08]">
                Experimental
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/scarcity"
                className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-purple)] transition-colors"
              >
                Scarcity Data
              </Link>
              <span className="text-[var(--gs-gray-2)]">&middot;</span>
              <a
                href={buildCollectionUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors"
              >
                View on OpenSea &rarr;
              </a>
            </div>
          </div>
          <p className="font-mono text-caption tracking-wider text-[var(--gs-gray-3)] mb-4">
            Find the best prices on Off The Grid items
          </p>

          {/* Summary stats */}
          {!isLoading && (
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)]">
                <span className="text-[var(--gs-white)]">{totalListingCount.toLocaleString()}</span> Listings
              </div>
              <span className="text-[var(--gs-gray-2)]">&middot;</span>
              <div className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)]">
                <span className="text-[var(--gs-white)]">{uniqueItemCount}</span> Items
              </div>
              {lastUpdated && (
                <>
                  <span className="text-[var(--gs-gray-2)]">&middot;</span>
                  <div className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-2)]">
                    Updated {getRelativeTime(lastUpdated)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Search */}
          <SearchAutocomplete
            value={searchQuery}
            onChange={setSearchQuery}
            suggestions={suggestions}
            onSelect={(name) => {
              setSearchQuery(name);
              setSelectedItemName(name);
            }}
          />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12">
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-white/[0.03] animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 text-center">
            <p className="font-mono text-sm text-[var(--gs-loss)] mb-3">{error}</p>
            <button
              onClick={refetch}
              className="font-mono text-caption uppercase tracking-wider text-[var(--gs-lime)] hover:underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Main content */}
        {!isLoading && !error && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pb-6">
            {selectedItem ? (
              /* Listing detail panel */
              <ListingDetail
                item={selectedItem}
                gunPrice={gunPrice}
                onBack={() => setSelectedItemName(null)}
              />
            ) : (
              /* Item list */
              <>
                {/* Desktop table */}
                <div className="hidden md:block">
                  {/* Column headers */}
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2 w-8">#</th>
                        <th className="text-left font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <SortButton field="itemName" label="Item" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} />
                        </th>
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <SortButton field="listingCount" label="Listed" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} align="right" />
                        </th>
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <SortButton field="floorPriceGun" label="Floor (GUN)" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} align="right" />
                        </th>
                        {gunPrice && (
                          <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                            Floor (USD)
                          </th>
                        )}
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <SortButton field="recentSales" label="7d Sales" sortField={sortField} sortOrder={sortOrder} onSort={handleSort} align="right" />
                        </th>
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          Avg Sale
                        </th>
                      </tr>
                    </thead>
                  </table>

                  {/* Virtualized rows */}
                  <div
                    ref={parentRef}
                    className="max-h-[70vh] overflow-auto scrollbar-premium"
                  >
                    <div
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                        const item = filteredItems[virtualRow.index];
                        const isUnresolved = item.itemName.startsWith('Token #');

                        return (
                          <div
                            key={item.itemName}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            className="absolute left-0 w-full"
                            style={{ top: `${virtualRow.start}px` }}
                          >
                            <button
                              onClick={() => setSelectedItemName(item.itemName)}
                              className={`w-full flex items-center border-b border-white/[0.03] hover:bg-[var(--gs-lime)]/[0.03] hover:border-l-2 hover:border-l-[var(--gs-lime)]/40 transition-colors cursor-pointer text-left ${
                                isUnresolved ? 'opacity-40' : ''
                              }`}
                            >
                              {/* # */}
                              <div className="py-3 px-2 w-8 shrink-0 font-mono text-data tabular-nums text-[var(--gs-gray-3)]">
                                {virtualRow.index + 1}
                              </div>
                              {/* Item */}
                              <div className="py-3 px-2 flex-1 min-w-0">
                                <div className="flex items-center gap-2.5">
                                  {item.imageUrl && (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.itemName}
                                      className="w-8 h-8 object-cover bg-black/50 shrink-0"
                                      style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                                      loading="lazy"
                                    />
                                  )}
                                  <span className="font-mono text-sm text-[var(--gs-white)] truncate max-w-[250px]">
                                    {item.itemName}
                                  </span>
                                </div>
                              </div>
                              {/* Listed */}
                              <div className="py-3 px-2 w-20 text-right font-mono text-sm tabular-nums shrink-0 text-[var(--gs-gray-4)]">
                                {item.listingCount}
                              </div>
                              {/* Floor (GUN) */}
                              <div className={`py-3 px-2 w-28 text-right font-mono text-sm tabular-nums shrink-0 ${
                                sortField === 'floorPriceGun' ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-white)]'
                              }`}>
                                {item.floorPriceGun > 0 ? `${formatGunPrice(item.floorPriceGun)} GUN` : '\u2014'}
                              </div>
                              {/* Floor (USD) */}
                              {gunPrice && (
                                <div className="py-3 px-2 w-24 text-right font-mono text-sm tabular-nums shrink-0 text-[var(--gs-gray-4)]">
                                  {item.floorPriceGun > 0 ? formatUsdPrice(item.floorPriceGun, gunPrice) : '\u2014'}
                                </div>
                              )}
                              {/* 7d Sales */}
                              <div className="py-3 px-2 w-20 text-right font-mono text-sm tabular-nums shrink-0 text-[var(--gs-gray-4)]">
                                {item.recentSales > 0 ? item.recentSales : '\u2014'}
                              </div>
                              {/* Avg Sale */}
                              <div className="py-3 px-2 w-24 text-right font-mono text-sm tabular-nums shrink-0 text-[var(--gs-gray-4)]">
                                {item.avgSalePriceGun ? `${formatGunPrice(item.avgSalePriceGun)} GUN` : '\u2014'}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {filteredItems.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="font-mono text-sm text-[var(--gs-gray-3)]">
                        {searchQuery ? 'No items match your search' : 'No active listings found'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-0">
                  {/* Mobile sort dropdown */}
                  <div className="mb-3">
                    <label className="sr-only" htmlFor="market-sort">Sort by</label>
                    <select
                      id="market-sort"
                      value={`${sortField}-${sortOrder}`}
                      onChange={(e) => {
                        const [field] = e.target.value.split('-') as [MarketSortField, 'asc' | 'desc'];
                        handleSort(field);
                      }}
                      className="w-full px-3 py-2 bg-[var(--gs-dark-3)] border border-white/[0.08] text-sm font-mono text-[var(--gs-white)] focus:outline-none focus:border-[var(--gs-lime)]/40 clip-corner-sm"
                    >
                      <option value="floorPriceGun-asc">Cheapest First</option>
                      <option value="floorPriceGun-desc">Most Expensive</option>
                      <option value="listingCount-asc">Fewest Listings</option>
                      <option value="recentSales-desc">Most Sold (7d)</option>
                      <option value="itemName-asc">Name A\u2013Z</option>
                    </select>
                  </div>

                  {filteredItems.map((item, idx) => {
                    const isUnresolved = item.itemName.startsWith('Token #');
                    return (
                      <button
                        key={item.itemName}
                        onClick={() => setSelectedItemName(item.itemName)}
                        className={`w-full flex items-center gap-3 py-3 border-b border-white/[0.04] text-left cursor-pointer hover:bg-white/[0.02] transition-colors ${isUnresolved ? 'opacity-40' : ''}`}
                      >
                        <span className="font-mono text-caption tabular-nums text-[var(--gs-gray-2)] w-6 shrink-0">{idx + 1}</span>
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.itemName}
                            className="w-10 h-10 object-cover bg-black/50 shrink-0"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-body-sm text-[var(--gs-white)] truncate">{item.itemName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-caption tabular-nums text-[var(--gs-gray-4)]">
                              {item.listingCount} listed
                            </span>
                            {item.recentSales > 0 && (
                              <>
                                <span className="text-[var(--gs-gray-2)]">&middot;</span>
                                <span className="font-mono text-caption tabular-nums text-[var(--gs-gray-3)]">
                                  {item.recentSales} sold
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-body-sm tabular-nums text-[var(--gs-lime)]">
                            {item.floorPriceGun > 0 ? `${formatGunPrice(item.floorPriceGun)} GUN` : '\u2014'}
                          </p>
                          {gunPrice && item.floorPriceGun > 0 && (
                            <p className="font-mono text-caption tabular-nums text-[var(--gs-gray-3)]">
                              {formatUsdPrice(item.floorPriceGun, gunPrice)}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {filteredItems.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="font-mono text-sm text-[var(--gs-gray-3)]">
                        {searchQuery ? 'No items match your search' : 'No active listings found'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
      </WalletRequiredGate>
      <ScrollToTopButton />
      <Footer />
    </div>
  );
}

/** Reusable sort button for table headers */
function SortButton({
  field,
  label,
  sortField,
  sortOrder,
  onSort,
  align = 'left',
}: {
  field: MarketSortField;
  label: string;
  sortField: MarketSortField;
  sortOrder: 'asc' | 'desc';
  onSort: (f: MarketSortField) => void;
  align?: 'left' | 'right';
}) {
  return (
    <button
      onClick={() => onSort(field)}
      className={`inline-flex items-center cursor-pointer hover:text-[var(--gs-white)] transition-colors ${
        align === 'right' ? 'ml-auto' : ''
      }`}
    >
      {label}
      <SortArrow active={sortField === field} order={sortOrder} />
    </button>
  );
}

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <MarketContent />
    </Suspense>
  );
}
