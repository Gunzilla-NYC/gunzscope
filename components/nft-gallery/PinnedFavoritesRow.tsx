/**
 * Pinned Favorites Row
 *
 * Horizontal scrollable row of pinned favorites, rendered above the main gallery grid.
 * Uses the same NFTGalleryGridCard component — placement is the differentiator, not styling.
 *
 * Only renders when there are pinned items. Zero pinned = invisible.
 * Entrance: Matrix decode animation — scanline sweep, card materialize, digital rain.
 */

'use client';

import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type { NFT } from '@/lib/types';
import type { PinnedNFT } from '@/lib/hooks/usePinnedFavorites';
import type { MarketItemData } from './utils';
import { deriveCardData } from './utils';
import { NFTGalleryGridCard } from './NFTGalleryGridCard';
import { useItemOrigins } from '@/lib/contexts/ItemOriginsContext';
import { buildTokenKey } from '@/lib/utils/nftCache';

const NFTDetailModal = dynamic(() => import('../NFTDetailModal'), {
  ssr: false,
  loading: () => null,
});

/** Contract address for OTG NFTs on GunzChain */
const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_OTG_GAME_ITEM_CONTRACT ?? '';

/** Characters used for the decode scramble effect */
const MATRIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!?><{}[]=/\\|~^';

interface PinnedFavoritesRowProps {
  pinnedItems: PinnedNFT[];
  marketMap?: Map<string, MarketItemData>;
  currentGunPrice?: number;
  isEnriching?: boolean;
  isOwnPortfolio?: boolean;
  /** Wallet address passed to modal for acquisition pipeline */
  walletAddress?: string;
  /** All NFTs for related-items lookup in modal */
  allNfts?: NFT[];
  /** Wallet address → label lookup for displaying friendly names */
  walletLabels?: Map<string, string>;
}

/** Truncate address for cross-wallet badge */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
}

/** Decode text effect — scrambles characters then resolves to target text */
function DecodeText({ text, delayMs = 0 }: { text: string; delayMs?: number }) {
  const [display, setDisplay] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => setStarted(true), delayMs);
    return () => clearTimeout(startTimeout);
  }, [delayMs]);

  useEffect(() => {
    if (!started) return;

    const chars = text.split('');
    const resolved = new Array(chars.length).fill(false);
    let frame = 0;
    const totalFrames = 18; // ~300ms at 60fps

    const interval = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;

      // Resolve characters left-to-right with some randomness
      const resolveUpTo = Math.floor(progress * chars.length * 1.3);
      for (let i = 0; i < resolveUpTo && i < chars.length; i++) {
        if (!resolved[i] && Math.random() < 0.5 + progress * 0.5) {
          resolved[i] = true;
        }
      }

      const result = chars.map((ch, i) => {
        if (resolved[i] || ch === ' ') return ch;
        return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
      }).join('');

      setDisplay(result);

      if (resolved.every(Boolean) || frame > totalFrames + 5) {
        setDisplay(text);
        clearInterval(interval);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [started, text]);

  if (!started) return <span className="opacity-0">{text}</span>;
  return <>{display}</>;
}

/** Digital rain columns — lightweight random vertical lines */
function MatrixRain({ count = 12 }: { count?: number }) {
  const cols = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      left: `${(i / count) * 100 + Math.random() * (100 / count)}%`,
      delay: `${Math.random() * 0.4}s`,
      duration: `${0.4 + Math.random() * 0.4}s`,
      height: `${15 + Math.random() * 25}%`,
    })),
    [count],
  );

  return (
    <div className="matrix-rain">
      {cols.map((col, i) => (
        <div
          key={i}
          className="matrix-rain-col"
          style={{
            left: col.left,
            height: col.height,
            animationDelay: col.delay,
            animationDuration: col.duration,
          }}
        />
      ))}
    </div>
  );
}

