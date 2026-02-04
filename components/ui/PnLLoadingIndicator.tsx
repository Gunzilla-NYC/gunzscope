'use client';

import { useState, useEffect } from 'react';
import { EnrichmentProgress } from '@/lib/types';

interface PnLLoadingIndicatorProps {
  isLoading: boolean;
  progress?: EnrichmentProgress | null;
}

const STAGES = [
  'Fetching acquisition data...',
  'Querying historical prices...',
  'Calculating cost basis...',
  'Computing P&L...',
];

/**
 * Animated loading indicator for P&L calculation.
 * Shows staged progress messages during the slow calculation.
 * When progress prop is provided, shows real enrichment progress.
 */
export default function PnLLoadingIndicator({ isLoading, progress }: PnLLoadingIndicatorProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Reset on loading change
  useEffect(() => {
    if (isLoading) {
      setStageIndex(0);
      setSeconds(0);
    }
  }, [isLoading]);

  // Cycle through stages (only if no real progress available)
  useEffect(() => {
    if (!isLoading || (progress && progress.phase === 'enriching')) return;

    const timer = setInterval(() => {
      setStageIndex(prev => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 5000);

    return () => clearInterval(timer);
  }, [isLoading, progress]);

  // Count seconds
  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  // Get display message - use real progress if available
  const getMessage = () => {
    if (progress && progress.phase === 'enriching' && progress.total > 0) {
      return `Analyzing ${progress.completed} of ${progress.total} NFTs...`;
    }
    if (progress && progress.phase === 'complete') {
      return 'Analysis complete';
    }
    return STAGES[stageIndex];
  };

  // Calculate progress percentage
  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : null;

  return (
    <div className="flex flex-col items-center gap-2 mt-2">
      <div className="flex items-center justify-center gap-2">
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gs-lime)]/50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gs-lime)]" />
        </span>

        {/* Stage message */}
        <span className="text-[9px] text-[var(--gs-gray-3)] font-mono">
          {getMessage()}
        </span>

        {/* Elapsed time after 10s (only when no real progress) */}
        {seconds >= 10 && !progressPercent && (
          <span className="text-[9px] text-[var(--gs-gray-2)] font-mono">
            ({seconds}s)
          </span>
        )}
      </div>

      {/* Determinate progress bar when real progress is available */}
      {progressPercent !== null && progress?.phase === 'enriching' && (
        <div className="w-full max-w-[120px] h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)] transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
