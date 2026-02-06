'use client';

import { useEffect, useState, useRef, RefObject } from 'react';

interface MousePosition {
  x: number;
  y: number;
  isInside: boolean;
}

interface UseMousePositionOptions {
  containerRef?: RefObject<HTMLElement | null>;
  smoothing?: number;
}

/**
 * Hook that tracks smoothed mouse position relative to a container or window.
 *
 * Uses refs for target position and rAF loop to minimize re-renders.
 * Only triggers a React state update when smoothed position changes
 * by more than 0.5px (reduces render frequency from 60fps to ~20-30fps
 * during movement, and 0fps when idle).
 */
export function useMousePosition({
  containerRef,
  smoothing = 0.1
}: UseMousePositionOptions = {}) {
  const [smoothPosition, setSmoothPosition] = useState<MousePosition>({ x: 0, y: 0, isInside: false });

  const targetRef = useRef({ x: 0, y: 0, isInside: false });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef?.current;
    const target = container || window;

    const onMouseMove = (e: MouseEvent) => {
      if (container) {
        const rect = container.getBoundingClientRect();
        targetRef.current.x = e.clientX - rect.left;
        targetRef.current.y = e.clientY - rect.top;
        const x = targetRef.current.x;
        const y = targetRef.current.y;
        targetRef.current.isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      } else {
        targetRef.current.x = e.clientX;
        targetRef.current.y = e.clientY;
        targetRef.current.isInside = true;
      }
    };

    const onMouseLeave = () => {
      targetRef.current.isInside = false;
      // Immediately update isInside for conditional rendering
      setSmoothPosition(prev => ({ ...prev, isInside: false }));
    };

    const animate = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      cur.x += (tgt.x - cur.x) * smoothing;
      cur.y += (tgt.y - cur.y) * smoothing;

      // Only update React state when position changes meaningfully (>0.5px)
      setSmoothPosition(prev => {
        if (
          Math.abs(prev.x - cur.x) > 0.5 ||
          Math.abs(prev.y - cur.y) > 0.5 ||
          prev.isInside !== tgt.isInside
        ) {
          return { x: cur.x, y: cur.y, isInside: tgt.isInside };
        }
        return prev;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    target.addEventListener('mousemove', onMouseMove as EventListener);
    if (container) {
      container.addEventListener('mouseleave', onMouseLeave);
    }
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      target.removeEventListener('mousemove', onMouseMove as EventListener);
      if (container) {
        container.removeEventListener('mouseleave', onMouseLeave);
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef, smoothing]);

  return { position: targetRef.current, smoothPosition };
}

export default useMousePosition;
