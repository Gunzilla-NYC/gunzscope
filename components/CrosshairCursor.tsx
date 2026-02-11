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
  const idleRef = useRef(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const el = elRef.current;
    if (!el) return;

    const SMOOTHING = 0.7;
    const IDLE_THRESHOLD = 0.1; // px — stop rAF when cursor is essentially still
    const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])';

    const animate = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      const dx = tgt.x - cur.x;
      const dy = tgt.y - cur.y;
      cur.x += dx * SMOOTHING;
      cur.y += dy * SMOOTHING;
      el.style.transform = `translate(${cur.x - HALF_SIZE}px, ${cur.y - HALF_SIZE}px)`;

      // Go idle when close enough — saves CPU/GPU when mouse is still
      if (Math.abs(dx) < IDLE_THRESHOLD && Math.abs(dy) < IDLE_THRESHOLD) {
        idleRef.current = true;
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    const wakeLoop = () => {
      if (!idleRef.current) return;
      idleRef.current = false;
      rafRef.current = requestAnimationFrame(animate);
    };

    const onMouseMove = (e: MouseEvent) => {
      targetRef.current.x = e.clientX;
      targetRef.current.y = e.clientY;
      if (!visibleRef.current) {
        visibleRef.current = true;
        el.style.opacity = '1';
      }

      wakeLoop();

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
      wakeLoop();
    };

    window.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);
    document.addEventListener('mouseenter', onMouseEnter);
    wakeLoop();

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
        <g className="crosshair-scope">
          {/* Glow layer — static, no filter needed */}
          <line x1="12" y1="0" x2="12" y2="24" stroke="rgba(166, 247, 0, 0.3)" strokeWidth="3" />
          <line x1="0" y1="12" x2="24" y2="12" stroke="rgba(166, 247, 0, 0.3)" strokeWidth="3" />
          {/* Sharp lines */}
          <line x1="12" y1="0" x2="12" y2="24" stroke="#A6F700" strokeWidth="1" />
          <line x1="0" y1="12" x2="24" y2="12" stroke="#A6F700" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
