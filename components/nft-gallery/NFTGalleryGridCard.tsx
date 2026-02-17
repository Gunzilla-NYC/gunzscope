/**
 * NFT Gallery Grid Card
 *
 * Single NFT card for small and medium grid views.
 * RENDER ONLY: All display data pre-computed via deriveCardData().
 */

'use client';

import { memo } from 'react';
import { NFTImage } from '@/components/ui/NFTImage';
import { getSpecificItemType } from '@/lib/nft/itemTypeUtils';
import { getRarityColorByName, getMarketScarcityColor, getCostBasisDisplay, getVenueLabel } from './utils';
import type { NFTGalleryGridCardProps } from './types';

export const NFTGalleryGridCard = memo(function NFTGalleryGridCard({ cardData, viewMode, isEnriching, onClick, portfolioViewMode }: NFTGalleryGridCardProps) {
  const {
    nft, rarityName, rarityColor, isMixedRarity, mintDisplay, mintData, nameInitials,
    pnlPct, isProfit, isLoss, priceGun, priceDisplay, pnlDisplay,
    marketListings,
  } = cardData;

  const isGrouped = !!(nft.quantity && nft.quantity > 1);
  // Cross-check mintData for rarity diversity (fallback if groupedRarities incomplete)
  const mintRarities = isGrouped ? new Set(mintData.map(m => m.rarity).filter(r => r !== 'Unknown')) : null;
  const hasMixedRarity = isMixedRarity || (mintRarities !== null && mintRarities.size > 1);
  // Grouped accent: rarity color when all same quality, yellow for mixed
  const groupAccent = hasMixedRarity ? '#22d3ee' : rarityColor;

  return (
    <div
      className={`nft-card-hover group bg-[var(--gs-dark-3)] border p-3 transition-[transform,border-color,box-shadow] duration-200 cursor-pointer hover:-translate-y-1 relative overflow-hidden ${
        isGrouped ? 'border-white/[0.06]' : 'border-white/[0.06]'
      }`}
      style={{
        clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
        '--rarity-border': isGrouped ? `${groupAccent}40` : `${rarityColor}40`,
        '--rarity-glow': isGrouped ? 'none' : `0 8px 20px ${rarityColor}15`,
      } as React.CSSProperties}
      onClick={() => onClick(nft)}
    >
      {/* Image Container — clean, no overlapping badges */}
      <div
        className="aspect-square relative bg-[var(--gs-dark-4)] mb-2 overflow-hidden"
        style={{
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          boxShadow: isGrouped ? `inset 0 0 0 1px ${groupAccent}20` : `inset 0 0 0 1px ${rarityColor}20`,
        }}
      >
        {/* Rarity accent — 2px left edge stripe (white for grouped, rarity color for single) */}
        <div
          className="absolute top-0 left-0 bottom-0 w-[2px] z-10"
          style={{ background: isGrouped ? groupAccent : rarityColor }}
        />

        {/* Image or Placeholder */}
        <NFTImage
          src={nft.image}
          alt={nft.name}
          fill
          className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          sizes={viewMode === 'small' ? '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw' : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw'}
          fallbackInitials={nameInitials}
          fallbackClassName="font-display text-3xl font-bold text-[var(--gs-gray-1)] group-hover:text-[var(--gs-gray-2)] transition-colors"
        />
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

      {/* Item Type + Rarity/Quantity inline */}
      <div className={`flex items-center gap-1.5 font-mono uppercase tracking-wide ${
        viewMode === 'small' ? 'text-micro' : 'text-label'
      }`}>
        <span className="text-[var(--gs-gray-3)] truncate">
          {getSpecificItemType(nft) || nft.collection}
        </span>
        {nft.quantity && nft.quantity > 1 ? (
          <span className="shrink-0 text-[var(--gs-gray-3)]">
            ×{nft.quantity}
          </span>
        ) : rarityName !== 'Unknown' && (
          <span className="shrink-0" style={{ color: rarityColor }}>
            {rarityName}
          </span>
        )}
      </div>

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
            <span key={`${m.mint}-${i}`}>
              <span style={{ color: getRarityColorByName(m.rarity) }}>{m.mint}</span>
              {i < mintData.length - 1 && <span className="text-[var(--gs-gray-3)]">, </span>}
            </span>
          ))
        ) : (
          <span style={{ color: rarityColor }}>{mintDisplay}</span>
        )}
      </p>

      {/* Market Scarcity — relocated from image badge */}
      {marketListings !== null && (
        <div className={`flex items-center justify-between mt-1 ${
          viewMode === 'small' ? 'text-label' : 'text-caption'
        }`}>
          <span className="font-mono uppercase tracking-wide text-[var(--gs-gray-2)]">
            {marketListings === 0 ? 'Unlisted' : `${marketListings} listed`}
          </span>
          <span
            className="font-mono"
            style={{ color: getMarketScarcityColor(marketListings) }}
          >
            {'\u25CF'}
          </span>
        </div>
      )}
    </div>
  );
});