export function PinnedFavoritesRow({
  pinnedItems,
  marketMap,
  currentGunPrice,
  isEnriching = false,
  isOwnPortfolio,
  walletAddress,
  allNfts,
  walletLabels,
}: PinnedFavoritesRowProps) {
  const { getItemOrigin } = useItemOrigins();

  // Track whether this is the initial mount (for entrance animation)
  const hasAnimated = useRef(false);
  const shouldAnimate = !hasAnimated.current;

  useEffect(() => {
    if (pinnedItems.length > 0) {
      hasAnimated.current = true;
    }
  }, [pinnedItems.length]);

  // Modal state — pinned row has its own modal (independent of gallery's)
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [selectedTokenKey, setSelectedTokenKey] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCardClick = useCallback((nft: NFT) => {
    const primaryTokenId = nft.tokenIds?.[0] || nft.tokenId;
    const tokenKey = buildTokenKey(nft.chain, NFT_CONTRACT_ADDRESS, primaryTokenId);
    setSelectedTokenKey(tokenKey);
    setSelectedNFT(nft);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setTimeout(() => {
      setSelectedNFT(null);
      setSelectedTokenKey(null);
    }, 300);
  }, []);

  // Pre-compute card data for each pinned item
  const cardDataList = useMemo(() =>
    pinnedItems.map(p => ({
      cardData: deriveCardData(p.nft, marketMap, currentGunPrice, getItemOrigin),
      pinnedNft: p,
    })),
    [pinnedItems, marketMap, currentGunPrice, getItemOrigin],
  );

  if (cardDataList.length === 0) return null;

  return (
    <div className={`mb-6 ${shouldAnimate ? 'matrix-container' : ''}`}>
      {/* Digital rain overlay — only on entrance */}
      {shouldAnimate && <MatrixRain count={14} />}

      {/* Section label — decode effect on entrance */}
      <div className={`flex items-center gap-2 mb-3 ${shouldAnimate ? 'matrix-label-decode' : ''}`}>
        <svg className="w-[11px] h-[11px] shrink-0 text-[var(--gs-lime)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)] leading-[11px]">
          {shouldAnimate ? <DecodeText text="Favorites" delayMs={150} /> : 'Favorites'}
        </span>
      </div>

      {/* Grid row — matches gallery small view column sizing */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {cardDataList.map(({ cardData, pinnedNft }, i) => {
          const key = `pinned-${pinnedNft.nft.chain}-${pinnedNft.nft.tokenId}`;
          return (
            <div
              key={key}
              className={shouldAnimate ? 'matrix-card-decode' : ''}
              style={shouldAnimate ? { animationDelay: `${0.15 + i * 0.12}s` } : undefined}
            >
              <NFTGalleryGridCard
                cardData={cardData}
                viewMode="small"
                isEnriching={isEnriching}
                onClick={handleCardClick}
                isOwnPortfolio={isOwnPortfolio}
                walletAddress={pinnedNft.sourceWallet !== 'unknown' ? pinnedNft.sourceWallet : walletAddress}
              />
              {/* Cross-wallet source badge — below the card */}
              {pinnedNft.isCrossWallet && (
                <div
                  className="flex justify-center mt-1.5"
                  style={shouldAnimate ? { animation: 'matrix-card-decode 0.4s cubic-bezier(0.16,1,0.3,1) both', animationDelay: `${0.4 + i * 0.12}s` } : undefined}
                >
                  {(() => {
                    const addr = pinnedNft.sourceWallet;
                    const label = addr !== 'unknown' ? walletLabels?.get(addr.toLowerCase()) : undefined;
                    return (
                      <span
                        className="font-mono text-[8px] uppercase tracking-wider text-[var(--gs-gray-3)]"
                        title={addr !== 'unknown' ? addr : undefined}
                      >
                        from {label || (addr !== 'unknown' ? truncateAddress(addr) : 'other wallet')}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtle divider */}
      <div
        className={`mt-4 border-t border-white/[0.04] ${shouldAnimate ? 'matrix-divider-decode' : ''}`}
        style={shouldAnimate ? { animationDelay: `${0.3 + cardDataList.length * 0.12}s` } : undefined}
      />

      {/* Modal for pinned items — independent from gallery modal */}
      <NFTDetailModal
        key={selectedTokenKey || 'no-pinned-selection'}
        nft={selectedNFT}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        walletAddress={walletAddress}
        allNfts={allNfts}
      />
    </div>
  );
}
