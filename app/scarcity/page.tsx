'use client';

import { Suspense, useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useScarcity, getRelativeTime, type ScarcitySortField } from '@/lib/hooks/useScarcity';
import { useVirtualizer } from '@tanstack/react-virtual';
import WalletRequiredGate from '@/components/WalletRequiredGate';
import ScrollToTopButton from '@/components/ui/ScrollToTopButton';
import { formatGun, getListingScarcityColor, getListingScarcityLabel, getQualityColor } from './utils';
import { SortArrow } from './components/SortArrow';
import { TraitBar } from './components/TraitBar';

type DataSource = 'opensea' | 'onchain';

function ScarcityContent() {
  const router = useRouter();
  const [dataSource, setDataSource] = useState<DataSource>('opensea');
  const hasAnimatedRef = useRef(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const browseOnMarket = useCallback((itemName: string) => {
    router.push(`/market?q=${encodeURIComponent(itemName)}`);
  }, [router]);

  // Sticky header detection
  const [isSticky, setIsSticky] = useState(false);
  const stickysentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = stickysentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-65px 0px 0px 0px' }  // navbar height
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const {
    traitStats,
    sortedListings,
    listings,
    isLoading,
    error,
    sortField,
    sortOrder,
    handleSort,
    searchQuery,
    setSearchQuery,
    lastUpdated,
    refetch,
    traitFilter,
    setTraitFilter,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    resultCount,
    totalCount,
  } = useScarcity();

  // Virtualized row rendering for 800+ items
  const rowVirtualizer = useVirtualizer({
    count: sortedListings.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  // Mark first render as animated
  if (!isLoading && sortedListings.length > 0 && !hasAnimatedRef.current) {
    hasAnimatedRef.current = true;
  }

  // Compute summary stats from full (unfiltered) listings
  const totalListed = listings.reduce((sum, l) => sum + l.listingCount, 0);
  const uniqueItems = listings.length;
  const totalSales7d = listings.reduce((sum, l) => sum + l.recentSales, 0);

  // Weapon type distribution (sorted by count ascending = rarest first)
  const weaponTypeSorted = traitStats
    ? Object.entries(traitStats.weaponTypes).sort(([, a], [, b]) => a - b)
    : [];
  const maxWeaponCount = weaponTypeSorted.length > 0 ? weaponTypeSorted[weaponTypeSorted.length - 1][1] : 0;

  // Quality distribution
  const qualityOrder = ['Epic', 'Rare', 'Uncommon', 'Common'];
  const qualityColors: Record<string, string> = { Epic: '#cc44ff', Rare: '#4488ff', Uncommon: '#44ff44', Common: '#888888' };
  const maxQualityCount = traitStats ? Math.max(...Object.values(traitStats.qualities)) : 0;

  // Classes distribution (sorted by count ascending = rarest first)
  const classesSorted = traitStats
    ? Object.entries(traitStats.classes).sort(([, a], [, b]) => a - b)
    : [];
  const maxClassCount = classesSorted.length > 0 ? classesSorted[classesSorted.length - 1][1] : 0;

  const isFiltered = !!(searchQuery || traitFilter || priceMin || priceMax);

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)]">
      <Navbar />

      <WalletRequiredGate feature="Scarcity">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-balance font-display font-bold text-3xl sm:text-4xl uppercase">
              Scarcity
            </h1>
            <span className="font-mono text-micro tracking-widest uppercase px-2 py-1 border border-[var(--gs-warning)]/40 text-[var(--gs-warning)] bg-[var(--gs-warning)]/5 clip-corner-sm">
              Experimental
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-pretty font-body text-sm text-[var(--gs-gray-4)]">
              Marketplace availability and trait distribution across the OTG collection
            </p>
            <Link
              href="/market"
              className="shrink-0 font-mono text-caption uppercase tracking-wider text-[var(--gs-lime)]/60 hover:text-[var(--gs-lime)] transition-colors"
            >
              Market &rarr;
            </Link>
          </div>
        </div>

        {/* Data Source Toggle */}
        <div role="tablist" aria-label="Data source" className="flex items-center gap-0 mb-6 border border-white/[0.06] w-fit clip-corner-sm">
          <button
            role="tab"
            aria-selected={dataSource === 'opensea'}
            onClick={() => setDataSource('opensea')}
            className={`flex items-center gap-2 px-5 py-2.5 font-mono text-caption uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-lime)] ${
              dataSource === 'opensea'
                ? 'bg-[#2081E2]/10 text-[#2081E2] border-r border-white/[0.06]'
                : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] border-r border-white/[0.06]'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.629 0 12 0ZM5.92 12.403l.051-.081 3.123-4.884a.107.107 0 0 1 .187.014c.52 1.169.972 2.623.76 3.528-.09.372-.335.876-.614 1.342a2.405 2.405 0 0 1-.117.199.108.108 0 0 1-.09.045H6.013a.106.106 0 0 1-.091-.163Zm13.914 1.68a.109.109 0 0 1-.065.101c-.243.103-1.07.485-1.414.962-.878 1.222-1.548 2.97-3.048 2.97H9.053a4.019 4.019 0 0 1-4.013-4.028v-.072c0-.058.048-.106.108-.106h3.485c.07 0 .12.063.115.132-.026.226.017.46.125.67.206.42.636.682 1.099.682h1.726v-1.347H9.99a.11.11 0 0 1-.089-.173l.063-.09c.16-.231.39-.586.621-.992.157-.278.308-.574.43-.87.024-.059.044-.117.064-.176.036-.104.073-.202.1-.3.027-.08.048-.163.065-.243a5.68 5.68 0 0 0 .075-.553 6.25 6.25 0 0 0-.009-.594 4.455 4.455 0 0 0-.025-.287 6.77 6.77 0 0 0-.08-.48 6.89 6.89 0 0 0-.111-.44l-.015-.053c-.032-.117-.065-.229-.104-.35a12.294 12.294 0 0 0-.398-1.066c-.053-.132-.112-.26-.17-.385-.09-.19-.176-.365-.256-.527a4.856 4.856 0 0 1-.112-.217c-.039-.08-.081-.157-.117-.228l-.26-.48a.067.067 0 0 1 .072-.098l1.326.36h.004l.173.049.194.055.069.02v-.783c0-.379.302-.686.679-.686.188 0 .357.078.479.202a.676.676 0 0 1 .2.484v1.164l.142.04a.107.107 0 0 1 .037.023c.036.032.088.08.155.14.052.047.108.102.175.16.132.122.29.278.461.45.046.046.09.094.138.14.182.192.38.407.575.643.066.079.129.162.198.244.068.085.14.17.204.257.085.115.178.237.256.366.036.058.075.117.108.178.1.166.186.34.263.515.032.074.063.155.088.234.073.21.13.427.163.647.012.06.02.123.024.184v.014c.012.082.016.17.016.256a3.302 3.302 0 0 1-.107.86c-.029.1-.06.198-.099.301a3.457 3.457 0 0 1-.27.543c-.026.047-.058.1-.088.147a3.37 3.37 0 0 1-.118.178c-.044.063-.085.13-.132.192a3.985 3.985 0 0 1-.18.234c-.028.035-.06.074-.09.106a3.315 3.315 0 0 1-.166.192c-.057.066-.11.128-.169.187-.036.04-.076.08-.112.117a2.932 2.932 0 0 1-.163.16l-.107.099a.108.108 0 0 1-.072.027h-1.05v1.347h1.322c.295 0 .576-.102.804-.286.078-.062.637-.543 1.291-1.229a.108.108 0 0 1 .056-.033l3.543-1.024a.108.108 0 0 1 .136.103v.72Z" />
            </svg>
            OpenSea Data
          </button>
          <button
            role="tab"
            aria-selected={dataSource === 'onchain'}
            onClick={() => setDataSource('onchain')}
            className={`flex items-center gap-2 px-5 py-2.5 font-mono text-caption uppercase tracking-widest transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-lime)] ${
              dataSource === 'onchain'
                ? 'bg-[var(--gs-purple)]/10 text-[var(--gs-purple)]'
                : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
            </svg>
            On&#8209;Chain Data
            <span className="font-mono text-[7px] tracking-wider uppercase px-1.5 py-0.5 border border-[var(--gs-warning)]/30 text-[var(--gs-warning)] bg-[var(--gs-warning)]/5 clip-corner-sm">
              Soon
            </span>
          </button>
        </div>

        {/* On-Chain Data — Locked Placeholder */}
        {dataSource === 'onchain' && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="size-16 mx-auto mb-6 rounded-full bg-[var(--gs-dark-2)] border border-[var(--gs-purple)]/20 flex items-center justify-center">
              <svg className="size-7 text-[var(--gs-purple)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="font-display font-bold text-xl uppercase mb-3 text-[var(--gs-white)]">
              On&#8209;Chain Scarcity Coming Soon
            </h2>
            <p className="font-body text-sm text-[var(--gs-gray-4)] max-w-lg mb-6">
              Full on&#8209;chain data will show exact mint quantities, true supply per item, and real&#8209;time minting activity directly from GunzChain. This requires Gunzilla to whitelist the GUNZscope IP for higher API rate limits.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
              {[
                { label: 'Per&#8209;Item Supply', desc: 'Exact count of how many of each item exist on&#8209;chain' },
                { label: 'Mint Tracking', desc: 'Real&#8209;time tracking of new mints and supply changes' },
                { label: '&quot;X of Y&quot; Badges', desc: 'Show mint rarity like &quot;1 of 48&quot; on your NFT cards' },
              ].map((feature) => (
                <div key={feature.label} className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner text-left">
                  <div className="h-[2px] bg-gradient-to-r from-[var(--gs-purple)]/60 to-transparent" />
                  <div className="p-4">
                    <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-purple)] mb-1.5" dangerouslySetInnerHTML={{ __html: feature.label }} />
                    <p className="font-body text-xs text-[var(--gs-gray-3)] leading-relaxed" dangerouslySetInnerHTML={{ __html: feature.desc }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OpenSea Data — Active Content */}
        {dataSource === 'opensea' && (<>
        {/* Error state */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-[var(--gs-loss)]/[0.08] border border-[var(--gs-loss)]/20 clip-corner-sm">
            <div className="flex items-center justify-between">
              <p className="font-mono text-data text-[var(--gs-loss)]">{error}</p>
              <button onClick={refetch} className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]">
                Retry
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {/* Skeleton stats bar */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner stat-cell-animate">
                  <div className="h-[2px] gradient-accent-line" />
                  <div className="p-4">
                    <div className="h-3 w-20 skeleton-stat mb-3" />
                    <div className="h-7 w-16 skeleton-stat" />
                  </div>
                </div>
              ))}
            </div>
            {/* Skeleton table rows */}
            <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner">
              <div className="h-[2px] gradient-accent-line" />
              <div className="p-4 space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-10 bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Bar — staggered animation via stat-cell-animate nth-child delays */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden stat-cell-animate clip-corner">
                <div className="h-[2px] gradient-accent-line" />
                <div className="p-4">
                  <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">Total Listed</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--gs-white)]">{totalListed.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden stat-cell-animate clip-corner">
                <div className="h-[2px] gradient-accent-line" />
                <div className="p-4">
                  <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">Unique Items</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--gs-white)]">{uniqueItems.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden stat-cell-animate clip-corner">
                <div className="h-[2px] gradient-accent-line" />
                <div className="p-4">
                  <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-1">7d Sales</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-[var(--gs-white)]">{totalSales7d.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Trait Distribution Cards */}
            {traitStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Weapon Types — clickable bars */}
                <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner">
                  <div className="h-[2px] gradient-accent-line" />
                  <div className="p-4">
                    <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-3">
                      Weapon Type Distribution
                    </p>
                    <div className="space-y-0">
                      {weaponTypeSorted.map(([type, count]) => (
                        <button
                          key={type}
                          onClick={() => setTraitFilter(
                            traitFilter?.value === type && traitFilter?.type === 'weapon' ? null : { type: 'weapon', value: type }
                          )}
                          className={`w-full text-left cursor-pointer hover:bg-white/[0.03] -mx-2 px-2 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)] ${
                            traitFilter?.value === type && traitFilter?.type === 'weapon' ? 'bg-white/[0.06] ring-1 ring-[var(--gs-lime)]/20' : ''
                          }`}
                          aria-pressed={traitFilter?.value === type && traitFilter?.type === 'weapon'}
                        >
                          <TraitBar
                            label={type}
                            count={count}
                            maxCount={maxWeaponCount}
                            color="var(--gs-lime)"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Quality Distribution — clickable bars */}
                <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner">
                  <div className="h-[2px] gradient-accent-line" />
                  <div className="p-4">
                    <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-3">
                      Quality Distribution
                    </p>
                    <div className="space-y-0">
                      {qualityOrder
                        .filter((q) => traitStats.qualities[q])
                        .map((quality) => (
                          <button
                            key={quality}
                            onClick={() => setTraitFilter(
                              traitFilter?.value === quality && traitFilter?.type === 'quality' ? null : { type: 'quality', value: quality }
                            )}
                            className={`w-full text-left cursor-pointer hover:bg-white/[0.03] -mx-2 px-2 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)] ${
                              traitFilter?.value === quality && traitFilter?.type === 'quality' ? 'bg-white/[0.06] ring-1 ring-[var(--gs-lime)]/20' : ''
                            }`}
                            aria-pressed={traitFilter?.value === quality && traitFilter?.type === 'quality'}
                          >
                            <TraitBar
                              label={quality}
                              count={traitStats.qualities[quality]}
                              maxCount={maxQualityCount}
                              color={qualityColors[quality] || '#888'}
                            />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Classes Distribution — clickable bars */}
                {classesSorted.length > 0 && (
                  <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] overflow-hidden clip-corner">
                    <div className="h-[2px] gradient-accent-line" />
                    <div className="p-4">
                      <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)] mb-3">
                        Class Distribution
                      </p>
                      <div className="space-y-0 max-h-48 overflow-auto scrollbar-premium">
                        {classesSorted.map(([cls, count]) => (
                          <button
                            key={cls}
                            onClick={() => setTraitFilter(
                              traitFilter?.value === cls && traitFilter?.type === 'class' ? null : { type: 'class', value: cls }
                            )}
                            className={`w-full text-left cursor-pointer hover:bg-white/[0.03] -mx-2 px-2 rounded transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)] ${
                              traitFilter?.value === cls && traitFilter?.type === 'class' ? 'bg-white/[0.06] ring-1 ring-[var(--gs-lime)]/20' : ''
                            }`}
                            aria-pressed={traitFilter?.value === cls && traitFilter?.type === 'class'}
                          >
                            <TraitBar
                              label={cls}
                              count={count}
                              maxCount={maxClassCount}
                              color="var(--gs-purple)"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sticky sentinel — goes invisible above the sticky zone */}
            <div ref={stickysentinelRef} className="h-0 mt-2" />

            {/* Marketplace Listings Section */}
            <div className="bg-[var(--gs-dark-2)] border border-white/[0.06] clip-corner">
              {/* Sticky header zone — includes accent line so it stays visible when pinned */}
              <div
                className={`sticky top-[64px] z-20 bg-[var(--gs-dark-2)] px-4 pt-4 transition-shadow duration-200 ${
                  isSticky ? 'shadow-[0_4px_16px_rgba(0,0,0,0.6)] border-b border-white/[0.06]' : ''
                }`}
              >
                <div className="h-[2px] gradient-accent-line -mx-4 -mt-4" />
                <div className="flex items-center justify-between mb-4 mt-5">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-label tracking-widest uppercase text-[var(--gs-gray-4)]">
                      Marketplace Listings
                    </p>
                    <span className="font-mono text-label text-[var(--gs-gray-2)] tabular-nums">
                      {isFiltered
                        ? `${resultCount} of ${totalCount}`
                        : resultCount} items
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lastUpdated && (
                      <p className="font-mono text-label text-[var(--gs-gray-2)] tabular-nums">
                        Updated {getRelativeTime(lastUpdated)}
                      </p>
                    )}
                    <button
                      onClick={refetch}
                      aria-label="Refresh data"
                      className="ml-1 text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Active filter pill */}
                {traitFilter && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-mono text-caption uppercase text-[var(--gs-gray-4)]">Filtered by:</span>
                    <button
                      onClick={() => setTraitFilter(null)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--gs-lime)]/10 border border-[var(--gs-lime)]/20 font-mono text-caption uppercase text-[var(--gs-lime)] clip-corner-sm hover:bg-[var(--gs-lime)]/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                    >
                      {traitFilter.value}
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                )}

                {/* Search + Price Filter */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div role="search">
                    <input
                      type="search"
                      aria-label="Search items by name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search items..."
                      className="w-full max-w-xs px-3 py-2 bg-[var(--gs-dark-3)] border border-white/[0.08] text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors clip-corner-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gs-lime)]"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-label uppercase tracking-widest text-[var(--gs-gray-3)]">Floor</span>
                    <input
                      type="number"
                      aria-label="Min floor price (GUN)"
                      value={priceMin}
                      onChange={(e) => setPriceMin(e.target.value)}
                      placeholder="Min"
                      min={0}
                      className="w-20 px-2 py-2 bg-[var(--gs-dark-3)] border border-white/[0.08] text-sm font-mono tabular-nums text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors clip-corner-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                    />
                    <span className="text-[var(--gs-gray-3)]">&ndash;</span>
                    <input
                      type="number"
                      aria-label="Max floor price (GUN)"
                      value={priceMax}
                      onChange={(e) => setPriceMax(e.target.value)}
                      placeholder="Max"
                      min={0}
                      className="w-20 px-2 py-2 bg-[var(--gs-dark-3)] border border-white/[0.08] text-sm font-mono tabular-nums text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/40 transition-colors clip-corner-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                    />
                    <span className="font-mono text-label text-[var(--gs-gray-3)]">GUN</span>
                  </div>
                </div>

                {/* Desktop table column headers — inside sticky zone */}
                <div className="hidden md:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2 w-8">#</th>
                        <th className="text-left font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <button
                            onClick={() => handleSort('itemName')}
                            aria-label={`Sort by item name, currently ${sortField === 'itemName' ? sortOrder : 'none'}`}
                            aria-sort={sortField === 'itemName' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                            className="inline-flex items-center cursor-pointer hover:text-[var(--gs-white)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                          >
                            Item
                            <SortArrow active={sortField === 'itemName'} order={sortOrder} />
                          </button>
                        </th>
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <button
                            onClick={() => handleSort('listingCount')}
                            aria-label={`Sort by listing count, currently ${sortField === 'listingCount' ? sortOrder : 'none'}`}
                            aria-sort={sortField === 'listingCount' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                            className="inline-flex items-center cursor-pointer hover:text-[var(--gs-white)] transition-colors ml-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                          >
                            Listed
                            <SortArrow active={sortField === 'listingCount'} order={sortOrder} />
                          </button>
                        </th>
                        <th className="text-center font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          Scarcity
                        </th>
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <button
                            onClick={() => handleSort('floorPriceGun')}
                            aria-label={`Sort by floor price, currently ${sortField === 'floorPriceGun' ? sortOrder : 'none'}`}
                            aria-sort={sortField === 'floorPriceGun' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                            className="inline-flex items-center cursor-pointer hover:text-[var(--gs-white)] transition-colors ml-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                          >
                            Floor (GUN)
                            <SortArrow active={sortField === 'floorPriceGun'} order={sortOrder} />
                          </button>
                        </th>
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <button
                            onClick={() => handleSort('recentSales')}
                            aria-label={`Sort by 7-day sales, currently ${sortField === 'recentSales' ? sortOrder : 'none'}`}
                            aria-sort={sortField === 'recentSales' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                            className="inline-flex items-center cursor-pointer hover:text-[var(--gs-white)] transition-colors ml-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                          >
                            7d Sales
                            <SortArrow active={sortField === 'recentSales'} order={sortOrder} />
                          </button>
                        </th>
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          Avg Sale
                        </th>
                        <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">
                          <button
                            onClick={() => handleSort('dealScore')}
                            aria-label={`Sort by deal score, currently ${sortField === 'dealScore' ? sortOrder : 'none'}`}
                            aria-sort={sortField === 'dealScore' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                            className="inline-flex items-center cursor-pointer hover:text-[var(--gs-white)] transition-colors ml-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                          >
                            Deal
                            <SortArrow active={sortField === 'dealScore'} order={sortOrder} />
                          </button>
                        </th>
                      </tr>
                    </thead>
                  </table>
                </div>
              </div>
              {/* End sticky header zone */}

              <div className="px-4 pb-4">
                {/* Desktop Table — Virtualized */}
                <div className="hidden md:block">
                  {/* Virtualized scroll container */}
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
                        const listing = sortedListings[virtualRow.index];
                        const scarcityColor = getListingScarcityColor(listing.listingCount);
                        const scarcityLabel = getListingScarcityLabel(listing.listingCount);
                        const isUnresolved = listing.itemName.startsWith('Token #');
                        const shouldAnimate = !hasAnimatedRef.current;

                        return (
                          <div
                            key={listing.itemName}
                            data-index={virtualRow.index}
                            ref={rowVirtualizer.measureElement}
                            className={`absolute left-0 w-full ${shouldAnimate ? 'scarcity-row-enter' : ''}`}
                            style={{
                              top: `${virtualRow.start}px`,
                              ...(shouldAnimate ? { animationDelay: `${Math.min(virtualRow.index * 15, 300)}ms` } : {}),
                            }}
                          >
                            <button
                              onClick={() => !isUnresolved && browseOnMarket(listing.itemName)}
                              className={`w-full flex items-center border-b border-white/[0.03] hover:bg-[var(--gs-lime)]/[0.03] hover:border-l-2 hover:border-l-[var(--gs-lime)]/40 transition-colors text-left ${
                                isUnresolved ? 'opacity-40 cursor-default' : 'cursor-pointer'
                              }`}
                            >
                              {/* # */}
                              <div className="py-3 px-2 w-8 shrink-0 font-mono text-data tabular-nums text-[var(--gs-gray-3)]">
                                {virtualRow.index + 1}
                              </div>
                              {/* Item */}
                              <div className="py-3 px-2 flex-1 min-w-0">
                                <div className="flex items-center gap-2.5">
                                  {listing.imageUrl && (
                                    <img
                                      src={listing.imageUrl}
                                      alt={listing.itemName}
                                      className="w-8 h-8 object-cover bg-black/50 shrink-0"
                                      style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                                      loading="lazy"
                                    />
                                  )}
                                  <span className="font-mono text-sm text-[var(--gs-white)] truncate max-w-[250px]">
                                    {listing.itemName}
                                  </span>
                                  {listing.quality && (
                                    <span
                                      className="shrink-0 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border clip-corner-sm"
                                      style={{ color: getQualityColor(listing.quality), borderColor: getQualityColor(listing.quality) + '40' }}
                                    >
                                      {listing.quality}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {/* Listed */}
                              <div className={`py-3 px-2 w-20 text-right font-mono text-sm tabular-nums shrink-0 ${
                                sortField === 'listingCount' ? 'text-[var(--gs-white)] bg-white/[0.02]' : ''
                              }`} style={sortField !== 'listingCount' ? { color: scarcityColor } : { color: scarcityColor }}>
                                {listing.listingCount}
                              </div>
                              {/* Scarcity */}
                              <div className="py-3 px-2 w-32 text-center shrink-0">
                                <span
                                  className="inline-block font-mono text-label uppercase tracking-wider whitespace-nowrap px-2 py-0.5 border clip-corner-sm"
                                  style={{ color: scarcityColor, borderColor: scarcityColor + '40' }}
                                >
                                  {scarcityLabel}
                                </span>
                              </div>
                              {/* Floor */}
                              <div className={`py-3 px-2 w-24 text-right font-mono text-sm tabular-nums shrink-0 ${
                                sortField === 'floorPriceGun' ? 'text-[var(--gs-white)] bg-white/[0.02]' : 'text-[var(--gs-gray-4)]'
                              }`}>
                                {listing.floorPriceGun > 0 ? formatGun(listing.floorPriceGun) : '\u2014'}
                              </div>
                              {/* 7d Sales */}
                              <div className={`py-3 px-2 w-20 text-right font-mono text-sm tabular-nums shrink-0 ${
                                sortField === 'recentSales' ? 'text-[var(--gs-white)] bg-white/[0.02]' : 'text-[var(--gs-gray-4)]'
                              }`}>
                                {listing.recentSales > 0 ? listing.recentSales : '\u2014'}
                              </div>
                              {/* Avg Sale */}
                              <div className="py-3 px-2 w-24 text-right font-mono text-sm tabular-nums text-[var(--gs-gray-4)] shrink-0">
                                {listing.avgSalePriceGun ? formatGun(listing.avgSalePriceGun) : '\u2014'}
                              </div>
                              {/* Deal */}
                              <div className={`py-3 px-2 w-20 text-right font-mono text-sm tabular-nums shrink-0 ${
                                sortField === 'dealScore' ? 'bg-white/[0.02]' : ''
                              }`}>
                                {(() => {
                                  if (!listing.avgSalePriceGun || listing.floorPriceGun <= 0) return '\u2014';
                                  const pct = ((listing.avgSalePriceGun - listing.floorPriceGun) / listing.avgSalePriceGun) * 100;
                                  if (pct > 5) return <span className="text-[var(--gs-profit)]">{pct.toFixed(0)}%</span>;
                                  if (pct < -5) return <span className="text-[var(--gs-loss)]">{pct.toFixed(0)}%</span>;
                                  return <span className="text-[var(--gs-gray-3)]">~0%</span>;
                                })()}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {sortedListings.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="font-mono text-sm text-[var(--gs-gray-3)]">
                        {searchQuery ? 'No items match your search' : 'No active listings found'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-0">
                  {/* Mobile sort dropdown */}
                  <div className="mb-3">
                    <label className="sr-only" htmlFor="scarcity-sort">Sort by</label>
                    <select
                      id="scarcity-sort"
                      value={`${sortField}-${sortOrder}`}
                      onChange={(e) => {
                        const [field] = e.target.value.split('-') as [ScarcitySortField, 'asc' | 'desc'];
                        handleSort(field);
                      }}
                      className="w-full px-3 py-2 bg-[var(--gs-dark-3)] border border-white/[0.08] text-sm font-mono text-[var(--gs-white)] focus:outline-none focus:border-[var(--gs-lime)]/40 clip-corner-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--gs-lime)]"
                    >
                      <option value="listingCount-asc">Scarcest First</option>
                      <option value="floorPriceGun-desc">Highest Floor</option>
                      <option value="floorPriceGun-asc">Lowest Floor</option>
                      <option value="recentSales-desc">Most Sold (7d)</option>
                      <option value="dealScore-desc">Best Deals</option>
                      <option value="itemName-asc">Name A-Z</option>
                    </select>
                  </div>

                  {sortedListings.map((listing, idx) => {
                    const scarcityColor = getListingScarcityColor(listing.listingCount);
                    const scarcityLabel = getListingScarcityLabel(listing.listingCount);
                    const isUnresolved = listing.itemName.startsWith('Token #');
                    return (
                      <button
                        key={listing.itemName}
                        onClick={() => !isUnresolved && browseOnMarket(listing.itemName)}
                        className={`w-full flex items-center gap-3 py-3 border-b border-white/[0.04] text-left ${isUnresolved ? 'opacity-40 cursor-default' : 'cursor-pointer hover:bg-white/[0.02]'}`}
                      >
                        <span className="font-mono text-caption tabular-nums text-[var(--gs-gray-2)] w-6 shrink-0">{idx + 1}</span>
                        {listing.imageUrl && (
                          <img
                            src={listing.imageUrl}
                            alt={listing.itemName}
                            className="w-10 h-10 object-cover bg-black/50 shrink-0"
                            style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}
                            loading="lazy"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-mono text-body-sm text-[var(--gs-white)] truncate">{listing.itemName}</p>
                            {listing.quality && (
                              <span
                                className="shrink-0 font-mono text-[8px] uppercase tracking-wider px-1 py-px border clip-corner-sm"
                                style={{ color: getQualityColor(listing.quality), borderColor: getQualityColor(listing.quality) + '40' }}
                              >
                                {listing.quality}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-caption tabular-nums" style={{ color: scarcityColor }}>
                              {listing.listingCount} listed
                            </span>
                            <span className="font-mono text-caption text-[var(--gs-gray-2)]">&middot;</span>
                            <span className="font-mono text-caption uppercase" style={{ color: scarcityColor }}>
                              {scarcityLabel}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono text-body-sm tabular-nums text-[var(--gs-gray-4)]">
                            {listing.floorPriceGun > 0 ? `${formatGun(listing.floorPriceGun)} GUN` : '\u2014'}
                          </p>
                          {listing.recentSales > 0 && (
                            <p className="font-mono text-caption tabular-nums text-[var(--gs-gray-2)]">
                              {listing.recentSales} sales
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {sortedListings.length === 0 && (
                    <div className="py-12 text-center">
                      <p className="font-mono text-sm text-[var(--gs-gray-3)]">
                        {searchQuery ? 'No items match your search' : 'No active listings found'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </>)}
      </main>
      </WalletRequiredGate>
      <ScrollToTopButton />
      <Footer />
    </div>
  );
}

export default function ScarcityPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--gs-black)]" />}>
      <ScarcityContent />
    </Suspense>
  );
}
