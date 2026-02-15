import { useRef, useEffect, useCallback } from 'react';

/**
 * Click-and-drag horizontal scrolling for zoomed chart containers.
 *
 * Returns a ref to attach to the `overflow-x-auto` wrapper.
 * When `enabled` (i.e. zoomed beyond 1x), the user can click-drag
 * to pan the chart sideways. Shows grab/grabbing cursors.
 *
 * Uses native listeners so cursor and selection overrides apply
 * immediately without React re-render lag.
 */
export function useGrabScroll(enabled: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (!enabled) {
      el.style.cursor = '';
      return;
    }

    // Show grab cursor when idle and scrollable
    el.style.cursor = 'grab';

    const onMouseDown = (e: MouseEvent) => {
      // Only left-click
      if (e.button !== 0) return;
      stateRef.current = {
        isDown: true,
        startX: e.pageX,
        scrollLeft: el.scrollLeft,
      };
      el.style.cursor = 'grabbing';
      el.style.userSelect = 'none';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!stateRef.current.isDown) return;
      const dx = e.pageX - stateRef.current.startX;
      el.scrollLeft = stateRef.current.scrollLeft - dx;
    };

    const onMouseUp = () => {
      if (!stateRef.current.isDown) return;
      stateRef.current.isDown = false;
      el.style.cursor = 'grab';
      el.style.userSelect = '';
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.style.cursor = '';
      el.style.userSelect = '';
    };
  }, [enabled]);

  return scrollRef;
}
