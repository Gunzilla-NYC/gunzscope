import { memo } from 'react';

interface ProgressBarProps {
  label: string;
  value: number;
  color: string;
  /** Override the right-side label (e.g. "12/20" instead of "60%") */
  valueLabel?: string;
  /** Show skeleton shimmer instead of static fill */
  shimmer?: boolean;
  /** Show scanning sweep animation on the fill */
  scanning?: boolean;
}

/** Labeled progress bar used in data quality views */
export const ProgressBar = memo(function ProgressBar({
  label, value, color, valueLabel, shimmer, scanning,
}: ProgressBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-mono text-xs text-[var(--gs-gray-3)]">{label}</span>
        <span className={`font-mono text-xs tabular-nums ${valueLabel ? 'text-[var(--gs-lime)]' : 'text-[var(--gs-white)]'}`}>
          {valueLabel ?? `${value}%`}
        </span>
      </div>
      <div className="h-[3px] bg-[var(--gs-dark-4)] overflow-hidden">
        {shimmer ? (
          <div className="h-full w-full skeleton-stat" />
        ) : (
          <div className="h-full relative" style={{ width: `${value}%`, backgroundColor: color }}>
            {scanning && (
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, rgba(166,247,0,0.4) 50%, transparent 100%)`,
                  backgroundSize: '200% 100%',
                  animation: 'enrichment-scan 1.5s linear infinite',
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
});
