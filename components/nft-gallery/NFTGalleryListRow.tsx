/**
 * NFT Gallery List Row
 *
 * Single NFT row for list view.
 * RENDER ONLY: All display data pre-computed via deriveCardData().
 */

'use client';

import { memo } from 'react';
import { NFTImage } from '@/components/ui/NFTImage';
import { getSpecificItemType } from '@/lib/nft/itemTypeUtils';
import { getRarityColorByName, getMarketScarcityColor, getCostBasisDisplay, getVenueLabel, ORIGIN_CATEGORY_COLORS } from './utils';
import type { NFTGalleryListRowProps } from './types';

export const NFTGalleryListRow = memo(function NFTGalleryListRow({ cardData, isEnriching, onClick, portfolioViewMode }: NFTGalleryListRowProps) {
  const {
    nft, rarityName, rarityColor, isMixedRarity, mintDisplay, mintData, nameInitials,
    pnlPct, pnlPending, isProfit, isLoss, priceGun, pnlDisplay, unrealizedUsd, marketListings,
  } = cardData;

  const isGrouped = !!(nft.quantity && nft.quantity > 1);
  const mintRarities = isGrouped ? new Set(mintData.map(m => m.rarity).filter(r => r !== 'Unknown')) : null;
  const hasMixedRarity = isMixedRarity || (mintRarities !== null && mintRarities.size > 1);
  const groupAccent = hasMixedRarity ? '#22d3ee' : rarityColor;

  return (
    <div
      className="nft-card-hover group bg-[var(--gs-dark-3)] border border-white/[0.06] overflow-hidden transition-[transform,border-color,box-shadow] duration-200 cursor-pointer flex items-center gap-4 p-3 hover:-translate-y-0.5 relative"
      style={{
        '--rarity-border': `${rarityColor}40`,
        '--rarity-glow': `0 4px 12px ${rarityColor}10`,
      } as React.CSSProperties}
      onClick={() => onClick(nft)}
    >
      {/* Left accent line — white for grouped, rarity fade for single */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-[2px] transition-opacity duration-300 ${
          isGrouped ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{ background: isGrouped
          ? groupAccent
          : `linear-gradient(180deg, ${rarityColor}, transparent)`
        }}
      />
      {/* Thumbnail */}
      <div className="w-14 h-14 flex-shrink-0 relative bg-[var(--gs-dark-4)] overflow-hidden">
        {/* Quality Badge — rarity abbreviation for singles, ×N for grouped */}
        <span
          className="absolute top-0.5 left-0.5 z-10 font-mono text-[8px] tracking-wide uppercase px-1 py-0.5"
          style={{
            color: nft.quantity && nft.quantity > 1 ? 'rgba(255,255,255,0.60)' : rarityColor,
            backgroundColor: nft.quantity && nft.quantity > 1 ? 'rgba(255,255,255,0.08)' : `${rarityColor}18`,
            border: nft.quantity && nft.quantity > 1 ? '1px solid rgba(255,255,255,0.15)' : `1px solid ${rarityColor}60`,
          }}
        >
          {nft.quantity && nft.quantity > 1 ? `×${nft.quantity}` : (rarityName === 'Unknown' ? '—' : rarityName.slice(0, 4))}
        </span>

        <NFTImage
          src={nft.image}
          alt={nft.name}
          fill
          className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          sizes="56px"
          fallbackInitials={nameInitials}
        />
      </div>

      {/* Info */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-display font-semibold text-xs uppercase tracking-wide text-[var(--gs-white)] truncate" title={nft.name}>
            {nft.name}
          </p>
          {portfolioViewMode === 'detailed' && nft.acquisitionVenue && (
            <span className="font-mono text-[8px] tracking-wide uppercase px-1 py-0.5 bg-white/5 text-[var(--gs-gray-3)] border border-white/[0.06] shrink-0">
              {getVenueLabel(nft.acquisitionVenue)}
            </span>
          )}
          {cardData.originShortName && cardData.originCategory && (
            <span
              className="font-mono text-[8px] tracking-wide uppercase px-1 py-0.5 shrink-0"
              style={{
                color: ORIGIN_CATEGORY_COLORS[cardData.originCategory].text,
                backgroundColor: `${ORIGIN_CATEGORY_COLORS[cardData.originCategory].bg}15`,
                border: `1px solid ${ORIGIN_CATEGORY_COLORS[cardData.originCategory].bg}40`,
              }}
            >
              {cardData.originShortName}
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

      {/* P&L — Dual Track */}
      <div className="flex-shrink-0 text-right min-w-[70px]">
        <p className="font-mono text-label text-[var(--gs-gray-4)] uppercase">P&L</p>
        {isEnriching && pnlPending && pnlPct === null ? (
          <span className="skeleton-stat inline-block w-10 h-3.5 mt-0.5" />
        ) : (
          <>
            {/* Track A: GUN Appreciation */}
            {cardData.trackADisplay ? (
              <p className={`font-mono text-caption font-medium ${
                cardData.trackAPnlPct !== null && cardData.trackAPnlPct > 1 ? 'text-[var(--gs-profit)]' :
                cardData.trackAPnlPct !== null && cardData.trackAPnlPct < -1 ? 'text-[var(--gs-loss)]' :
                'text-[var(--gs-gray-3)]'
              }`}>
                {cardData.trackADisplay}{' '}
                <span className="text-[var(--gs-gray-2)] text-[8px]">GUN</span>
              </p>
            ) : (
              <p className={`font-mono text-caption font-medium ${
                isProfit ? 'text-[var(--gs-profit)]' :
                isLoss ? 'text-[var(--gs-loss)]' :
                'text-[var(--gs-gray-3)]'
              }`}>
                {pnlDisplay}
              </p>
            )}
            {/* Track B: Market Exit */}
            {cardData.trackBPnlPct !== null && (
              <p className={`font-mono text-[8px] mt-0.5 ${
                cardData.trackBPnlPct > 1 ? 'text-[var(--gs-profit)]/70' :
                cardData.trackBPnlPct < -1 ? 'text-[var(--gs-loss)]/70' :
                'text-[var(--gs-gray-3)]'
              }`}>
                {cardData.trackBPnlPct > 1 ? '\u25B2' : cardData.trackBPnlPct < -1 ? '\u25BC' : '\u2013'}{' '}
                {cardData.trackBPnlPct >= 0 ? '+' : ''}{cardData.trackBPnlPct.toFixed(1)}%{' '}
                <span className="text-[var(--gs-gray-2)]">MARKET</span>
              </p>
            )}
          </>
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
});
