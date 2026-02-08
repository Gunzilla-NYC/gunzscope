'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom crosshair cursor that contracts on hover over clickable elements.
 *
 * Flat 1px lime + lines matching the original CSS crosshair style (24px).
 *
 * Uses direct DOM manipulation (refs) instead of React state to avoid
 * triggering re-renders on every mouse move / animation frame.
 * Uses left/top positioning (not transform) to coexist with CSS animations.
 */

const HALF_SIZE = 12; // 24px / 2

export default function CrosshairCursor() {
  const elRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const visibleRef = useRef(false);
  const interactiveRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const el = elRef.current;
    if (!el) return;

    const SMOOTHING = 0.25;
    const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

    const onMouseMove = (e: MouseEvent) => {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
      if (!visibleRef.current) {
        visibleRef.current = true;
        el.style.opacity = '1';
      }

      // Detect clickable elements — toggle contract animation
      const target = e.target as Element;
      const isOver = !!target?.closest?.(INTERACTIVE_SELECTOR);
      if (isOver !== interactiveRef.current) {
        interactiveRef.current = isOver;
        el.classList.toggle('is-interactive', isOver);
      }
    };

    const onMouseLeave = () => {
      visibleRef.current = false;
      el.style.opacity = '0';
    };

    const onMouseEnter = () => {
      visibleRef.current = true;
      el.style.opacity = '1';
    };

    const animate = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      cur.x += (tgt.x - cur.x) * SMOOTHING;
      cur.y += (tgt.y - cur.y) * SMOOTHING;
      el.style.transform = `translate(${cur.x - HALF_SIZE}px, ${cur.y - HALF_SIZE}px)`;
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('mouseenter', onMouseEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={elRef}
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        opacity: 0,
        zIndex: 9999,
        willChange: 'transform, opacity',
      }}
      aria-hidden="true"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="crosshair-reticle"
      >
        <defs>
          <filter id="reticle-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#reticle-glow)" className="crosshair-scope">
          {/* Vertical */}
          <line x1="12" y1="0" x2="12" y2="24" stroke="#A6F700" strokeWidth="1" />
          {/* Horizontal */}
          <line x1="0" y1="12" x2="24" y2="12" stroke="#A6F700" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
