/**
 * NFT Detail Trait Pills
 *
 * Displays key traits as inline pill badges below the identity section.
 * Shows: Mint Number, Rarity, Class, Platform
 *
 * When rarityColor is provided (grouped items), mint pill uses
 * colored text + transparent fill + colored border to match rarity.
 */

'use client';

import RarityBadge from '@/components/ui/RarityBadge';
import { CATEGORY_COLORS, type OriginCategory } from '@/lib/data/itemOrigins';

interface NFTDetailTraitPillsProps {
  mintNumber?: string | number;
  rarity?: string;
  /** Primary rarity color (hex) for the active item — tints the mint pill */
  rarityColor?: string;
  itemClass?: string;
  platform?: string;
  /** Origin release short name (e.g., "Hexmas", "ChemTech Set") */
  originShortName?: string;
  /** Origin category for badge coloring */
  originCategory?: OriginCategory;
}

export function NFTDetailTraitPills({
  mintNumber,
  rarity,
  rarityColor,
  itemClass,
  platform,
  originShortName,
  originCategory,
}: NFTDetailTraitPillsProps) {
  const hasPills = mintNumber || rarity || itemClass || platform || originShortName;

  if (!hasPills) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
      {/* Mint Number — rarity-colored when viewing grouped items */}
      {mintNumber && (
        <span
          className="inline-flex items-center px-2 py-0.5 font-mono text-caption tracking-wide"
          style={rarityColor ? {
            color: rarityColor,
            backgroundColor: `${rarityColor}18`,
            border: `1px solid ${rarityColor}60`,
          } : {
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.70)',
          }}
        >
          #{mintNumber}
        </span>
      )}

      {/* Rarity - use brand RarityBadge */}
      {rarity && <RarityBadge rarity={rarity} size="sm" />}

      {/* Class */}
      {itemClass && (
        <span className="inline-flex items-center px-2 py-0.5 bg-[var(--gs-purple)]/10 border border-[var(--gs-purple)]/20 font-mono text-caption text-[var(--gs-purple)] uppercase tracking-wide">
          {itemClass}
        </span>
      )}

      {/* Platform */}
      {platform && (
        <span className="inline-flex items-center px-2 py-0.5 bg-white/5 border border-white/10 font-mono text-caption text-white/60 uppercase tracking-wide">
          {platform}
        </span>
      )}

      {/* Origin */}
      {originShortName && originCategory && (
        <span
          className="inline-flex items-center px-2 py-0.5 font-mono text-caption uppercase tracking-wide"
          style={{
            color: CATEGORY_COLORS[originCategory].text,
            backgroundColor: `${CATEGORY_COLORS[originCategory].bg}15`,
            border: `1px solid ${CATEGORY_COLORS[originCategory].bg}40`,
          }}
        >
          {originShortName}
        </span>
      )}
    </div>
  );
}
