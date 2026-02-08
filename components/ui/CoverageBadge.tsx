'use client';

interface CoverageBadgeProps {
  coverage: number; // 0-1 fraction
  className?: string;
}

/**
 * Badge component showing P&L data coverage level.
 * Color-coded: green (high), yellow (partial), red (limited).
 */
export default function CoverageBadge({ coverage, className = '' }: CoverageBadgeProps) {
  const percentage = Math.round(coverage * 100);

  const getLevel = () => {
    if (coverage >= 0.8) {
      return {
        label: 'High',
        color: 'text-[var(--gs-profit)]',
        bg: 'bg-[var(--gs-profit)]/10',
        border: 'border-[var(--gs-profit)]/30',
      };
    }
    if (coverage >= 0.5) {
      return {
        label: 'Partial',
        color: 'text-[#f5a623]',
        bg: 'bg-[#f5a623]/10',
        border: 'border-[#f5a623]/30',
      };
    }
    return {
      label: 'Limited',
      color: 'text-[var(--gs-loss)]',
      bg: 'bg-[var(--gs-loss)]/10',
      border: 'border-[var(--gs-loss)]/30',
    };
  };

  const level = getLevel();

  if (coverage === 0) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${level.bg} ${level.border} ${className}`}
      title={`P&L calculated for ${percentage}% of your NFT holdings`}
    >
      {/* Indicator dot */}
      <span className={`w-1.5 h-1.5 rounded-full ${level.color.replace('text-', 'bg-')}`} />
      {/* Label and percentage */}
      <span className={`text-caption font-mono ${level.color}`}>
        {level.label} ({percentage}%)
      </span>
    </div>
  );
}
