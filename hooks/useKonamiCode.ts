import { useEffect, useRef, useState, useCallback } from 'react';

const KONAMI_SEQUENCE = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

export function useKonamiCode() {
  const [triggered, setTriggered] = useState(false);
  const indexRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const reset = useCallback(() => setTriggered(false), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const expected = KONAMI_SEQUENCE[indexRef.current];
      if (e.key === expected || e.key.toLowerCase() === expected) {
        indexRef.current++;
        // Reset progress if no input within 2s
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => { indexRef.current = 0; }, 2000);

        if (indexRef.current === KONAMI_SEQUENCE.length) {
          indexRef.current = 0;
          clearTimeout(timeoutRef.current);
          setTriggered(true);
        }
      } else {
        indexRef.current = 0;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return { triggered, reset };
}
