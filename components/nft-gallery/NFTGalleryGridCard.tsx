/**
 * NFT Gallery Grid Card
 *
 * Single NFT card for small and medium grid views.
 * RENDER ONLY: All display data pre-computed via deriveCardData().
 */

'use client';

import Image from 'next/image';
import { getSpecificItemType } from '@/lib/nft/itemTypeUtils';
import { getRarityColorByName, getMarketScarcityColor, getCostBasisDisplay, getVenueLabel } from './utils';
import type { NFTGalleryGridCardProps } from './types';

export function NFTGalleryGridCard({ cardData, viewMode, isEnriching, onClick, portfolioViewMode }: NFTGalleryGridCardProps) {
  const {
    nft, rarityName, rarityColor, mintDisplay, mintData, nameInitials,
    pnlPct, isProfit, isLoss, priceGun, priceDisplay, pnlDisplay,
    marketListings,
  } = cardData;

  return (
    <div
      className="group bg-[var(--gs-dark-3)] border border-white/[0.06] p-3 transition-all duration-200 cursor-pointer hover:-translate-y-1 relative overflow-hidden"
      style={{
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
      }}
      onClick={() => onClick(nft)}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = `${rarityColor}40`;
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 20px ${rarityColor}15`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Bottom accent line - reveals rarity color on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${rarityColor}, transparent)` }}
      />
      {/* Image Container */}
      <div
        className="aspect-square relative bg-[var(--gs-dark-4)] mb-2 overflow-hidden"
        style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
      >
        {/* Quality Badge - Top Left with corner cut */}
        <span
          className="absolute top-1.5 left-1.5 z-10 font-mono text-micro tracking-wide uppercase px-1.5 py-0.5 border"
          style={{
            backgroundColor: nft.quantity && nft.quantity > 1 ? 'rgba(150, 170, 255, 0.15)' : `${rarityColor}15`,
            color: nft.quantity && nft.quantity > 1 ? 'var(--gs-purple)' : rarityColor,
            borderColor: nft.quantity && nft.quantity > 1 ? 'rgba(150, 170, 255, 0.30)' : `${rarityColor}30`,
            clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
          }}
        >
          {nft.quantity && nft.quantity > 1 ? 'MULTIPLE' : (rarityName === 'Unknown' ? 'N/A' : rarityName)}
        </span>

        {/* Market Scarcity Badge - Top Right */}
        {marketListings !== null && (
          <span
            className="absolute top-1.5 right-1.5 z-10 font-mono text-[7px] tracking-wide uppercase px-1 py-0.5 border"
            style={{
              backgroundColor: `${getMarketScarcityColor(marketListings)}15`,
              color: getMarketScarcityColor(marketListings),
              borderColor: `${getMarketScarcityColor(marketListings)}30`,
              clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))',
            }}
            title={`${marketListings} listed on market`}
          >
            {marketListings === 0 ? 'UNLISTED' : `${marketListings} LISTED`}
          </span>
        )}

        {/* Quantity Badge - Bottom Right with corner cut */}
        {nft.quantity && nft.quantity > 1 && (
          <span
            className="absolute bottom-1.5 right-1.5 z-10 font-mono text-label font-bold px-1.5 py-0.5 bg-[var(--gs-purple)] text-black"
            style={{ clipPath: 'polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))' }}
          >
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
          viewMode === 'small' ? 'text-data' : 'text-xs'
        }`}
        title={nft.name}
      >
        {nft.name}
      </p>

      {/* Item Type - Uses specific weapon type from typeSpec */}
      <p className={`font-mono uppercase tracking-wide text-[var(--gs-gray-3)] truncate ${
        viewMode === 'small' ? 'text-micro' : 'text-label'
      }`}>
        {getSpecificItemType(nft) || nft.collection}
      </p>

      {/* Detailed mode: Cost basis + enrichment indicator */}
      {portfolioViewMode === 'detailed' && (
        <div className="flex items-center gap-1.5 mt-1">
          {(() => {
            const cb = getCostBasisDisplay(nft);
            return (
              <span
                className="font-mono text-micro tracking-wide"
                style={{ color: cb.color }}
              >
                {cb.label}
              </span>
            );
          })()}
          {nft.acquisitionVenue ? (
            <span className="text-[var(--gs-profit)] text-micro" title={`Venue: ${getVenueLabel(nft.acquisitionVenue)}`}>{'\u2713'}</span>
          ) : isEnriching ? (
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)] animate-pulse inline-block" title="Enriching\u2026" />
          ) : (
            <span className="text-[var(--gs-gray-2)] text-micro">{'\u2014'}</span>
          )}
        </div>
      )}

      {/* Footer with Price & P&L */}
      <div className={`flex justify-between items-baseline border-t border-white/[0.06] ${
        viewMode === 'small' ? 'pt-2 mt-2' : 'pt-2.5 mt-2.5'
      }`}>
        {/* Price: Show shimmer if enriching and no price yet */}
        {isEnriching && priceGun === undefined ? (
          <span className={`skeleton-stat inline-block ${viewMode === 'small' ? 'w-12 h-3' : 'w-14 h-3.5'}`} />
        ) : (
          <span className={`font-mono text-[var(--gs-white)] ${
            viewMode === 'small' ? 'text-caption' : 'text-data'
          }`}>
            {priceDisplay}
          </span>
        )}
        {/* P&L: Show shimmer if enriching and no data yet */}
        {isEnriching && pnlPct === null ? (
          <span className={`skeleton-stat inline-block ${viewMode === 'small' ? 'w-8 h-3' : 'w-10 h-3.5'}`} />
        ) : (
          <span className={`font-mono ${
            viewMode === 'small' ? 'text-label' : 'text-caption'
          } ${
            isProfit ? 'text-[var(--gs-profit)]' :
            isLoss ? 'text-[var(--gs-loss)]' :
            'text-[var(--gs-gray-3)]'
          }`}>
            {pnlDisplay}
          </span>
        )}
      </div>

      {/* Mint Numbers - Bottom, each colored by its rarity */}
      <p
        className={`font-mono tracking-wide truncate mt-1.5 ${
          viewMode === 'small' ? 'text-label' : 'text-caption'
        }`}
        title={mintDisplay}
      >
        {mintData.length > 1 ? (
          mintData.map((m, i) => (
            <span key={m.mint}>
              <span style={{ color: getRarityColorByName(m.rarity) }}>{m.mint}</span>
              {i < mintData.length - 1 && <span className="text-[var(--gs-gray-3)]">, </span>}
            </span>
          ))
        ) : (
          <span style={{ color: rarityColor }}>{mintDisplay}</span>
        )}
      </p>
    </div>
  );
}
