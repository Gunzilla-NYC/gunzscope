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
  const [state, setState] = useState<TextScrambleState>(() => ({
    displayText: words[0] ?? '',
    isScrambling: false,
    currentWordIndex: 0,
  }));

  const frameRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prefersReducedMotion = useRef(false);

  const getRandomChar = useCallback(() => {
    return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
  }, [scrambleChars]);

  // Check reduced motion preference
  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion.current) {
      // Just cycle words without animation
      const cycleInterval = setInterval(() => {
        setState(prev => {
          const nextIndex = (prev.currentWordIndex + 1) % words.length;
          return {
            ...prev,
            currentWordIndex: nextIndex,
            displayText: words[nextIndex],
          };
        });
      }, pauseDuration + scrambleDuration);

      return () => clearInterval(cycleInterval);
    }
  }, [words, pauseDuration, scrambleDuration]);

  const scrambleToWord = useCallback((targetWord: string, fromWord: string, onComplete: () => void) => {
    const maxLength = Math.max(targetWord.length, fromWord.length);
    const totalFrames = Math.floor(scrambleDuration / frameRate);
    let frame = 0;

    setState(prev => ({ ...prev, isScrambling: true }));

    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;

      let result = '';
      for (let i = 0; i < targetWord.length; i++) {
        // Characters "lock in" progressively from left to right
        // Each character has a threshold based on its position
        const charThreshold = i / targetWord.length;

        if (progress > charThreshold + 0.3) {
          // This character is locked in
          result += targetWord[i];
        } else if (progress > charThreshold) {
          // This character is "resolving" - mix of scramble and real
          result += Math.random() > 0.5 ? targetWord[i] : getRandomChar();
        } else {
          // Still fully scrambled
          result += getRandomChar();
        }
      }

      setState(prev => ({ ...prev, displayText: result }));

      if (frame >= totalFrames) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setState(prev => ({
          ...prev,
          displayText: targetWord,
          isScrambling: false
        }));
        onComplete();
      }
    }, frameRate);
  }, [scrambleDuration, frameRate, getRandomChar]);

  // Main animation loop
  useEffect(() => {
    if (prefersReducedMotion.current) return;

    const currentWord = words[state.currentWordIndex];

    // If not scrambling and showing complete word, schedule next transition
    if (!state.isScrambling && state.displayText === currentWord) {
      timeoutRef.current = setTimeout(() => {
        const nextIndex = (state.currentWordIndex + 1) % words.length;
        const nextWord = words[nextIndex];

        scrambleToWord(nextWord, currentWord, () => {
          setState(prev => ({
            ...prev,
            currentWordIndex: nextIndex,
          }));
        });
      }, pauseDuration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state.isScrambling, state.displayText, state.currentWordIndex, words, pauseDuration, scrambleToWord]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return state;
}

export default useTextScramble;
