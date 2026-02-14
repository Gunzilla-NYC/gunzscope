'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface UseCountUpOptions {
  start?: number;
  end: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  startOnMount?: boolean;
}

export function useCountUp({
  start = 0,
  end,
  duration = 2000,
  decimals = 0,
  prefix = '',
  suffix = '',
  startOnMount = true,
}: UseCountUpOptions) {
  const [value, setValue] = useState(start);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const valueRef = useRef(start);
  // Use refs for animation targets so closures always see current values
  const startRef = useRef(start);
  const endRef = useRef(end);
  const durationRef = useRef(duration);

  // Keep refs in sync (don't sync startRef — it's set before each animation)
  endRef.current = end;
  durationRef.current = duration;

  const animate = useCallback((timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;
    const progress = Math.min((timestamp - startTimeRef.current) / durationRef.current, 1);

    // Easing function: easeOutExpo
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = startRef.current + (endRef.current - startRef.current) * eased;

    valueRef.current = current;
    setValue(current);

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsAnimating(false);
    }
  }, []);

  const startAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsAnimating(true);
    startTimeRef.current = null;
    animationRef.current = requestAnimationFrame(animate);
  }, [animate]);

  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    valueRef.current = start;
    setValue(start);
    setIsAnimating(false);
    startTimeRef.current = null;
  }, [start]);

  // Auto-start on mount if requested, or snap to end for reduced motion
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      valueRef.current = end;
      setValue(end);
      return;
    }

    if (startOnMount && end > 0) {
      startAnimation();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // Only run on mount (startOnMount) or when startOnMount changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOnMount]);

  // When end changes, animate from current displayed value to new end
  useEffect(() => {
    if (!startOnMount) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      valueRef.current = end;
      setValue(end);
    } else if (end > 0) {
      // Animate FROM the current value TO the new end (not from 0)
      startRef.current = valueRef.current;
      startAnimation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end]);

  const formattedValue = `${prefix}${value.toFixed(decimals)}${suffix}`;
  const displayValue = decimals > 0
    ? value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(value).toLocaleString();

  return {
    value,
    displayValue,
    formattedValue,
    isAnimating,
    startAnimation,
    reset,
  };
}

export default useCountUp;
