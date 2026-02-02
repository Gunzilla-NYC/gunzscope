'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { NFT } from '@/lib/types';
import { findCompatibleItems, getFunctionalTier, CompatibleItem } from '@/lib/weapon/weaponCompatibility';
import TierBadge from '@/components/ui/TierBadge';

// Rarity colors (same as NFTDetailModal)
const RARITY_COLORS: Record<string, { primary: string; border: string }> = {
  'Mythic': { primary: '#ff44ff', border: 'rgba(255, 68, 255, 0.65)' },
  'Legendary': { primary: '#ff8800', border: 'rgba(255, 136, 0, 0.65)' },
  'Epic': { primary: '#cc44ff', border: 'rgba(204, 68, 255, 0.65)' },
  'Rare': { primary: '#4488ff', border: 'rgba(68, 136, 255, 0.65)' },
  'Uncommon': { primary: '#44ff44', border: 'rgba(68, 255, 68, 0.65)' },
  'Common': { primary: '#888888', border: 'rgba(136, 136, 136, 0.65)' },
};

interface WeaponLabDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  weapon: NFT;
  inventory: NFT[];
}

function getRarityColor(nft: NFT): { primary: string; border: string } {
  const rarity = nft.traits?.['RARITY'] || nft.traits?.['Rarity'] || '';
  return RARITY_COLORS[rarity] || { primary: '#888888', border: 'rgba(136, 136, 136, 0.4)' };
}

function CompatibleItemCard({ item }: { item: CompatibleItem }) {
  const colors = getRarityColor(item.nft);
  const rarity = item.nft.traits?.['RARITY'] || item.nft.traits?.['Rarity'] || '';
  const tier = getFunctionalTier(item.nft);
  const categoryLabel = item.category === 'skin' ? 'Weapon Skin' : 'Weapon Attachment';

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg border transition-all hover:bg-white/5"
      style={{ borderColor: colors.border }}
    >
      {/* Thumbnail */}
      <div
        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black/30"
        style={{ borderColor: colors.border, borderWidth: 1 }}
      >
        <Image
          src={item.nft.image}
          alt={item.nft.name}
          width={56}
          height={56}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{item.nft.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-[10px] font-semibold"
            style={{ color: colors.primary }}
          >
            {rarity.toUpperCase()}
          </span>
          {tier !== 'Unknown' && <TierBadge tier={tier} showTooltip={false} />}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">{categoryLabel}</div>
      </div>
    </div>
  );
}

export default function WeaponLabDrawer({ isOpen, onClose, weapon, inventory }: WeaponLabDrawerProps) {
  const compatibleItems = useMemo(() => {
    return findCompatibleItems(weapon, inventory);
  }, [weapon, inventory]);

  const skins = compatibleItems.filter(item => item.category === 'skin');
  const attachments = compatibleItems.filter(item => item.category === 'attachment');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-80 max-w-[90vw]
          bg-[#181818] border-l border-[#64ffff]/20
          z-50 flex flex-col
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Weapon Lab"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Weapon Lab</h2>
          <button
            onClick={onClose}
            className="text-sm text-[#64ffff] hover:text-[#96aaff] transition flex items-center gap-1"
          >
            Exit Armory
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Available Modifications Section */}
          <section>
            <h3 className="text-[11px] uppercase tracking-wider text-gray-400 font-medium mb-3">
              Available Modifications
            </h3>

            {compatibleItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-sm">No modifications found in your inventory</p>
              </div>
            ) : (
              <div className="space-y-3">
                {skins.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 mb-2">Skins ({skins.length})</div>
                    <div className="space-y-2">
                      {skins.map(item => (
                        <CompatibleItemCard key={item.nft.tokenId} item={item} />
                      ))}
                    </div>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div className={skins.length > 0 ? 'mt-4' : ''}>
                    <div className="text-[10px] text-gray-500 mb-2">Attachments ({attachments.length})</div>
                    <div className="space-y-2">
                      {attachments.map(item => (
                        <CompatibleItemCard key={item.nft.tokenId} item={item} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Weapon Prototypes Section */}
          <section className="border-t border-white/10 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">
                WEAPON PROTOTYPES
              </h3>
              <span className="text-[9px] px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-500/10">
                Experimental
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mb-4">
              Configure, upgrade, and prototype weapons
            </p>
            <div className="text-center py-6 text-gray-600 border border-dashed border-gray-700 rounded-lg">
              <span className="text-sm">Coming soon</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
