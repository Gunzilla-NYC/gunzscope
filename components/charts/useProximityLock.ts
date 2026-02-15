import { useState, useCallback, useRef, useMemo } from 'react';

export interface LockPoint {
  id: string;
  x: number;
  y: number;
}

interface ProximityLockResult {
  /** ID of the currently locked-on point (null if nothing in range) */
  lockedId: string | null;
  /** Coordinates of the locked point in SVG space */
  lockedPoint: { x: number; y: number } | null;
  /** Attach to SVG onMouseMove */
  handleMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  /** Attach to SVG onMouseLeave */
  handleMouseLeave: () => void;
}

/**
 * Proximity-based "magnetic snap" for chart data points.
 *
 * Instead of requiring the cursor to land exactly on a tiny dot,
 * this finds the nearest data point within `snapRadius` pixels
 * on every mouse move and "locks on" to it.
 *
 * O(n) scan per move — trivially fast for <5000 points.
 */
export function useProximityLock(
  points: LockPoint[],
  svgRef: React.RefObject<SVGSVGElement | null>,
  /** Group offset — add MARGIN.left / MARGIN.top to convert SVG coords to group coords */
  groupOffset: { left: number; top: number },
  snapRadius = 40,
): ProximityLockResult {
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [lockedPoint, setLockedPoint] = useState<{ x: number; y: number } | null>(null);
  const lastIdRef = useRef<string | null>(null);

  // Build a lookup map for O(1) point retrieval by id
  const pointMap = useMemo(() => {
    const map = new Map<string, LockPoint>();
    for (const p of points) map.set(p.id, p);
    return map;
  }, [points]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || points.length === 0) return;

      const rect = svg.getBoundingClientRect();
      // Mouse position in SVG group coordinate space
      const mx = e.clientX - rect.left - groupOffset.left;
      const my = e.clientY - rect.top - groupOffset.top;

      // Find nearest point within snapRadius
      let bestId: string | null = null;
      let bestDist = snapRadius * snapRadius; // Compare squared distances
      for (const p of points) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const distSq = dx * dx + dy * dy;
        if (distSq < bestDist) {
          bestDist = distSq;
          bestId = p.id;
        }
      }

      // Only update state if the lock target changed (avoids re-renders)
      if (bestId !== lastIdRef.current) {
        lastIdRef.current = bestId;
        setLockedId(bestId);
        if (bestId) {
          const p = pointMap.get(bestId)!;
          setLockedPoint({ x: p.x, y: p.y });
        } else {
          setLockedPoint(null);
        }
      }
    },
    [points, pointMap, svgRef, groupOffset, snapRadius],
  );

  const handleMouseLeave = useCallback(() => {
    lastIdRef.current = null;
    setLockedId(null);
    setLockedPoint(null);
  }, []);

  return { lockedId, lockedPoint, handleMouseMove, handleMouseLeave };
}
