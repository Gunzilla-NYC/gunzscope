/**
 * NFT Gallery List Row
 *
 * Single NFT row for list view.
 * RENDER ONLY: All display data pre-computed via deriveCardData().
 */

'use client';

import Image from 'next/image';
import { getSpecificItemType } from '@/lib/nft/itemTypeUtils';
import { getRarityColorByName, getMarketScarcityColor, getCostBasisDisplay, getVenueLabel } from './utils';
import type { NFTGalleryListRowProps } from './types';

export function NFTGalleryListRow({ cardData, isEnriching, onClick, portfolioViewMode }: NFTGalleryListRowProps) {
  const {
    nft, rarityName, rarityColor, mintDisplay, mintData, nameInitials,
    pnlPct, isProfit, isLoss, priceGun, marketListings,
  } = cardData;

  return (
    <div
      className="group bg-[var(--gs-dark-3)] border border-white/[0.06] overflow-hidden transition-all duration-200 cursor-pointer flex items-center gap-4 p-3 hover:-translate-y-0.5 relative"
      onClick={() => onClick(nft)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${rarityColor}40`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${rarityColor}10`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Left accent line - reveals rarity color on hover */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(180deg, ${rarityColor}, transparent)` }}
      />
      {/* Thumbnail */}
      <div className="w-14 h-14 flex-shrink-0 relative bg-[var(--gs-dark-4)] overflow-hidden">
        {/* Quality Badge - shows abbreviated for space, "MLT" for grouped items */}
        <span
          className="absolute top-0.5 left-0.5 z-10 font-mono text-[6px] tracking-wide uppercase px-1 py-0.5 rounded-sm"
          style={{
            backgroundColor: nft.quantity && nft.quantity > 1 ? 'rgba(150, 170, 255, 0.20)' : `${rarityColor}20`,
            color: nft.quantity && nft.quantity > 1 ? 'var(--gs-purple)' : rarityColor,
          }}
        >
          {nft.quantity && nft.quantity > 1 ? 'MLT' : (rarityName === 'Unknown' ? '—' : rarityName.slice(0, 4))}
        </span>
        {/* Quantity indicator for grouped items */}
        {nft.quantity && nft.quantity > 1 && (
          <span className="absolute bottom-0.5 right-0.5 z-10 font-mono text-[6px] font-bold px-1 py-0.5 rounded-sm bg-[var(--gs-purple)] text-black">
            ×{nft.quantity}
          </span>
        )}

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
        <div className="flex items-center gap-1.5">
          <p className="font-display font-semibold text-xs uppercase tracking-wide text-[var(--gs-white)] truncate" title={nft.name}>
            {nft.name}
          </p>
          {portfolioViewMode === 'detailed' && nft.acquisitionVenue && (
            <span className="font-mono text-[6px] tracking-wide uppercase px-1 py-0.5 bg-white/5 text-[var(--gs-gray-3)] border border-white/[0.06] shrink-0">
              {getVenueLabel(nft.acquisitionVenue)}
            </span>
          )}
        </div>
        <p className="font-mono text-label uppercase tracking-wide text-[var(--gs-gray-3)] truncate">
          {getSpecificItemType(nft) || nft.collection}
        </p>
      </div>

      {/* Mint Number */}
      <div className="flex-shrink-0 text-right hidden sm:block">
        <p className="font-mono text-label text-[var(--gs-gray-4)] uppercase">Mint</p>
        <p className="font-mono text-caption font-medium">
          {mintData.length > 1 ? (
            mintData.map((m, i) => (
              <span key={m.mint}>
                <span style={{ color: getRarityColorByName(m.rarity) }}>{m.mint}</span>
                {i < mintData.length - 1 && <span className="text-[var(--gs-gray-4)]">, </span>}
              </span>
            ))
          ) : (
            <span style={{ color: rarityColor }}>{mintDisplay}</span>
          )}
        </p>
      </div>

      {/* Quantity */}
      {nft.quantity && nft.quantity > 1 && (
        <div className="flex-shrink-0 text-right hidden md:block">
          <p className="font-mono text-label text-[var(--gs-gray-4)] uppercase">Qty</p>
          <p className="font-mono text-caption text-[var(--gs-purple)] font-bold">
            ×{nft.quantity}
          </p>
        </div>
      )}

      {/* Market Scarcity */}
      {marketListings !== null && (
        <div className="flex-shrink-0 text-right hidden md:block min-w-[50px]">
          <p className="font-mono text-label text-[var(--gs-gray-4)] uppercase">Listed</p>
          <p
            className="font-mono text-caption font-medium"
            style={{ color: getMarketScarcityColor(marketListings) }}
          >
            {marketListings === 0 ? 'None' : marketListings}
          </p>
        </div>
      )}

      {/* Price */}
      <div className="flex-shrink-0 text-right hidden lg:block min-w-[80px]">
        <p className="font-mono text-label text-[var(--gs-gray-4)] uppercase">Price</p>
        {isEnriching && priceGun === undefined ? (
          <span className="skeleton-stat inline-block w-14 h-3.5 mt-0.5" />
        ) : (
          <p className="font-mono text-caption text-[var(--gs-white)] font-medium">
            {priceGun !== undefined ? `${priceGun.toLocaleString()} GUN` : '—'}
          </p>
        )}
      </div>

      {/* Cost (detailed mode only) */}
      {portfolioViewMode === 'detailed' && (
        <div className="flex-shrink-0 text-right hidden lg:block min-w-[70px]">
          <p className="font-mono text-label text-[var(--gs-gray-4)] uppercase">Cost</p>
          {(() => {
            const cb = getCostBasisDisplay(nft);
            return (
              <p className="font-mono text-caption font-medium" style={{ color: cb.color }}>
                {cb.label}
              </p>
            );
          })()}
        </div>
      )}

      {/* P&L */}
      <div className="flex-shrink-0 text-right min-w-[50px]">
        <p className="font-mono text-label text-[var(--gs-gray-4)] uppercase">P&L</p>
        {isEnriching && pnlPct === null ? (
          <span className="skeleton-stat inline-block w-10 h-3.5 mt-0.5" />
        ) : (
          <p className={`font-mono text-caption font-medium ${
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
}
