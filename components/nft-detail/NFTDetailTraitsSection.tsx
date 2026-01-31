/**
 * NFT Detail Traits Section
 *
 * RENDER ONLY: No computations, no fetching, no derive logic.
 * All trait filtering happens in the parent component.
 */

import type { TraitsViewModel } from './types';

interface NFTDetailTraitsSectionProps extends TraitsViewModel {}

export function NFTDetailTraitsSection({ filteredTraits }: NFTDetailTraitsSectionProps) {
  if (Object.keys(filteredTraits).length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 h-full flex flex-col">
      {/* Card title */}
      <h4 className="text-sm font-semibold tracking-wide text-white/80 mb-2">
        Traits
      </h4>
      <div className="h-px bg-white/10 mb-4" />

      {/* Traits list: Mint Number, Rarity, Class, Platform */}
      <div className="space-y-4">
        {filteredTraits['Serial Number'] && (
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Mint Number</p>
            <p className="text-sm font-medium text-white/90 whitespace-nowrap tracking-tight leading-tight">{filteredTraits['Serial Number']}</p>
          </div>
        )}
        {filteredTraits['Rarity'] && (
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Rarity</p>
            <p className="text-sm font-medium text-white/90 whitespace-nowrap tracking-tight leading-tight">{filteredTraits['Rarity']}</p>
          </div>
        )}
        {filteredTraits['Class'] && (
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Class</p>
            <p className="text-sm font-medium text-white/90 whitespace-nowrap tracking-tight leading-tight">{filteredTraits['Class']}</p>
          </div>
        )}
        {filteredTraits['Platform'] && (
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-white/55 mb-1">Platform</p>
            <p className="text-sm font-medium text-white/90 whitespace-nowrap tracking-tight leading-tight">{filteredTraits['Platform']}</p>
          </div>
        )}
      </div>
    </div>
  );
}
