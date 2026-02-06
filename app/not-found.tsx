'use client';

import { useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';

const GLITCH_SETS = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!',
  '\u30A2\u30A4\u30A6\u30A8\u30AA\u30AB\u30AD\u30AF\u30B1\u30B3\u30B5\u30B7\u30B9\u30BB\u30BD\u30BF\u30C1\u30C4\u30C6\u30C8\u30CA\u30CB\u30CC\u30CD\u30CE\u30CF\u30D2\u30D5\u30D8\u30DB\u30DE\u30DF\u30E0\u30E1\u30E2',  // katakana
  '01001101 01001111 01010010 01010100',  // binary fragments
  '\u2580\u2584\u2588\u258C\u2590\u2591\u2592\u2593\u2502\u2500\u250C\u2510\u2514\u2518\u253C\u251C\u2524\u252C\u2534',  // box drawing
  '\u0394\u03A3\u03A9\u03A6\u03A8\u039B\u039E\u03A0\u0398\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7',  // greek
  '!<>-_\\/[]{}=+*^?#@&$%~`|;:',  // symbols
];

function pickGlitchSet(): string {
  return GLITCH_SETS[Math.floor(Math.random() * GLITCH_SETS.length)];
}

function useGlitchText(target: string, triggerOnMount = false) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef(0);

  const upper = target.toUpperCase();

  // One-shot decode: scramble → resolve left-to-right
  const scramble = useCallback(() => {
    let iter = 0;
    const chars = pickGlitchSet();
    const totalSteps = upper.length * 5;

    const tick = () => {
      iter++;
      const resolved = Math.floor(iter / 5);

      const text = upper
        .split('')
        .map((char, i) => {
          if (char === ' ') return ' ';
          if (i < resolved) return char;
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      if (spanRef.current) spanRef.current.textContent = text;

      if (iter < totalSteps) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
  }, [upper]);

  useEffect(() => {
    if (triggerOnMount) {
      const delay = setTimeout(scramble, 300);
      return () => clearTimeout(delay);
    }
  }, [triggerOnMount, scramble]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return { spanRef, scramble, initial: upper };
}

/** Live clock that updates via DOM ref — zero re-renders */
function LiveClock() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const update = () => {
      if (ref.current) {
        ref.current.textContent = new Date().toLocaleTimeString('en-US', { hour12: false });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return <span ref={ref} className="text-[var(--gs-loss)] tabular-nums">--:--:--</span>;
}

function ScanLine() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.03]"
      aria-hidden="true"
    >
      <div className="absolute inset-x-0 h-[2px] bg-[var(--gs-lime)] animate-[scanline_4s_linear_infinite]" />
    </div>
  );
}

function Crosshair() {
  return (
    <div
      className="absolute inset-0 pointer-events-none flex items-center justify-center animate-[fadeScale_600ms_ease-out_100ms_both]"
      aria-hidden="true"
    >
      {/* Horizontal line */}
      <div className="absolute w-[min(600px,80vw)] h-px bg-[var(--gs-lime)]/[0.06]" />
      {/* Vertical line */}
      <div className="absolute h-[min(400px,60vh)] w-px bg-[var(--gs-lime)]/[0.06]" />
      {/* Outer ring — slow rotate */}
      <div className="absolute size-[min(300px,50vw)] rounded-full border border-[var(--gs-lime)]/[0.04] animate-[scopeRotate_60s_linear_infinite]" />
      {/* Inner ring */}
      <div className="absolute size-[min(180px,30vw)] rounded-full border border-[var(--gs-purple)]/[0.06]" />
      {/* Corner brackets — pulse */}
      <div className="absolute size-[min(240px,40vw)]">
        <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-[var(--gs-lime)]/[0.1] animate-[bracketPulse_3s_ease-in-out_infinite]" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[var(--gs-lime)]/[0.1] animate-[bracketPulse_3s_ease-in-out_750ms_infinite]" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[var(--gs-lime)]/[0.1] animate-[bracketPulse_3s_ease-in-out_1500ms_infinite]" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[var(--gs-lime)]/[0.1] animate-[bracketPulse_3s_ease-in-out_2250ms_infinite]" />
      </div>
    </div>
  );
}

function HudReadout({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] tracking-[1.5px] uppercase">
      <span className="text-[var(--gs-gray-3)]">{label}</span>
      <span className="text-[var(--gs-gray-2)] mx-1">//</span>
      {children}
    </div>
  );
}

