'use client';

import { useEffect, useState, useCallback } from 'react';

interface MousePosition {
  x: number;
  y: number;
  isVisible: boolean;
}

export default function CrosshairCursor() {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0, isVisible: false });
  const [smoothPosition, setSmoothPosition] = useState<MousePosition>({ x: 0, y: 0, isVisible: false });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY, isVisible: true });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPosition(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handleMouseEnter = useCallback(() => {
    setPosition(prev => ({ ...prev, isVisible: true }));
  }, []);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [handleMouseMove, handleMouseLeave, handleMouseEnter]);

  // Smooth interpolation with 0.08 smoothing factor
  useEffect(() => {
    let animationId: number;
    const smoothing = 0.08;

    const animate = () => {
      setSmoothPosition(prev => ({
        x: prev.x + (position.x - prev.x) * smoothing,
        y: prev.y + (position.y - prev.y) * smoothing,
        isVisible: position.isVisible,
      }));
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [position]);

  // Don't render on touch devices or when not visible
  if (!smoothPosition.isVisible) return null;

  return (
    <div
      className="crosshair crosshair-interactive pointer-events-none transition-opacity duration-300"
      style={{
        position: 'fixed',
        left: smoothPosition.x - 12,
        top: smoothPosition.y - 12,
        opacity: 0.3,
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
}
