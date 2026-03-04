'use client';

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface SlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Ref to the trigger button — panel aligns vertically with it */
  triggerRef?: RefObject<HTMLElement | null>;
  'aria-label'?: string;
}

const SPRING = { stiffness: 300, damping: 30, mass: 0.8 };

export default function SlidePanel({
  isOpen,
  onClose,
  title,
  children,
  triggerRef,
  'aria-label': ariaLabel,
}: SlidePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(80);

  // Keep panel pinned to trigger element on scroll/resize
  useEffect(() => {
    if (!isOpen || !triggerRef?.current) return;
    const el = triggerRef.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setTop(Math.max(rect.top, 24));
    };
    update();
    window.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
    };
  }, [isOpen, triggerRef]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus panel on open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="slide-backdrop"
          className="fixed inset-0 z-[59]"
          onClick={onClose}
          aria-hidden="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        />
      )}
      {isOpen && (
        <motion.div
          key="slide-panel"
          ref={panelRef}
          className="fixed right-6 w-72 max-w-[calc(100vw-48px)] z-[60] flex flex-col bg-[var(--gs-dark-2)] border border-white/[0.06] shadow-xl shadow-black/40 overflow-hidden"
          style={{
            top,
            maxHeight: `calc(100dvh - ${top}px - 24px)`,
            clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
          }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel ?? title}
          tabIndex={-1}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', ...SPRING }}
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
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
