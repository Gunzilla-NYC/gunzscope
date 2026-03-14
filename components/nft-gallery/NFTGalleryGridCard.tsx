/**
 * NFT Gallery Grid Card
 *
 * Single NFT card for small and medium grid views.
 * RENDER ONLY: All display data pre-computed via deriveCardData().
 */

'use client';

import { memo } from 'react';
import { NFTImage } from '@/components/ui/NFTImage';
import FavoriteButton from '@/components/FavoriteButton';
import { getSpecificItemType } from '@/lib/nft/itemTypeUtils';
import { getRarityColorByName, getMarketScarcityColor, getCostBasisDisplay, getVenueLabel, ORIGIN_CATEGORY_COLORS } from './utils';
import { ValuationLabel } from './ValuationLabel';
import type { NFTGalleryGridCardProps } from './types';

/** Favorite action — favoriting automatically pins to the cross-wallet row */
function FavoritePinActions({ refId, nft, walletAddress }: { refId: string; nft: NFTGalleryGridCardProps['cardData']['nft']; walletAddress?: string }) {
  return (
    <FavoriteButton
      type="nft"
      refId={refId}
      size="sm"
      className="hover:bg-black/80 rounded-none"
      metadata={{
        name: nft.name, image: nft.image, collection: nft.collection,
        ...(walletAddress ? { walletAddress } : {}),
        ...(nft.quantity && nft.quantity > 1 ? { quantity: nft.quantity } : {}),
        ...(nft.mintNumber ? { mintNumber: nft.mintNumber } : {}),
        ...(nft.mintNumbers?.length ? { mintNumbers: nft.mintNumbers } : {}),
        ...(nft.groupedRarities?.length ? { groupedRarities: nft.groupedRarities } : {}),
        ...(nft.traits ? { traits: nft.traits } : {}),
      }}
    />
  );
}