export default function NotFound() {
  const { spanRef: errorRef, scramble: errorScramble, initial: errorInitial } = useGlitchText('404', true);
  const { spanRef: messageRef, scramble: msgScramble, initial: messageInitial } = useGlitchText('TARGET NOT FOUND', true);

  // Re-glitch both every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      errorScramble();
      msgScramble();
    }, 4000);
    return () => clearInterval(interval);
  }, [errorScramble, msgScramble]);

  return (
    <div className="min-h-dvh bg-[var(--gs-black)] text-[var(--gs-white)] relative overflow-hidden flex flex-col">
      {/* Keyframes — all compositor-only (transform + opacity) */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-10vh); }
          100% { transform: translateY(110vh); }
        }
        @keyframes scopeRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bracketPulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }
        @keyframes ghostDrift {
          0%, 100% { transform: translate(3px, -2px); }
          50% { transform: translate(-2px, 1px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeScale {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-delay: 0ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <ScanLine />
      <Crosshair />

      {/* Nav bar */}
      <nav className="relative z-10 px-4 sm:px-6 lg:px-8 h-16 flex items-center animate-[fadeIn_300ms_ease-out_both]">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="transition-transform duration-150 group-hover:scale-105">
            <Logo size="md" variant="full" />
          </div>
        </Link>
      </nav>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        {/* Error code — auto-glitches every few seconds */}
        <div className="relative select-none animate-[fadeDown_400ms_ease-out_both]">
          <span
            ref={errorRef}
            className="font-display font-bold text-[clamp(6rem,20vw,14rem)] leading-none tracking-[-0.02em] text-[var(--gs-lime)] tabular-nums"
          >
            {errorInitial}
          </span>
          {/* Ghost echo — slow CRT drift */}
          <span
            className="absolute inset-0 font-display font-bold text-[clamp(6rem,20vw,14rem)] leading-none tracking-[-0.02em] text-[var(--gs-purple)] tabular-nums opacity-20 animate-[ghostDrift_8s_ease-in-out_infinite]"
            aria-hidden="true"
          >
            {errorInitial}
          </span>
        </div>

        {/* Message */}
        <div className="mt-4 mb-2 animate-[fadeUp_300ms_ease-out_200ms_both]">
          <span
            ref={messageRef}
            className="font-mono text-sm sm:text-base tracking-[3px] uppercase text-[var(--gs-gray-3)]"
          >
            {messageInitial}
          </span>
        </div>

        {/* HUD readouts */}
        <div className="flex items-center gap-4 sm:gap-6 mt-4 mb-10 flex-wrap justify-center animate-[fadeIn_300ms_ease-out_400ms_both]">
          <HudReadout label="Status">
            <span className="text-[var(--gs-loss)] tabular-nums">No Signal</span>
          </HudReadout>
          <HudReadout label="Sector">
            <span className="text-[var(--gs-loss)] tabular-nums">Unknown</span>
          </HudReadout>
          <HudReadout label="Time">
            <LiveClock />
          </HudReadout>
        </div>

        {/* Description */}
        <p className="text-pretty font-body text-sm text-[var(--gs-gray-4)] mb-8 max-w-md text-center animate-[fadeUp_300ms_ease-out_500ms_both]">
          The coordinates you entered don&apos;t match any known location in the GUNZscope network.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-4 animate-[fadeUp_300ms_ease-out_600ms_both]">
          <Link
            href="/"
            className="font-display font-semibold text-sm uppercase px-8 py-3 bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors"
          >
            Return to Base
          </Link>
          <Link
            href="/portfolio"
            className="font-display font-semibold text-sm uppercase px-8 py-3 border border-white/[0.1] text-[var(--gs-gray-4)] hover:border-[var(--gs-lime)]/30 hover:text-[var(--gs-white)] transition-colors"
          >
            Portfolio
          </Link>
        </div>
      </main>

      {/* Bottom HUD bar */}
      <footer className="relative z-10 px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between border-t border-white/[0.04] animate-[fadeIn_300ms_ease-out_700ms_both]">
        <span className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)]">
          GUNZscope // Error Handler
        </span>
        <span className="font-mono text-[9px] tracking-[1.5px] uppercase text-[var(--gs-gray-2)] tabular-nums">
          HTTP 404
        </span>
      </footer>
    </div>
  );
}
