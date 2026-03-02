import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useGlitchScramble } from './hooks/useGlitchScramble';

interface ExperimentsDropdownProps {
  pathname: string;
  leaderboardHref: string;
}

const ITEMS = [
  { key: '/leaderboard', label: 'Leaderboard' },
  { key: '/scarcity', label: 'Scarcity' },
  { key: '/market', label: 'Market' },
];

export function ExperimentsDropdown({ pathname, leaderboardHref }: ExperimentsDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isActive = pathname === '/leaderboard' || pathname === '/scarcity' || pathname === '/market';
  const { display, hovered, scramble, reset } = useGlitchScramble({ label: 'Experiments' });
  const showBrackets = hovered || isActive;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function getHref(key: string) {
    return key === '/leaderboard' ? leaderboardHref : key;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        onMouseEnter={scramble}
        onMouseLeave={reset}
        className={`relative font-mono text-body-sm tracking-wider uppercase transition-colors duration-150 inline-flex items-center gap-1 py-1 cursor-pointer ${
          isActive
            ? 'text-[var(--gs-lime)]'
            : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)]'
        }`}
      >
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>[&nbsp;</span>
        {display}
        <svg
          className={`w-3 h-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className={`inline-block transition-opacity duration-150 ${showBrackets ? 'opacity-100' : 'opacity-0'}`} style={{ color: 'var(--gs-lime)' }}>&nbsp;]</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--gs-dark-2)] border border-white/[0.08] shadow-lg shadow-black/40 clip-corner-sm z-50">
          {ITEMS.map(item => {
            const active = pathname === item.key;
            return (
              <Link
                key={item.key}
                href={getHref(item.key)}
                className={`block font-mono text-body-sm tracking-wider uppercase px-4 py-2.5 transition-colors ${
                  active
                    ? 'text-[var(--gs-lime)] bg-[var(--gs-lime)]/[0.05]'
                    : 'text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] hover:bg-white/[0.03]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
