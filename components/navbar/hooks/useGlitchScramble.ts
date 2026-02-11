import { useState, useCallback, useRef, useEffect } from 'react';
import { GLITCH_CHARS } from '../utils';

interface UseGlitchScrambleOptions {
  label: string;
  target?: string;
  skipChars?: string[];
}

export function useGlitchScramble({ label, target: targetOverride, skipChars = [] }: UseGlitchScrambleOptions) {
  const target = targetOverride ?? label.toUpperCase();
  const [display, setDisplay] = useState(label);
  const [hovered, setHovered] = useState(false);
  const frameRef = useRef<number>(0);
  const iterRef = useRef(0);
  const lastTickRef = useRef(0);

  const scramble = useCallback(() => {
    setHovered(true);
    iterRef.current = 0;
    lastTickRef.current = 0;
    const totalSteps = target.length * 3;

    const tick = (timestamp: number) => {
      if (timestamp - lastTickRef.current < 50) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = timestamp;
      iterRef.current++;
      const resolved = Math.floor(iterRef.current / 3);

      setDisplay(
        target
          .split('')
          .map((char, i) => {
            if (skipChars.includes(char)) return char;
            if (i < resolved) return char;
            return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
          })
          .join('')
      );

      if (iterRef.current < totalSteps) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [target, skipChars]);

  const reset = useCallback(() => {
    setHovered(false);
    cancelAnimationFrame(frameRef.current);
    setDisplay(label);
  }, [label]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return { display, hovered, scramble, reset };
}
