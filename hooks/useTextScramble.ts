'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface UseTextScrambleOptions {
  words: string[];
  /** Duration of the scramble/decode animation in ms */
  scrambleDuration?: number;
  /** How long to pause showing the completed word */
  pauseDuration?: number;
  /** Characters to use for scrambling */
  scrambleChars?: string;
  /** Interval between scramble frames in ms */
  frameRate?: number;
}

interface TextScrambleState {
  displayText: string;
  isScrambling: boolean;
  currentWordIndex: number;
}

/**
 * Text scramble effect inspired by LayerZero.
 * Shows scrambled characters that progressively resolve into the target word.
 */
export function useTextScramble({
  words,
  scrambleDuration = 800,
  pauseDuration = 2000,
  scrambleChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  frameRate = 30,
}: UseTextScrambleOptions): TextScrambleState {
  const [displayText, setDisplayText] = useState(words[0] ?? '');
  const [isScrambling, setIsScrambling] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const getRandomChar = useCallback(() => {
    return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
  }, [scrambleChars]);

  // Check reduced motion on mount
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    : false;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Main animation cycle
  useEffect(() => {
    if (prefersReducedMotion) {
      // Just cycle words without animation
      const cycleInterval = setInterval(() => {
        if (!mountedRef.current) return;
        setCurrentWordIndex(prev => {
          const next = (prev + 1) % words.length;
          setDisplayText(words[next]);
          return next;
        });
      }, pauseDuration + scrambleDuration);

      return () => clearInterval(cycleInterval);
    }

    // Schedule the scramble to next word
    const scheduleNextScramble = () => {
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;

        const nextIndex = (currentWordIndex + 1) % words.length;
        const targetWord = words[nextIndex];
        const totalFrames = Math.floor(scrambleDuration / frameRate);
        let frame = 0;

        setIsScrambling(true);

        // Clear any existing interval
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
          if (!mountedRef.current) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return;
          }

          frame++;
          const progress = frame / totalFrames;

          let result = '';
          for (let i = 0; i < targetWord.length; i++) {
            const charThreshold = i / targetWord.length;

            if (progress > charThreshold + 0.3) {
              result += targetWord[i];
            } else if (progress > charThreshold) {
              result += Math.random() > 0.5 ? targetWord[i] : getRandomChar();
            } else {
              result += getRandomChar();
            }
          }

          setDisplayText(result);

          if (frame >= totalFrames) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setDisplayText(targetWord);
            setIsScrambling(false);
            setCurrentWordIndex(nextIndex);
          }
        }, frameRate);
      }, pauseDuration);
    };

    // Only schedule when not scrambling
    if (!isScrambling) {
      scheduleNextScramble();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentWordIndex, isScrambling, words, pauseDuration, scrambleDuration, frameRate, getRandomChar, prefersReducedMotion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return { displayText, isScrambling, currentWordIndex };
}

export default useTextScramble;
