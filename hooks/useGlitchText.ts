'use client';

import { useRef, useCallback, useEffect } from 'react';

const GLITCH_SETS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  '!@#$%^&*()_+-=[]{}|;:,.<>?/~`',
  '░▒▓█▄▀■□▪▫●○◆◇◈',
];

function pickGlitchSet(): string {
  return GLITCH_SETS[Math.floor(Math.random() * GLITCH_SETS.length)];
}

/**
 * Scramble-on-hover text effect via DOM ref (zero re-renders).
 * Returns a spanRef to attach and a scramble() to trigger.
 */
export function useGlitchText(target: string, triggerOnMount = false) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef(0);

  const upper = target.toUpperCase();

  const scramble = useCallback(() => {
    const el = spanRef.current;
    if (!el) return;

    // Lock the element's width so glitch chars don't resize the container
    if (!el.style.minWidth) {
      el.style.display = 'inline-block';
      el.style.minWidth = `${el.offsetWidth}px`;
    }

    let iter = 0;
    const chars = pickGlitchSet();
    const totalSteps = upper.length * 5;

    const tick = () => {
      iter++;
      const resolved = Math.floor(iter / 5);

      const text = upper
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (i < resolved) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      if (spanRef.current) spanRef.current.textContent = text;

      if (iter < totalSteps) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [upper]);

  useEffect(() => {
    if (triggerOnMount) {
      const delay = setTimeout(scramble, 300);
      return () => clearTimeout(delay);
    }
  }, [triggerOnMount, scramble]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return { spanRef, scramble, initial: upper };
}
