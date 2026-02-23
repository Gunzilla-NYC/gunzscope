'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { UpdateEntry } from '@/lib/data/updates';

// ---------------------------------------------------------------------------
// Chevron icon — rotates when open
// ---------------------------------------------------------------------------
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Single accordion entry
// ---------------------------------------------------------------------------
function UpdateAccordionItem({
  entry,
  isFirst,
  open,
  onToggle,
}: {
  entry: UpdateEntry;
  isFirst: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const isInitial = entry.tag === 'initial';
  const isCurrent = entry.tag === 'current';
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(open ? undefined : 0);

  // Measure content height for smooth transition
  useEffect(() => {
    if (!contentRef.current) return;
    if (open) {
      setHeight(contentRef.current.scrollHeight);
      // After transition, switch to auto so content can reflow
      const timer = setTimeout(() => setHeight(undefined), 200);
      return () => clearTimeout(timer);
    } else {
      // Set explicit height first so transition works from current value
      setHeight(contentRef.current.scrollHeight);
      // Force reflow, then collapse
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight(0));
      });
    }
  }, [open]);

  return (
    <section className="relative">
      {/* Clickable header row */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 text-left group cursor-pointer py-1 -my-1"
        aria-expanded={open}
      >
        {/* Version */}
        <h2 className="font-display font-bold text-lg uppercase text-[var(--gs-white)] shrink-0">
          {entry.version}
        </h2>

        {/* Tag badge */}
        {isCurrent && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.06] shrink-0">
            Latest
          </span>
        )}
        {isInitial && (
          <span className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 text-[var(--gs-purple)] border border-[var(--gs-purple)]/30 bg-[var(--gs-purple)]/[0.06] shrink-0">
            Genesis
          </span>
        )}

        {/* Title — truncated on small screens */}
        {entry.title && (
          <span className="font-body text-sm text-[var(--gs-white)]/50 truncate min-w-0 hidden sm:inline">
            {entry.title}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Date */}
        <span className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] shrink-0 hidden sm:inline">
          {entry.date}
        </span>

        {/* Chevron */}
        <span className="text-[var(--gs-gray-3)] group-hover:text-[var(--gs-white)] transition-colors shrink-0">
          <Chevron open={open} />
        </span>
      </button>

      {/* Mobile date — shown below header on small screens */}
      <p className="font-mono text-caption tracking-wider uppercase text-[var(--gs-gray-3)] mt-1 sm:hidden">
        {entry.date}
      </p>

      {/* Collapsible content */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-200 ease-in-out"
        style={{ height: height === undefined ? 'auto' : height }}
        aria-hidden={!open}
      >
        <div className="pt-3">
          {entry.title && (
            <p className="font-body text-sm text-[var(--gs-white)]/80 mb-2">{entry.title}</p>
          )}

          <ul className="space-y-2">
            {entry.items.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[var(--gs-gray-4)] leading-relaxed font-body">
                <span
                  className={`mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isFirst ? 'bg-[var(--gs-lime)]' : 'bg-[var(--gs-gray-1)]'
                  }`}
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Timeline with accordion
// ---------------------------------------------------------------------------
export default function UpdateTimeline({ updates }: { updates: UpdateEntry[] }) {
  // Default: first entry (current) expanded, all others collapsed
  const [openSet, setOpenSet] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (updates.length > 0) initial.add(updates[0].version);
    return initial;
  });

  const toggle = useCallback((version: string) => {
    setOpenSet(prev => {
      const next = new Set(prev);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  }, []);

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--gs-lime)]/40 via-[var(--gs-purple)]/20 to-transparent"
        aria-hidden="true"
      />

      <div className="space-y-8 pl-6">
        {updates.map((entry, i) => (
          <UpdateAccordionItem
            key={entry.version}
            entry={entry}
            isFirst={i === 0}
            open={openSet.has(entry.version)}
            onToggle={() => toggle(entry.version)}
          />
        ))}
      </div>
    </div>
  );
}
