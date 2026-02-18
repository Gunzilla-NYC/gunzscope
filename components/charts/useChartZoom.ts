import { useEffect, useCallback, useMemo } from 'react';
import type { TransformMatrix } from '@visx/zoom/lib/types';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

/** Imperative handle exposed by each chart for external zoom control. */
export interface ChartZoomHandle {
  zoomTo: (level: number) => void;
  reset: () => void;
  getScale: () => number;
}

/** Minimal subset of ProvidedZoom needed by useShiftWheelZoom. */
export interface ZoomScaleMethod {
  scale: (s: { scaleX: number; scaleY?: number; point?: { x: number; y: number } }) => void;
}

/* ------------------------------------------------------------------ */
/*  makeConstrainZoom                                                 */
/* ------------------------------------------------------------------ */

/**
 * Returns a `constrain` callback for `<Zoom>`.
 * - Enforces uniform scale (scaleX === scaleY).
 * - Clamps scale to [min, max].
 * - Clamps translate so data area always covers the viewport.
 */
export function makeConstrainZoom(
  innerWidth: number,
  innerHeight: number,
  scaleMin: number,
  scaleMax: number,
) {
  return (transform: TransformMatrix, _prev: TransformMatrix): TransformMatrix => {
    // Uniform zoom — use the average of requested scales
    const raw = (transform.scaleX + transform.scaleY) / 2;
    const s = Math.min(scaleMax, Math.max(scaleMin, raw));

    // Pan bounds: translated data must cover [0..innerWidth] x [0..innerHeight]
    const tx = Math.min(0, Math.max(-(s - 1) * innerWidth, transform.translateX));
    const ty = Math.min(0, Math.max(-(s - 1) * innerHeight, transform.translateY));

    return {
      scaleX: s,
      scaleY: s,
      translateX: tx,
      translateY: ty,
      skewX: 0,
      skewY: 0,
    };
  };
}

/* ------------------------------------------------------------------ */
/*  computeZoomedDomain                                               */
/* ------------------------------------------------------------------ */

/**
 * Inverts a zoom transform to compute the visible data domain.
 *
 * Works with any visx scale that has `.invert()` — scaleTime, scaleLog, scaleSqrt, etc.
 *
 * @param baseScale  The base (unzoomed) scale mapping full data domain → [0, extent]
 * @param scaleVal   transform.scaleX or scaleY
 * @param translateVal  transform.translateX or translateY
 * @param extent     innerWidth or innerHeight (pixel range)
 * @param inverted   true for Y axis where range is [innerHeight, 0]
 */
export function computeZoomedDomain<T>(
  baseScale: { invert: (px: number) => T },
  scaleVal: number,
  translateVal: number,
  extent: number,
  inverted: boolean,
): [T, T] {
  if (inverted) {
    // Y-axis: pixel 0 = top (high value), pixel extent = bottom (low value)
    return [
      baseScale.invert((extent - translateVal) / scaleVal),
      baseScale.invert(-translateVal / scaleVal),
    ];
  }
  // X-axis: pixel 0 = left (low value), pixel extent = right (high value)
  return [
    baseScale.invert(-translateVal / scaleVal),
    baseScale.invert((extent - translateVal) / scaleVal),
  ];
}

/* ------------------------------------------------------------------ */
/*  useShiftWheelZoom                                                 */
/* ------------------------------------------------------------------ */

/**
 * Attaches a native wheel listener that zooms on Shift+scroll only.
 * Normal scroll (no Shift) passes through to page scroll.
 *
 * Uses native addEventListener with `{ passive: false }` so we can
 * call `preventDefault()` — React synthetic events are passive for wheel.
 */
export function useShiftWheelZoom(
  containerRef: React.RefObject<HTMLElement | null>,
  zoomRef: React.RefObject<ZoomScaleMethod | null>,
  groupOffset: { left: number; top: number },
) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      e.preventDefault();

      const zoom = zoomRef.current;
      if (!zoom) return;

      const rect = el.getBoundingClientRect();
      const point = {
        x: e.clientX - rect.left - groupOffset.left,
        y: e.clientY - rect.top - groupOffset.top,
      };

      const direction = e.deltaY > 0 ? -1 : 1;
      const factor = 1 + direction * 0.15;

      zoom.scale({ scaleX: factor, scaleY: factor, point });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef, zoomRef, groupOffset]);
}

/* ------------------------------------------------------------------ */
/*  useConstrainMemo                                                  */
/* ------------------------------------------------------------------ */

/** Memoised constrain function — recreated only when dimensions change. */
export function useConstrainMemo(
  innerWidth: number,
  innerHeight: number,
  scaleMin = 1,
  scaleMax = 4,
) {
  return useMemo(
    () => makeConstrainZoom(innerWidth, innerHeight, scaleMin, scaleMax),
    [innerWidth, innerHeight, scaleMin, scaleMax],
  );
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

export const ZOOM_SCALE_MIN = 1;
export const ZOOM_SCALE_MAX = 4;
