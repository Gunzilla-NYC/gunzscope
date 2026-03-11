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

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);
  const wordIndexRef = useRef(0);

  const getRandomChar = useCallback(() => {
    return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
  }, [scrambleChars]);

  // Check reduced motion on mount
  const prefersReducedMotion = typeof window !== 'undefined'
    ? window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    : false;

  useEffect(() => {
    mountedRef.current = true;

    const cleanup = () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    if (prefersReducedMotion) {
      const cycleInterval = setInterval(() => {
        if (!mountedRef.current) return;
        wordIndexRef.current = (wordIndexRef.current + 1) % words.length;
        setDisplayText(words[wordIndexRef.current]);
        setCurrentWordIndex(wordIndexRef.current);
      }, pauseDuration + scrambleDuration);

      return () => {
        cleanup();
        clearInterval(cycleInterval);
      };
    }

    const scheduleNextScramble = () => {
      timeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;

        const nextIndex = (wordIndexRef.current + 1) % words.length;
        const targetWord = words[nextIndex];
        const totalFrames = Math.floor(scrambleDuration / frameRate);
        let frame = 0;

        setIsScrambling(true);

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
            wordIndexRef.current = nextIndex;
            setCurrentWordIndex(nextIndex);
            // Schedule the next scramble
            scheduleNextScramble();
          }
        }, frameRate);
      }, pauseDuration);
    };

    scheduleNextScramble();

    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { displayText, isScrambling, currentWordIndex };
}

export default useTextScramble;
