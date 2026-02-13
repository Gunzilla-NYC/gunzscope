'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom crosshair cursor — performance-optimized.
 *
 * Key optimizations:
 * - Uses CSS translate3d (GPU-composited) instead of translate
 * - Caches interactive-element detection to avoid closest() on every mousemove
 * - Passive mousemove listener (no preventDefault needed)
 * - Idle detection stops rAF loop when cursor is still
 * - willChange only active during movement, removed when idle
 * - No React state — pure DOM refs for zero re-renders
 */

const HALF = 12; // 24px reticle / 2
const SMOOTHING = 0.7;
const IDLE_THRESHOLD = 0.05; // sub-pixel — stop rAF when essentially still

// Matches: <a>, <button>, [role="button"], <input>, <select>, <textarea>, <summary>, [tabindex]
function isInteractive(el: Element | null): boolean {
  while (el && el !== document.body) {
    const tag = el.tagName;
    if (
      tag === 'A' || tag === 'BUTTON' || tag === 'INPUT' ||
      tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'SUMMARY'
    ) return true;
    const role = el.getAttribute('role');
    if (role === 'button') return true;
    const tabindex = el.getAttribute('tabindex');
    if (tabindex !== null && tabindex !== '-1') return true;
    el = el.parentElement;
  }
  return false;
}

export default function CrosshairCursor() {
  const elRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const el = elRef.current;
    if (!el) return;

    // Position state — plain numbers, no object allocation per frame
    let tx = 0, ty = 0;   // target
    let cx = 0, cy = 0;   // current (interpolated)
    let idle = true;
    let visible = false;
    let interactive = false;

    const animate = () => {
      const dx = tx - cx;
      const dy = ty - cy;
      cx += dx * SMOOTHING;
      cy += dy * SMOOTHING;

      // translate3d triggers GPU compositing — no layout/paint
      el.style.transform = `translate3d(${cx - HALF}px,${cy - HALF}px,0)`;

      if (Math.abs(dx) < IDLE_THRESHOLD && Math.abs(dy) < IDLE_THRESHOLD) {
        idle = true;
        // Remove willChange when idle to free compositor memory
        el.style.willChange = 'auto';
        return;
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    const wake = () => {
      if (!idle) return;
      idle = false;
      el.style.willChange = 'transform';
      rafRef.current = requestAnimationFrame(animate);
    };

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;

      if (!visible) {
        visible = true;
        el.style.opacity = '1';
      }

      wake();

      // Interactive detection — manual parent walk is faster than closest() with a complex selector
      const over = isInteractive(e.target as Element);
      if (over !== interactive) {
        interactive = over;
        el.classList.toggle('is-interactive', over);
      }
    };

    const onLeave = () => {
      visible = false;
      el.style.opacity = '0';
    };

    const onEnter = () => {
      visible = true;
      el.style.opacity = '1';
      wake();
    };

    // passive: true — we never call preventDefault, so tell the browser to skip that check
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={elRef}
      aria-hidden="true"
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        opacity: 0,
        zIndex: 9999,
        willChange: 'auto',
        contain: 'layout paint',
      }}
    >
      {/* Inline SVG — 4 lines, no filters, crispEdges. Lighter than an <img> data-URI
          because React hydrates it once and the browser composites it with the parent transform. */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="crosshair-reticle"
      >
        <g className="crosshair-scope">
          {/* Glow (wide, semi-transparent) */}
          <line x1="12" y1="0" x2="12" y2="24" stroke="rgba(166,247,0,0.3)" strokeWidth="3" />
          <line x1="0" y1="12" x2="24" y2="12" stroke="rgba(166,247,0,0.3)" strokeWidth="3" />
          {/* Crisp center lines */}
          <line x1="12" y1="0" x2="12" y2="24" stroke="#A6F700" strokeWidth="1" />
          <line x1="0" y1="12" x2="24" y2="12" stroke="#A6F700" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
