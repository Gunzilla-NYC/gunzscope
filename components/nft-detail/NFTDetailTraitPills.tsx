/**
 * NFT Detail Trait Pills
 *
 * Displays key traits as inline pill badges below the identity section.
 * Shows: Mint Number, Rarity, Class, Platform
 */

'use client';

import RarityBadge from '@/components/ui/RarityBadge';

interface NFTDetailTraitPillsProps {
  mintNumber?: string | number;
  rarity?: string;
  itemClass?: string;
  platform?: string;
}

export function NFTDetailTraitPills({
  mintNumber,
  rarity,
  itemClass,
  platform,
}: NFTDetailTraitPillsProps) {
  const hasPills = mintNumber || rarity || itemClass || platform;

  if (!hasPills) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2">
      {/* Mint Number */}
      {mintNumber && (
        <span className="inline-flex items-center px-2 py-0.5 bg-white/5 border border-white/10 font-mono text-caption text-white/70 tracking-wide">
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
    </div>
  );
}
