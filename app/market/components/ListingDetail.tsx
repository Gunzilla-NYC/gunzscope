'use client';

import Link from 'next/link';
import type { MarketItemGroup } from '@/lib/types';
import { formatGunPrice, formatUsdPrice, truncateAddress, buildOpenSeaUrl } from '../utils';

interface ListingDetailProps {
  item: MarketItemGroup;
  gunPrice: number | null;
  onBack: () => void;
}

export function ListingDetail({ item, gunPrice, onBack }: ListingDetailProps) {
  return (
    <div>
      {/* Back button + header */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] transition-colors mb-4 cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to results
      </button>

      {/* Item header */}
      <div className="flex items-start gap-4 mb-6">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.itemName}
            className="w-20 h-20 object-cover bg-black/50 shrink-0"
            style={{ clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))' }}
          />
        )}
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold text-[var(--gs-white)] truncate">
            {item.itemName}
          </h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="font-mono text-sm tabular-nums text-[var(--gs-lime)]">
              Floor: {formatGunPrice(item.floorPriceGun)} GUN
              {gunPrice ? ` (${formatUsdPrice(item.floorPriceGun, gunPrice)})` : ''}
            </span>
            <span className="font-mono text-caption text-[var(--gs-gray-3)]">
              {item.listingCount} listing{item.listingCount !== 1 ? 's' : ''}
            </span>
            {item.recentSales > 0 && (
              <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                {item.recentSales} sold (7d)
              </span>
            )}
            {item.avgSalePriceGun && (
              <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                Avg: {formatGunPrice(item.avgSalePriceGun)} GUN
              </span>
            )}
            <Link
              href={`/scarcity?q=${encodeURIComponent(item.itemName)}`}
              className="font-mono text-caption uppercase tracking-wider text-[var(--gs-purple)]/70 hover:text-[var(--gs-purple)] transition-colors"
            >
              Scarcity &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Context bar: avg sale comparison */}
      {item.avgSalePriceGun && item.floorPriceGun > 0 && (
        <div className="mb-4 px-3 py-2 border border-white/[0.06] bg-white/[0.02]">
          {item.floorPriceGun <= item.avgSalePriceGun ? (
            <p className="font-mono text-caption text-[var(--gs-profit)]">
              Cheapest listing is {((1 - item.floorPriceGun / item.avgSalePriceGun) * 100).toFixed(0)}% below the 7d average sale price
            </p>
          ) : (
            <p className="font-mono text-caption text-[var(--gs-gray-3)]">
              Cheapest listing is {((item.floorPriceGun / item.avgSalePriceGun - 1) * 100).toFixed(0)}% above the 7d average sale price
            </p>
          )}
        </div>
      )}

      {/* Individual listings table (desktop) */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2 w-8">#</th>
              <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">Price (GUN)</th>
              {gunPrice && (
                <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">Price (USD)</th>
              )}
              <th className="text-right font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">Mint #</th>
              <th className="text-left font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2">Seller</th>
              <th className="text-center font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] py-3 px-2 w-16">Buy</th>
            </tr>
          </thead>
          <tbody>
            {item.listings.map((listing, idx) => {
              const isDeal = item.avgSalePriceGun ? listing.priceGun <= item.avgSalePriceGun : false;
              return (
                <tr
                  key={listing.orderHash || `${listing.tokenId}-${idx}`}
                  className={`border-b border-white/[0.03] hover:bg-[var(--gs-lime)]/[0.03] transition-colors ${
                    idx === 0 ? 'bg-[var(--gs-profit)]/[0.03]' : ''
                  }`}
                >
                  <td className="py-3 px-2 font-mono text-data tabular-nums text-[var(--gs-gray-3)]">
                    {idx + 1}
                  </td>
                  <td className={`py-3 px-2 text-right font-mono text-sm tabular-nums ${
                    isDeal ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-white)]'
                  }`}>
                    {formatGunPrice(listing.priceGun)} GUN
                  </td>
                  {gunPrice && (
                    <td className="py-3 px-2 text-right font-mono text-sm tabular-nums text-[var(--gs-gray-4)]">
                      {formatUsdPrice(listing.priceGun, gunPrice)}
                    </td>
                  )}
                  <td className="py-3 px-2 text-right font-mono text-sm tabular-nums text-[var(--gs-gray-4)]">
                    #{listing.tokenId}
                  </td>
                  <td className="py-3 px-2 font-mono text-sm text-[var(--gs-gray-4)]">
                    {truncateAddress(listing.sellerAddress)}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <a
                      href={buildOpenSeaUrl(listing.tokenId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center w-8 h-8 text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] hover:bg-[var(--gs-lime)]/10 transition-colors"
                      title="Buy on OpenSea"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile listing cards */}
      <div className="md:hidden space-y-0">
        {item.listings.map((listing, idx) => {
          const isDeal = item.avgSalePriceGun ? listing.priceGun <= item.avgSalePriceGun : false;
          return (
            <div
              key={listing.orderHash || `${listing.tokenId}-${idx}`}
              className={`flex items-center gap-3 py-3 border-b border-white/[0.04] ${
                idx === 0 ? 'bg-[var(--gs-profit)]/[0.03]' : ''
              }`}
            >
              <span className="font-mono text-caption tabular-nums text-[var(--gs-gray-2)] w-6 shrink-0">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-mono text-body-sm tabular-nums ${isDeal ? 'text-[var(--gs-profit)]' : 'text-[var(--gs-white)]'}`}>
                  {formatGunPrice(listing.priceGun)} GUN
                  {gunPrice && (
                    <span className="text-[var(--gs-gray-3)] ml-1.5">
                      ({formatUsdPrice(listing.priceGun, gunPrice)})
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                    #{listing.tokenId}
                  </span>
                  <span className="text-[var(--gs-gray-2)]">&middot;</span>
                  <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                    {truncateAddress(listing.sellerAddress)}
                  </span>
                </div>
              </div>
              <a
                href={buildOpenSeaUrl(listing.tokenId)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center min-w-10 min-h-10 text-[var(--gs-gray-3)] hover:text-[var(--gs-lime)] hover:bg-[var(--gs-lime)]/10 transition-colors shrink-0"
                title="Buy on OpenSea"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
