'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  'aria-label'?: string;
}

export default function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
  'aria-label': ariaLabel,
}: SlidePanelProps) {
  // Two-phase render: mount first, then animate in next frame
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Mount, then trigger CSS transition on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Focus trap — focus panel on open
  useEffect(() => {
    if (isOpen && visible && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen, visible]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 h-dvh w-80 max-w-[90vw] z-[60] flex flex-col bg-[var(--gs-dark-2)] border-l border-white/[0.08] shadow-2xl shadow-black/60 transition-transform duration-200 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
        tabIndex={-1}
      >
        {/* Accent line */}
        <div className="h-[2px] shrink-0 bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
            {title}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--gs-gray-3)] hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>,
    document.body,
  );
}
