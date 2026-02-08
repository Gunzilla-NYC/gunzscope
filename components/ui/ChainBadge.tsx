'use client';

type Chain = 'gunzchain' | 'solana' | 'avalanche';

interface ChainBadgeProps {
  chain: Chain | string;
  size?: 'sm' | 'md';
}

const chainStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  gunzchain: {
    bg: 'rgba(166, 247, 0, 0.1)',
    text: 'var(--gs-lime)',
    border: 'rgba(166, 247, 0, 0.2)',
    label: 'GUNZ',
  },
  avalanche: {
    bg: 'rgba(166, 247, 0, 0.1)',
    text: 'var(--gs-lime)',
    border: 'rgba(166, 247, 0, 0.2)',
    label: 'GUNZ',
  },
  solana: {
    bg: 'rgba(153, 69, 255, 0.1)',
    text: '#9945FF',
    border: 'rgba(153, 69, 255, 0.2)',
    label: 'SOL',
  },
};

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-micro',
  md: 'px-2 py-1 text-label',
};

export default function ChainBadge({ chain, size = 'sm' }: ChainBadgeProps) {
  const normalizedChain = chain.toLowerCase();
  const styles = chainStyles[normalizedChain] || chainStyles.gunzchain;

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
      {styles.label}
    </span>
  );
}