export const NFTGalleryGridCard = memo(function NFTGalleryGridCard({ cardData, viewMode, isEnriching, onClick, portfolioViewMode, isOwnPortfolio, walletAddress }: NFTGalleryGridCardProps) {
  const {
    nft, rarityName, rarityColor, isMixedRarity, mintDisplay, mintData, nameInitials,
    pnlPct, pnlPending, isProfit, isLoss, priceGun, priceDisplay, pnlDisplay, unrealizedUsd,
    marketListings,
  } = cardData;

  const isGrouped = !!(nft.quantity && nft.quantity > 1);
  // Cross-check mintData for rarity diversity (fallback if groupedRarities incomplete)
  const mintRarities = isGrouped ? new Set(mintData.reduce<string[]>((acc, m) => { if (m.rarity !== 'Unknown') acc.push(m.rarity); return acc; }, [])) : null;
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
        '--rarity-border': isGrouped ? `${groupAccent}70` : `${rarityColor}70`,
        '--rarity-glow': isGrouped ? `0 4px 16px ${groupAccent}25` : `0 8px 24px ${rarityColor}30`,
      } as React.CSSProperties}
      onClick={() => onClick(nft)}
    >
      {/* Image Container — clean, no overlapping badges */}
      <div className="relative mb-2">
        <div
          className="aspect-square relative bg-[var(--gs-dark-4)] overflow-hidden"
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

        {/* Favorite + Pin actions — outside clip-path so clicks always register */}
        {isOwnPortfolio && nft.contractAddress && (
          <div
            className="absolute bottom-1 right-1 z-10 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <FavoritePinActions
              refId={`${nft.contractAddress}:${nft.tokenId}`}
              nft={nft}
              walletAddress={walletAddress}
            />
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

      {/* Origin badge */}
      {cardData.originShortName && cardData.originCategory && (
        <span
          className={`inline-block font-mono uppercase tracking-wide mt-1 px-1.5 py-0.5 ${
            viewMode === 'small' ? 'text-micro' : 'text-label'
          }`}
          style={{
            color: ORIGIN_CATEGORY_COLORS[cardData.originCategory].text,
            backgroundColor: `${ORIGIN_CATEGORY_COLORS[cardData.originCategory].bg}15`,
            border: `1px solid ${ORIGIN_CATEGORY_COLORS[cardData.originCategory].bg}40`,
          }}
        >
          {cardData.originShortName}
        </span>
      )}

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

      {/* Footer with Price & Dual-Track P&L */}
      <div className={`border-t border-white/[0.06] ${
        viewMode === 'small' ? 'pt-2 mt-2' : 'pt-2.5 mt-2.5'
      }`}>
        {/* Small cards: single line (merged P&L) */}
        {viewMode === 'small' ? (
          <div className="flex justify-between items-start">
            {isEnriching && priceGun === undefined ? (
              <span className="skeleton-stat inline-block w-12 h-3" />
            ) : (
              <span className="font-mono text-caption text-[var(--gs-white)]">{priceDisplay}</span>
            )}
            <div className="text-right">
              {isEnriching && pnlPending && pnlPct === null ? (
                <span className="skeleton-stat inline-block w-8 h-3" />
              ) : (
                <span className={`font-mono text-label ${
                  isProfit ? 'text-[var(--gs-profit)]' :
                  isLoss ? 'text-[var(--gs-loss)]' :
                  'text-[var(--gs-gray-3)]'
                }`}>
                  {pnlDisplay}
                </span>
              )}
              <ValuationLabel valuation={cardData.valuationMethod} className="block mt-0.5" />
            </div>
          </div>
        ) : (
          /* Medium cards: dual-track lines */
          <div className="space-y-1">
            {/* Track A: GUN Appreciation */}
            <div className="flex justify-between items-baseline">
              {isEnriching && priceGun === undefined ? (
                <span className="skeleton-stat inline-block w-14 h-3.5" />
              ) : (
                <span className="font-mono text-data text-[var(--gs-white)]">{priceDisplay}</span>
              )}
              {isEnriching && pnlPending && pnlPct === null ? (
                <span className="skeleton-stat inline-block w-10 h-3.5" />
              ) : cardData.trackADisplay ? (
                <span className={`font-mono text-caption ${
                  cardData.trackAPnlPct !== null && cardData.trackAPnlPct > 1 ? 'text-[var(--gs-profit)]' :
                  cardData.trackAPnlPct !== null && cardData.trackAPnlPct < -1 ? 'text-[var(--gs-loss)]' :
                  'text-[var(--gs-gray-3)]'
                }`}>
                  {cardData.trackADisplay}{' '}
                  <span className="text-[var(--gs-gray-2)]">GUN</span>
                </span>
              ) : pnlPct !== null ? (
                <span className={`font-mono text-caption ${
                  isProfit ? 'text-[var(--gs-profit)]' :
                  isLoss ? 'text-[var(--gs-loss)]' :
                  'text-[var(--gs-gray-3)]'
                }`}>
                  {pnlDisplay}
                </span>
              ) : null}
            </div>
            {/* Track B: Market Exit — only show for sales-based tiers (1-4), not proxies */}
            {cardData.trackBDisplay && cardData.trackBIsSalesBased && (
              <div className="flex justify-between items-baseline">
                <span className="font-mono text-caption text-[var(--gs-gray-3)]">
                  {cardData.trackBDisplay}
                </span>
                {cardData.trackBPnlPct !== null ? (
                  <span className={`font-mono text-caption ${
                    cardData.trackBPnlPct > 1 ? 'text-[var(--gs-profit)]/70' :
                    cardData.trackBPnlPct < -1 ? 'text-[var(--gs-loss)]/70' :
                    'text-[var(--gs-gray-3)]'
                  }`}>
                    {cardData.trackBPnlPct > 1 ? '\u25B2' : cardData.trackBPnlPct < -1 ? '\u25BC' : '\u2013'}{' '}
                    {cardData.trackBPnlPct >= 0 ? '+' : ''}{cardData.trackBPnlPct.toFixed(1)}%{' '}
                    <span className="text-[var(--gs-gray-2)]">MARKET</span>
                  </span>
                ) : (
                  <span className="font-mono text-[8px] text-[var(--gs-gray-2)]">MARKET</span>
                )}
              </div>
            )}
            {/* Valuation source label */}
            <ValuationLabel valuation={cardData.valuationMethod} className="block text-right" />
          </div>
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
          <>
            {mintData.slice(0, 3).map((m, i) => (
              <span key={`${m.mint}-${i}`}>
                <span style={{ color: getRarityColorByName(m.rarity) }}>{m.mint}</span>
                {i < Math.min(mintData.length, 3) - 1 && <span className="text-[var(--gs-gray-3)]">, </span>}
              </span>
            ))}
            {mintData.length > 3 && <span className="text-[var(--gs-gray-3)]">, &hellip;</span>}
          </>
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
