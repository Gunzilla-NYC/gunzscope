// Shared chart utilities — deduplicated from AcquisitionTimeline + PnLScatterPlot

import React from 'react';

// ── formatGun ────────────────────────────────────────────────────────────────
/** Format a GUN value for axis labels / data readouts. */
export function formatGun(val: number): string {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (val >= 10) return val.toFixed(0);
  return val.toFixed(1);
}

// ── generateSmartTicks ───────────────────────────────────────────────────────
const TICK_CANDIDATES = [
  0, 1, 2, 5, 10, 15, 20, 25, 30, 50, 75, 100, 150, 200, 250, 500, 750,
  1000, 2000, 5000, 10000,
];

/**
 * Return a set of visually clean tick values for a sqrt-scaled axis.
 * @param maxValue   — domain maximum (ticks are filtered to < 95% of this)
 * @param maxCount   — cap on the number of ticks returned (0 = no cap)
 * @param includeZero — whether 0 is eligible as a tick
 */
export function generateSmartTicks(
  maxValue: number,
  maxCount = 6,
  includeZero = false,
): number[] {
  const ticks = TICK_CANDIDATES.filter(
    v => (includeZero ? v >= 0 : v > 0) && v < maxValue * 0.95,
  );
  if (maxCount <= 0 || ticks.length <= maxCount) return ticks;
  const step = Math.max(1, Math.floor(ticks.length / maxCount));
  return ticks.filter((_, i) => i % step === 0).slice(0, maxCount);
}

// ── HUD keyframes ────────────────────────────────────────────────────────────
/** Shared keyframe CSS injected once via <style> inside each chart's <defs>. */
export const HUD_KEYFRAMES = `
  @keyframes hud-scan-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes hud-lock-pulse { 0% { r: 0; opacity: 0; } 30% { opacity: 1; } 100% { opacity: 0.5; } }
`;

// ── GlowFilterDef ────────────────────────────────────────────────────────────
interface GlowFilterDefProps {
  id: string;
  stdDeviation?: number;
}

/** Memoized SVG glow filter — never re-renders because its props are static. */
export const GlowFilterDef = React.memo(function GlowFilterDef({
  id,
  stdDeviation = 2.5,
}: GlowFilterDefProps) {
  return React.createElement(
    'filter',
    { id, x: '-50%', y: '-50%', width: '200%', height: '200%' },
    React.createElement('feGaussianBlur', {
      in: 'SourceGraphic',
      stdDeviation,
      result: 'blur',
    }),
    React.createElement(
      'feMerge',
      null,
      React.createElement('feMergeNode', { in: 'blur' }),
      React.createElement('feMergeNode', { in: 'SourceGraphic' }),
    ),
  );
});

// ── HudLockOverlay ───────────────────────────────────────────────────────────
interface HudLockOverlayProps {
  point: { x: number; y: number };
  color: string;
  /** Radius of the outer dashed scanning ring */
  scanRadius: number;
  /** Radius of the inner pulsing lock ring */
  lockRadius: number;
  /** Y coordinate the vertical crosshair extends to (typically innerHeight) */
  yExtent: number;
}

/** Crosshair + scanning/lock rings rendered at a locked data point. */
export function HudLockOverlay({
  point,
  color,
  scanRadius,
  lockRadius,
  yExtent,
}: HudLockOverlayProps) {
  return React.createElement(
    'g',
    { pointerEvents: 'none' },
    // Vertical crosshair — point to baseline
    React.createElement('line', {
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: yExtent,
      stroke: color,
      strokeOpacity: 0.15,
      strokeWidth: 1,
      strokeDasharray: '3 3',
    }),
    // Horizontal crosshair — point to left edge
    React.createElement('line', {
      x1: point.x,
      y1: point.y,
      x2: 0,
      y2: point.y,
      stroke: color,
      strokeOpacity: 0.15,
      strokeWidth: 1,
      strokeDasharray: '3 3',
    }),
    // Scanning ring — dashed, slowly rotates
    React.createElement('circle', {
      cx: point.x,
      cy: point.y,
      r: scanRadius,
      fill: 'none',
      stroke: color,
      strokeOpacity: 0.3,
      strokeWidth: 1,
      strokeDasharray: '4 6',
      style: {
        transformOrigin: `${point.x}px ${point.y}px`,
        animation: 'hud-scan-spin 4s linear infinite',
      },
    }),
    // Lock ring — solid, pulses on acquire
    React.createElement('circle', {
      cx: point.x,
      cy: point.y,
      r: lockRadius,
      fill: 'none',
      stroke: color,
      strokeOpacity: 0.5,
      strokeWidth: 1.5,
      style: { animation: 'hud-lock-pulse 600ms ease-out' },
    }),
  );
}
