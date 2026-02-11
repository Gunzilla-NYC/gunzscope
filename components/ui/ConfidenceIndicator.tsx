'use client';

import { ConfidenceScore } from '@/lib/portfolio/calcPortfolio';

interface ConfidenceIndicatorProps {
  confidence: ConfidenceScore;
  className?: string;
  /** When true, data is still being collected — last dot blinks.
   *  When false (settled), last dot stops blinking and fades to 50% opacity. */
  isGathering?: boolean;
}

// Brand colors (hex for interpolation)
const COLOR_RED = [0xFF, 0x44, 0x44] as const;   // --gs-loss
const COLOR_AMBER = [0xF5, 0xA6, 0x23] as const;
const COLOR_GREEN = [0x00, 0xFF, 0x88] as const;  // --gs-profit

function lerpRgb(a: readonly number[], b: readonly number[], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * Returns the active dot color based on percentage with smooth gradient
 * transitions near tier boundaries:
 *   0-40%  → red
 *  40-50%  → red → amber blend
 *  50-75%  → amber
 *  75-90%  → amber → green blend
 *  90-100% → green
 */
function getActiveColor(percentage: number): string {
  if (percentage < 40) return lerpRgb(COLOR_RED, COLOR_RED, 0);
  if (percentage < 50) return lerpRgb(COLOR_RED, COLOR_AMBER, (percentage - 40) / 10);
  if (percentage < 75) return lerpRgb(COLOR_AMBER, COLOR_AMBER, 0);
  if (percentage < 90) return lerpRgb(COLOR_AMBER, COLOR_GREEN, (percentage - 75) / 15);
  return lerpRgb(COLOR_GREEN, COLOR_GREEN, 0);
}

/**
 * Blink duration scales with proximity to the next tier threshold.
 * Far from threshold → slow pulse (3.5s). About to level up → rapid pulse (0.6s).
 *   Low:    0-49%  → next threshold at 50%
 *   Medium: 50-79% → next threshold at 80%
 *   High:   80-99% → next threshold at 100%
 */
function getBlinkDuration(percentage: number, level: string): number {
  const SLOW = 3.5;
  const FAST = 0.6;

  let progress: number;
  if (level === 'low') progress = percentage / 50;
  else if (level === 'medium') progress = (percentage - 50) / 30;
  else progress = (percentage - 80) / 20;

  return SLOW + (FAST - SLOW) * Math.max(0, Math.min(1, progress));
}

/**
 * Percentage-driven confidence indicator with 3 dots.
 *
 * Last filled dot behavior:
 *   isGathering + <100%:  blinks (speed scales with proximity to next tier)
 *   settled + <100%:      35% opacity, no blink (this is as good as it gets)
 *   100%:                 all solid, full opacity
 */
export default function ConfidenceIndicator({ confidence, className = '', isGathering = false }: ConfidenceIndicatorProps) {
  const pct = confidence.percentage;

  const filledCount = confidence.level === 'high' ? 3
                    : confidence.level === 'medium' ? 2
                    : confidence.level === 'low' ? 1
                    : 0;

  if (filledCount === 0) return null;

  const activeColor = getActiveColor(pct);
  const isComplete = pct >= 100;
  const blinkDuration = getBlinkDuration(pct, confidence.level);

  return (
    <div
      className={`flex items-center gap-1 ${className}`}
      title={`Data confidence: ${pct}%`}
      aria-label={`Data confidence: ${confidence.level} (${pct}%)`}
    >
      {[0, 1, 2].map(i => {
        const isFilled = i < filledCount;
        const isLastFilled = isFilled && i === filledCount - 1 && !isComplete;

        return (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${!isFilled ? 'bg-white/20' : ''}`}
            style={isFilled ? {
              backgroundColor: activeColor,
              opacity: isLastFilled && !isGathering ? 0.35 : 1,
              animation: isLastFilled && isGathering ? `confidence-blink ${blinkDuration.toFixed(2)}s ease-in-out infinite` : undefined,
            } : undefined}
          />
        );
      })}
    </div>
  );
}
