'use client';

import { useState, useEffect } from 'react';

interface PnLLoadingIndicatorProps {
  isLoading: boolean;
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
 */
export default function PnLLoadingIndicator({ isLoading }: PnLLoadingIndicatorProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Reset on loading change
  useEffect(() => {
    if (isLoading) {
      setStageIndex(0);
      setSeconds(0);
    }
  }, [isLoading]);

  // Cycle through stages
  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setStageIndex(prev => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 5000);

    return () => clearInterval(timer);
  }, [isLoading]);

  // Count seconds
  useEffect(() => {
    if (!isLoading) return;

    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--gs-lime)]/50" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--gs-lime)]" />
      </span>

      {/* Stage message */}
      <span className="text-[9px] text-[var(--gs-gray-3)] font-mono">
        {STAGES[stageIndex]}
      </span>

      {/* Elapsed time after 10s */}
      {seconds >= 10 && (
        <span className="text-[9px] text-[var(--gs-gray-2)] font-mono">
          ({seconds}s)
        </span>
      )}
    </div>
  );
}
