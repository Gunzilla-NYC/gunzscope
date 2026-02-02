'use client';

import { FunctionalTier } from '@/lib/weapon/weaponCompatibility';

interface TierBadgeProps {
  tier: FunctionalTier;
  className?: string;
  showTooltip?: boolean;
}

// Tier color palette (complements existing rarity colors)
const TIER_STYLES: Record<FunctionalTier, { bg: string; border: string; text: string }> = {
  Standard: { bg: 'bg-gray-500/10', border: 'border-gray-500/30', text: 'text-gray-400' },
  Refined: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400' },
  Elite: { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-400' },
  Premium: { bg: 'bg-purple-500/15', border: 'border-purple-500/40', text: 'text-purple-400' },
  Classified: { bg: 'bg-red-500/15', border: 'border-red-500/50', text: 'text-red-400' },
  Unknown: { bg: 'bg-gray-500/10', border: 'border-gray-500/20', text: 'text-gray-500' },
};

// Tier tooltip descriptions
const TIER_TOOLTIPS: Record<FunctionalTier, string> = {
  Standard: 'Base-level item — standard issue from loot drops and early progression',
  Refined: 'Upgraded item — improved through crafting or earned via gameplay milestones',
  Elite: 'High-tier item — rare drop with enhanced attributes',
  Premium: 'Top-tier item — among the rarest drops available in-game',
  Classified: 'Special edition — promotional or ranked reward, cannot be modified',
  Unknown: 'Tier data unavailable',
};

// Lock icon SVG for Classified items
const LockIcon = () => (
  <svg
    className="w-3 h-3 mr-1 inline-block"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
    />
  </svg>
);

export default function TierBadge({ tier, className = '', showTooltip = true }: TierBadgeProps) {
  const styles = TIER_STYLES[tier] || TIER_STYLES.Unknown;
  const tooltip = TIER_TOOLTIPS[tier] || TIER_TOOLTIPS.Unknown;
  const isClassified = tier === 'Classified';

  return (
    <span className={`relative group inline-flex items-center ${className}`}>
      <span
        className={`
          inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium
          border ${styles.bg} ${styles.border} ${styles.text}
          ${isClassified ? 'font-semibold' : ''}
        `}
      >
        {isClassified && <LockIcon />}
        {tier}
      </span>

      {showTooltip && (
        <span
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2
            text-[11px] text-white/90 bg-black/95 border border-white/20
            rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible
            group-hover:opacity-100 group-hover:visible
            transition-all duration-200 pointer-events-none z-50
          "
        >
          {tooltip}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0
              border-l-4 border-r-4 border-t-4
              border-transparent border-t-black/95"
          />
        </span>
      )}
    </span>
  );
}
