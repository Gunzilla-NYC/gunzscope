'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

interface DropPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** DOM node to portal into (the panel slot below PortfolioHeader) */
  portalTarget: HTMLDivElement | null;
  /** Ref to the trigger button — clicks on it are excluded from click-outside detection */
  triggerRef?: RefObject<HTMLElement | null>;
  'aria-label'?: string;
}

// Spring config — gentle deceleration, no bounce
const SPRING = { stiffness: 300, damping: 30, mass: 0.8 };

/**
 * Drop-down panel that slides down from under the PortfolioHeader bar.
 * Content is portaled into a slot div placed below the header's clip-path container.
 *
 * Uses motion/react (Framer Motion) for spring-based height + opacity animation.
 * AnimatePresence handles exit animations automatically — no manual mount/unmount timers.
 */
export default function DropPanel({
  isOpen,
  onClose,
  title,
  children,
  portalTarget,
  triggerRef,
  'aria-label': ariaLabel,
}: DropPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Stable close ref to avoid re-registering listeners
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Stable trigger ref
  const triggerRefStable = useRef(triggerRef);
  triggerRefStable.current = triggerRef;

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Click outside — excludes the trigger button to prevent toggle race conditions.
  // Uses 'click' (not 'mousedown') so it fires after the trigger button's onClick,
  // letting the toggle logic resolve first.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRefStable.current?.current?.contains(target)) return;
      onCloseRef.current();
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [isOpen]);

  // Focus panel on open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!portalTarget || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: { type: 'spring', ...SPRING }, opacity: { duration: 0.25 } }}
          style={{ overflow: 'hidden' }}
        >
          <div
            ref={panelRef}
            className="bg-[var(--gs-dark-2)] border border-white/[0.06] border-t-0 shadow-xl shadow-black/40"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel ?? title}
            tabIndex={-1}
          >
            {/* Scrollable content area */}
            <div className="overflow-y-auto max-h-[60vh]">
              {children}
            </div>

            {/* Footer bar: title + close */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06]">
              <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-gray-3)]">
                {title}
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-[var(--gs-gray-3)] hover:text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Close panel"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Bottom accent gradient */}
            <div className="h-[2px] shrink-0 bg-gradient-to-r from-[var(--gs-lime)] to-[var(--gs-purple)]" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget,
  );
}
