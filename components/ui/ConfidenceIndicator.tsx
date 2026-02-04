'use client';

import { ConfidenceScore } from '@/lib/portfolio/calcPortfolio';

interface ConfidenceIndicatorProps {
  confidence: ConfidenceScore;
  className?: string;
}

/**
 * Visual indicator for data confidence level.
 * Shows 1-3 dots based on confidence:
 * - 3 dots (green): high confidence (>= 80%)
 * - 2 dots (yellow): medium confidence (>= 50%)
 * - 1 dot (red): low confidence (> 0%)
 * - 0 dots: no data
 */
export default function ConfidenceIndicator({ confidence, className = '' }: ConfidenceIndicatorProps) {
  const dots = confidence.level === 'high' ? 3
             : confidence.level === 'medium' ? 2
             : confidence.level === 'low' ? 1
             : 0;

  const color = confidence.level === 'high' ? 'bg-[var(--gs-profit)]'
              : confidence.level === 'medium' ? 'bg-[#f5a623]'
              : 'bg-[var(--gs-loss)]';

  if (dots === 0) return null;

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      title={`Data confidence: ${confidence.percentage}%`}
      aria-label={`Data confidence: ${confidence.level} (${confidence.percentage}%)`}
    >
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${i < dots ? color : 'bg-white/20'}`}
        />
      ))}
    </div>
  );
}
