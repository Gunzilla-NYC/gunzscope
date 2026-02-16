import { memo } from 'react';

interface DotIndicatorProps {
  count?: number;
  activeIndex: number;
  color?: string;
}

/** Dot pagination indicator for tappable/cycleable cards */
export const DotIndicator = memo(function DotIndicator({
  count = 2,
  activeIndex,
  color = 'var(--gs-gray-3)',
}: DotIndicatorProps) {
  return (
    <span className="inline-flex gap-[3px] ml-1.5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="w-[4px] h-[4px] rounded-full transition-opacity duration-200"
          style={{ backgroundColor: color, opacity: i === activeIndex ? 0.7 : 0.2 }}
        />
      ))}
    </span>
  );
});
