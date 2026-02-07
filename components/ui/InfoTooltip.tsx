'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  text: string;
}

export default function InfoTooltip({ text }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        onMouseEnter={() => { setOpen(true); updatePosition(); }}
        onMouseLeave={() => setOpen(false)}
        className="text-[var(--gs-gray-2)] hover:text-[var(--gs-gray-4)] transition-colors cursor-help"
        aria-label="More info"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 16v-4m0-4h.01" />
        </svg>
      </button>
      {open && pos && createPortal(
        <div
          className="fixed w-52 px-3 py-2 bg-[var(--gs-dark-1)] border border-white/10 shadow-xl shadow-black/40 z-[100] -translate-x-1/2"
          style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-body text-[11px] leading-relaxed text-[var(--gs-gray-4)]">{text}</p>
        </div>,
        document.body
      )}
    </>
  );
}
