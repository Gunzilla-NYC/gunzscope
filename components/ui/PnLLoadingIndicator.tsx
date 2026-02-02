'use client';

import { useState, useEffect } from 'react';

interface PnLLoadingIndicatorProps {
  isLoading: boolean;
  className?: string;
}

/**
 * P&L calculation stages - shown sequentially to give users
 * feedback about what's happening during the slow calculation
 */
const LOADING_STAGES = [
  { message: 'Fetching acquisition data...', duration: 5000 },
  { message: 'Querying historical prices...', duration: 8000 },
  { message: 'Calculating cost basis...', duration: 5000 },
  { message: 'Computing P&L...', duration: 3000 },
];

/**
 * Animated loading indicator for P&L calculation
 *
 * Shows staged progress messages to give users feedback
 * during the potentially long P&L calculation process.
 */
export default function PnLLoadingIndicator({
  isLoading,
  className = '',
}: PnLLoadingIndicatorProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Reset and show when loading starts
  useEffect(() => {
    if (isLoading) {
      setStageIndex(0);
      setElapsedSeconds(0);
      // Delay visibility slightly for smoother appearance
      const showTimer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(showTimer);
    } else {
      setIsVisible(false);
    }
  }, [isLoading]);

  // Progress through stages
  useEffect(() => {
    if (!isLoading || !isVisible) return;

    const stage = LOADING_STAGES[stageIndex];
    if (!stage) return;

    const timer = setTimeout(() => {
      // Move to next stage, or loop back to last stage
      setStageIndex((prev) =>
        prev < LOADING_STAGES.length - 1 ? prev + 1 : prev
      );
    }, stage.duration);

    return () => clearTimeout(timer);
  }, [isLoading, isVisible, stageIndex]);

  // Track elapsed time
  useEffect(() => {
    if (!isLoading || !isVisible) return;

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isLoading, isVisible]);

  if (!isLoading || !isVisible) return null;

  const currentStage = LOADING_STAGES[stageIndex] || LOADING_STAGES[LOADING_STAGES.length - 1];

  return (
    <div
      className={`flex items-center justify-center gap-2 mt-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Animated pulsing dot */}
      <span className="relative flex h-2 w-2">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#64ffff]/60"
          style={{ animationDuration: '1.5s' }}
        />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#64ffff]" />
      </span>

      {/* Stage message with fade transition */}
      <span
        className="text-[9px] text-white/50 transition-opacity duration-300"
        key={stageIndex}
      >
        {currentStage.message}
      </span>

      {/* Elapsed time (show after 10 seconds) */}
      {elapsedSeconds >= 10 && (
        <span className="text-[9px] text-white/30 tabular-nums">
          ({elapsedSeconds}s)
        </span>
      )}
    </div>
  );
}
