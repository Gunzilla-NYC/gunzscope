'use client';

import { NFT } from '@/lib/types';
import { NFTImage } from '@/components/ui/NFTImage';
import { getRarityColorForNft } from '@/lib/nft/nftDetailHelpers';

// =============================================================================
// Props
// =============================================================================

export interface WeaponLabPanelProps {
  relatedItems: NFT[];
  relatedItemsExpanded: boolean;
  onClose: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function WeaponLabPanel({
  relatedItems,
  relatedItemsExpanded,
  onClose,
}: WeaponLabPanelProps) {
  return (
    <div
      className={`relative max-h-[85vh] bg-[var(--gs-dark-1)] rounded-r-2xl overflow-hidden flex flex-col transform transition-all duration-300 origin-left ${
        relatedItemsExpanded
          ? 'w-[320px] opacity-100 scale-x-100'
          : 'w-0 opacity-0 scale-x-0'
      }`}
      style={{
        boxShadow: relatedItemsExpanded ? '0 25px 50px -12px rgba(0, 0, 0, 0.8)' : 'none',
      }}
    >
      {/* Panel Header */}
      <div className="h-12 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            Weapon Lab
          </h3>
          <span className="font-mono text-[8px] uppercase tracking-widest px-1 py-0.5 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30 bg-[var(--gs-purple)]/[0.06]">
            Experimental
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition p-1 rounded hover:bg-white/5 flex items-center gap-1 text-xs"
          title="Exit Armory"
        >
          <span className="text-caption text-gray-500">Exit Armory</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto scrollbar-premium">
        {/* Available Modifications Section */}
        <div className="p-3">
          <h4 className="text-xs font-semibold text-[#64ffff] uppercase tracking-wider mb-2">
            Available Modifications
          </h4>
          <div className="space-y-2">
            {relatedItems.map((item) => {
              const itemColors = getRarityColorForNft(item);
              const itemRarity = item.traits?.['RARITY'] || item.traits?.['Rarity'] || 'Unknown';
              const itemClass = item.traits?.['CLASS'] || item.traits?.['Class'] || '';
              const quantity = item.quantity || 1;

              return (
                <div
                  key={item.tokenId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition cursor-pointer"
                  style={{
                    borderLeft: `3px solid ${itemColors.primary}`,
                  }}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-black/50">
                    <NFTImage
                      src={item.image}
                      alt={item.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-caption font-semibold uppercase"
                        style={{ color: itemColors.primary }}
                      >
                        {itemRarity}
                      </span>
                      <span className="text-caption text-gray-500">
                        {itemClass === 'Weapon Skin' ? 'Skin' : itemClass}
                      </span>
                    </div>
                  </div>

                  {/* Quantity Badge */}
                  {quantity > 1 && (
                    <div
                      className="flex-shrink-0 px-2 py-0.5 text-xs font-semibold"
                      style={{
                        color: '#96aaff',
                        backgroundColor: 'rgba(150, 170, 255, 0.09)',
                        border: '1px solid rgba(150, 170, 255, 0.38)',
                      }}
                    >
                      ×{quantity}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weapon Prototypes Section */}
        <div className="p-3 border-t border-white/[0.08]">
          <h4 className="text-xs font-semibold text-[#96aaff] uppercase tracking-wider mb-1">
            Weapon Prototypes
          </h4>
          <p className="text-caption text-gray-500 mb-3">
            Configure, upgrade, and prototype weapons
          </p>
          <div className="flex items-center justify-center py-6 text-gray-600 text-xs">
            <span className="text-center">Coming soon</span>
          </div>
        </div>
      </div>

      {/* Panel Footer with summary */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.06] text-xs text-gray-500">
        {(() => {
          const skins = relatedItems.filter(i => (i.traits?.['CLASS'] || i.traits?.['Class']) === 'Weapon Skin');
          const accessories = relatedItems.filter(i => (i.traits?.['CLASS'] || i.traits?.['Class']) === 'Accessory');
          const parts = [];
          if (skins.length > 0) parts.push(`${skins.length} skin${skins.length > 1 ? 's' : ''}`);
          if (accessories.length > 0) parts.push(`${accessories.length} attachment${accessories.length > 1 ? 's' : ''}`);
          return parts.join(', ') || 'No modifications';
        })()}
      </div>
    </div>
  );
}
