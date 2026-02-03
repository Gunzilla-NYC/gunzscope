'use client';

import { useEffect, useState, useCallback, RefObject } from 'react';

interface MousePosition {
  x: number;
  y: number;
  isInside: boolean;
}

interface UseMousePositionOptions {
  containerRef?: RefObject<HTMLElement | null>;
  smoothing?: number;
}

export function useMousePosition({
  containerRef,
  smoothing = 0.1
}: UseMousePositionOptions = {}) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0, isInside: false });
  const [smoothPosition, setSmoothPosition] = useState<MousePosition>({ x: 0, y: 0, isInside: false });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const container = containerRef?.current;

    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const isInside = x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      setPosition({ x, y, isInside });
    } else {
      setPosition({ x: e.clientX, y: e.clientY, isInside: true });
    }
  }, [containerRef]);

  const handleMouseLeave = useCallback(() => {
    setPosition(prev => ({ ...prev, isInside: false }));
  }, []);

  useEffect(() => {
    const container = containerRef?.current;
    const target = container || window;

    target.addEventListener('mousemove', handleMouseMove as EventListener);
    if (container) {
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      target.removeEventListener('mousemove', handleMouseMove as EventListener);
      if (container) {
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [containerRef, handleMouseMove, handleMouseLeave]);

  // Smooth interpolation
  useEffect(() => {
    let animationId: number;

    const animate = () => {
      setSmoothPosition(prev => ({
        x: prev.x + (position.x - prev.x) * smoothing,
        y: prev.y + (position.y - prev.y) * smoothing,
        isInside: position.isInside,
      }));
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [position, smoothing]);

  return { position, smoothPosition };
}

export default useMousePosition;
