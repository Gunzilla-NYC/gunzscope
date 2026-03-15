'use client';

import { useEffect, useRef } from 'react';

/**
 * Custom green arrow cursor — performance-optimized.
 *
 * Key optimizations:
 * - Zero-lag: transform applied directly in mousemove handler (no rAF delay)
 * - Uses CSS translate3d (GPU-composited) instead of translate
 * - Caches interactive-element detection to avoid closest() on every mousemove
 * - Passive mousemove listener (no preventDefault needed)
 * - No React state — pure DOM refs for zero re-renders
 */

// Arrow tip offset — the green fill tip is at SVG coord (0.8, 0.8).
// Offset the div so the tip lands exactly at the mouse position.
const TIP_X = 1;
const TIP_Y = 1;

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

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const el = elRef.current;
    if (!el) return;

    // Signal to CSS that the custom cursor is active
    document.documentElement.classList.add('gs-custom-cursor');

    let visible = false;
    let interactive = false;

    // Cache the last inspected target to skip redundant DOM walks
    let lastTarget: Element | null = null;
    let lastResult = false;

    const onMove = (e: MouseEvent) => {
      // Apply transform directly — no rAF delay, tip tracks mouse exactly
      el.style.transform = `translate3d(${e.clientX - TIP_X}px,${e.clientY - TIP_Y}px,0)`;

      if (!visible) {
        visible = true;
        el.style.opacity = '1';
      }

      // Interactive detection — skip DOM walk if target hasn't changed
      const target = e.target as Element;
      if (target !== lastTarget) {
        lastTarget = target;
        lastResult = isInteractive(target);
      }
      if (lastResult !== interactive) {
        interactive = lastResult;
        el.classList.toggle('is-interactive', lastResult);
      }
    };

    const onLeave = () => {
      visible = false;
      el.style.opacity = '0';
    };

    const onEnter = () => {
      visible = true;
      el.style.opacity = '1';
    };

    // passive: true — we never call preventDefault, so tell the browser to skip that check
    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      document.documentElement.classList.remove('gs-custom-cursor');
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
        willChange: 'transform',
        contain: 'layout paint',
      }}
    >
      {/* Green arrow cursor — standard pointer shape, brand-colored */}
      <svg
        width="16"
        height="19"
        viewBox="0 0 16 19"
        fill="none"
        className="cursor-arrow"
      >
        <g className="cursor-arrow-shape">
          {/* Dark outline for definition */}
          <path
            d="M 0.8 0.8 L 0.8 15.2 L 4.4 11.6 L 7.6 17.6 L 10 16.4 L 6.8 10 L 11.2 10 Z"
            stroke="#0A0A0A"
            strokeWidth="1.6"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Green fill */}
          <path
            d="M 0.8 0.8 L 0.8 15.2 L 4.4 11.6 L 7.6 17.6 L 10 16.4 L 6.8 10 L 11.2 10 Z"
            fill="#A6F700"
          />
        </g>
      </svg>
    </div>
  );
}
