'use client';

import { useMemo, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { NFT } from '@/lib/types';
import { findCompatibleItems, getFunctionalTier, CompatibleItem } from '@/lib/weapon/weaponCompatibility';
import { getRarityColors } from '@/lib/utils/rarityColors';
import TierBadge from '@/components/ui/TierBadge';

interface WeaponLabDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  weapon: NFT;
  inventory: NFT[];
}

const SPRING = { stiffness: 300, damping: 30, mass: 0.8 };

function CompatibleItemCard({ item }: { item: CompatibleItem }) {
  const [imageError, setImageError] = useState(false);
  const colors = getRarityColors(item.nft);
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
        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black/30 border"
        style={{ borderColor: colors.border }}
      >
        {!imageError && item.nft.image ? (
          <Image
            src={item.nft.image}
            alt={item.nft.name}
            width={56}
            height={56}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{item.nft.name}</div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-caption font-semibold"
            style={{ color: colors.primary }}
          >
            {rarity.toUpperCase()}
          </span>
          {tier !== 'Unknown' && <TierBadge tier={tier} showTooltip={false} />}
        </div>
        <div className="text-caption text-gray-500 mt-0.5">{categoryLabel}</div>
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

  // Handle Escape key to close drawer
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="wl-backdrop"
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Drawer */}
          <motion.div
            key="wl-drawer"
            className="fixed top-0 right-0 h-full w-80 max-w-[90vw] bg-[#181818] border-l border-[#64ffff]/20 z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Weapon Lab"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', ...SPRING }}
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
                <h3 className="text-data uppercase tracking-wider text-gray-400 font-medium mb-3">
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
                        <div className="text-caption text-gray-500 mb-2">Skins ({skins.length})</div>
                        <div className="space-y-2">
                          {skins.map(item => (
                            <CompatibleItemCard key={item.nft.tokenId} item={item} />
                          ))}
                        </div>
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className={skins.length > 0 ? 'mt-4' : ''}>
                        <div className="text-caption text-gray-500 mb-2">Attachments ({attachments.length})</div>
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
                  <h3 className="text-data uppercase tracking-wider text-gray-400 font-medium">
                    WEAPON PROTOTYPES
                  </h3>
                  <span className="text-label px-1.5 py-0.5 rounded border border-amber-500/40 text-amber-400 bg-amber-500/10">
                    Experimental
                  </span>
                </div>
                <p className="text-data text-gray-500 mb-4">
                  Configure, upgrade, and prototype weapons
                </p>
                <div className="text-center py-6 text-gray-600 border border-dashed border-gray-700 rounded-lg">
                  <span className="text-sm">Coming soon</span>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
