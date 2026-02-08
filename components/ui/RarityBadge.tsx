'use client';

type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic' | 'Classified';

interface RarityBadgeProps {
  rarity: Rarity | string;
  size?: 'sm' | 'md';
}

const rarityStyles: Record<string, { bg: string; text: string; border: string }> = {
  Common: {
    bg: 'rgba(138, 138, 138, 0.15)',
    text: '#8A8A8A',
    border: 'rgba(138, 138, 138, 0.2)',
  },
  Uncommon: {
    bg: 'rgba(74, 158, 173, 0.15)',
    text: '#4A9EAD',
    border: 'rgba(74, 158, 173, 0.2)',
  },
  Rare: {
    bg: 'rgba(74, 122, 255, 0.15)',
    text: '#4A7AFF',
    border: 'rgba(74, 122, 255, 0.2)',
  },
  Epic: {
    bg: 'rgba(180, 74, 255, 0.15)',
    text: '#B44AFF',
    border: 'rgba(180, 74, 255, 0.2)',
  },
  Legendary: {
    bg: 'rgba(255, 140, 0, 0.15)',
    text: '#FF8C00',
    border: 'rgba(255, 140, 0, 0.2)',
  },
  Mythic: {
    bg: 'rgba(255, 68, 102, 0.15)',
    text: '#FF4466',
    border: 'rgba(255, 68, 102, 0.2)',
  },
  Classified: {
    bg: 'rgba(231, 76, 60, 0.15)',
    text: '#E74C3C',
    border: 'rgba(231, 76, 60, 0.2)',
  },
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-micro',
  md: 'px-2 py-1 text-label',
};

export default function RarityBadge({ rarity, size = 'sm' }: RarityBadgeProps) {
  // Normalize rarity string (capitalize first letter)
  const normalizedRarity = rarity.charAt(0).toUpperCase() + rarity.slice(1).toLowerCase();
  const styles = rarityStyles[normalizedRarity] || rarityStyles.Common;

  return (
    <span
      className={`
        inline-flex items-center
        font-mono font-normal uppercase tracking-[1px]
        clip-corner-sm
        ${sizeClasses[size]}
      `}
      style={{
        backgroundColor: styles.bg,
        color: styles.text,
        border: `1px solid ${styles.border}`,
      }}
    >
      {normalizedRarity === 'Classified' && <span className="mr-1">🔒</span>}
      {rarity}
    </span>
  );
}
