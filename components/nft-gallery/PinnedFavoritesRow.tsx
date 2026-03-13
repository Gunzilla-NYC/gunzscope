/**
 * Pinned Favorites Row
 *
 * Horizontal scrollable row of pinned favorites, rendered above the main gallery grid.
 * Uses the same NFTGalleryGridCard component — placement is the differentiator, not styling.
 *
 * Only renders when there are pinned items. Zero pinned = invisible.
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
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
}

/** Truncate address for cross-wallet badge */
function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}\u2026${address.slice(-4)}`;
}

export function PinnedFavoritesRow({
  pinnedItems,
  marketMap,
  currentGunPrice,
  isEnriching = false,
  isOwnPortfolio,
  walletAddress,
  allNfts,
}: PinnedFavoritesRowProps) {
  const { getItemOrigin } = useItemOrigins();

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
    <div className="mb-6">
      {/* Section label — subtle, integrated */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-3.5 h-3.5 text-[var(--gs-lime)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
        <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
          Favorites
        </span>
      </div>

      {/* Horizontal scroll row — small cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10 snap-x snap-mandatory">
        {cardDataList.map(({ cardData, pinnedNft }) => {
          const key = `pinned-${pinnedNft.nft.chain}-${pinnedNft.nft.tokenId}`;
          return (
            <div
              key={key}
              className="flex-shrink-0 w-[130px] sm:w-[140px] snap-start"
            >
              <NFTGalleryGridCard
                cardData={cardData}
                viewMode="small"
                isEnriching={isEnriching}
                onClick={handleCardClick}
                isOwnPortfolio={isOwnPortfolio}
              />
              {/* Cross-wallet source badge — below the card */}
              {pinnedNft.isCrossWallet && pinnedNft.sourceWallet !== 'unknown' && (
                <div className="flex justify-center mt-1.5">
                  <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--gs-gray-3)]">
                    from {truncateAddress(pinnedNft.sourceWallet)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Subtle divider */}
      <div className="mt-4 border-t border-white/[0.04]" />

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
