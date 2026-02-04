'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface UseGlitchTypewriterOptions {
  words: string[];
  typingSpeed?: number;
  pauseDuration?: number;
  glitchDuration?: number;
  glitchCharacters?: string;
}

interface GlitchTypewriterState {
  displayText: string;
  isTyping: boolean;
  isGlitching: boolean;
  currentWordIndex: number;
  isComplete: boolean;
}

export function useGlitchTypewriter({
  words,
  typingSpeed = 60,
  pauseDuration = 2500,
  glitchDuration = 300,
  glitchCharacters = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`',
}: UseGlitchTypewriterOptions): GlitchTypewriterState & { cursorVisible: boolean } {
  const [state, setState] = useState<GlitchTypewriterState>(() => ({
    displayText: words[0]?.[0] ?? '', // Start with first character immediately
    isTyping: true,
    isGlitching: false,
    currentWordIndex: 0,
    isComplete: false,
  }));
  const [cursorVisible, setCursorVisible] = useState(true);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const glitchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prefersReducedMotionRef = useRef(false);

  // Cursor blink effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    return () => clearInterval(cursorInterval);
  }, []);

  // Check for reduced motion preference
  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotionRef.current) {
      setState({
        displayText: words[0],
        isTyping: false,
        isGlitching: false,
        currentWordIndex: 0,
        isComplete: true,
      });

      const cycleInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          currentWordIndex: (prev.currentWordIndex + 1) % words.length,
          displayText: words[(prev.currentWordIndex + 1) % words.length],
        }));
      }, pauseDuration + 1000);

      return () => clearInterval(cycleInterval);
    }
  }, [words, pauseDuration]);

  const getRandomGlitchChar = useCallback(() => {
    return glitchCharacters[Math.floor(Math.random() * glitchCharacters.length)];
  }, [glitchCharacters]);

  const glitchTransition = useCallback((targetWord: string, fromWord: string, onComplete: () => void) => {
    const currentLength = Math.max(fromWord.length, targetWord.length);
    const glitchFrames = Math.floor(glitchDuration / 30);
    let frame = 0;

    setState(prev => ({ ...prev, isGlitching: true, isTyping: false }));

    glitchIntervalRef.current = setInterval(() => {
      frame++;

      if (frame >= glitchFrames) {
        if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
        setState(prev => ({
          ...prev,
          displayText: targetWord[0] ?? '', // Start with first char of new word
          isGlitching: false,
          isTyping: true,
        }));
        onComplete();
        return;
      }

      const progress = frame / glitchFrames;
      let glitchedText = '';

      for (let i = 0; i < currentLength; i++) {
        if (Math.random() > 0.3 + progress * 0.5) {
          glitchedText += getRandomGlitchChar();
        } else if (i < targetWord.length) {
          glitchedText += targetWord[i];
        } else {
          glitchedText += getRandomGlitchChar();
        }
      }

      setState(prev => ({ ...prev, displayText: glitchedText }));
    }, 30);
  }, [glitchDuration, getRandomGlitchChar]);

  // Main typewriter effect - use specific state properties to avoid cleanup on every state change
  useEffect(() => {
    if (prefersReducedMotionRef.current) return;

    const { displayText, isTyping, isGlitching, currentWordIndex } = state;
    const currentWord = words[currentWordIndex];

    if (isTyping && !isGlitching) {
      if (displayText.length < currentWord.length) {
        timeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            displayText: words[prev.currentWordIndex].slice(0, prev.displayText.length + 1),
          }));
        }, typingSpeed);
      } else {
        // Word complete - pause then transition to next
        setState(prev => ({ ...prev, isComplete: true, isTyping: false }));

        timeoutRef.current = setTimeout(() => {
          // Trigger glitch transition to next word
          const nextIndex = (currentWordIndex + 1) % words.length;
          const nextWord = words[nextIndex];

          glitchTransition(nextWord, currentWord, () => {
            setState(prev => ({
              ...prev,
              currentWordIndex: nextIndex,
              isComplete: false,
            }));
          });
        }, pauseDuration);
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.displayText, state.isTyping, state.isGlitching, state.currentWordIndex, words, typingSpeed, pauseDuration]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (glitchIntervalRef.current) clearInterval(glitchIntervalRef.current);
    };
  }, []);

  return { ...state, cursorVisible };
}

export default useGlitchTypewriter;
