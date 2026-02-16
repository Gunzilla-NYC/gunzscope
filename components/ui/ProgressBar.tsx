import { memo } from 'react';

interface ProgressBarProps {
  label: string;
  value: number;
  color: string;
}

/** Labeled progress bar used in data quality views */
export const ProgressBar = memo(function ProgressBar({ label, value, color }: ProgressBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-xs text-[var(--gs-gray-3)]">{label}</span>
        <span className="font-mono text-xs text-[var(--gs-white)] tabular-nums">{value}%</span>
      </div>
      <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
        <div className="h-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
});
