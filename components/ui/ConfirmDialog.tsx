'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Button from './Button';
import { clipHex } from '@/lib/utils/styles';

interface ConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  loading?: boolean;
}

const SPRING = { stiffness: 300, damping: 30, mass: 0.8 };

export default function ConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  loading = false,
}: ConfirmDialogProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, handleKey]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80" />

          {/* Card */}
          <motion.div
            className="relative w-full max-w-sm mx-4 overflow-hidden border border-white/[0.06] bg-[rgba(22,22,22,0.88)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', ...SPRING }}
            style={{ clipPath: clipHex(8) }}
          >
            {/* Top accent line */}
            <div
              className="h-[2px] w-full"
              style={{
                background:
                  variant === 'danger'
                    ? 'linear-gradient(90deg, rgba(255,68,68,0.6), rgba(255,68,68,0.1))'
                    : 'linear-gradient(90deg, rgba(166,247,0,0.6), rgba(109,91,255,0.3))',
              }}
            />

            <div className="p-5 space-y-4">
              {/* Title */}
              <p className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--gs-white)]">
                {title}
              </p>

              {/* Message */}
              <p className="font-mono text-[11px] leading-relaxed text-[var(--gs-gray-3)]">
                {message}
              </p>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant={variant === 'danger' ? 'danger' : 'primary'}
                  size="sm"
                  className="flex-1"
                  onClick={onConfirm}
                  loading={loading}
                >
                  {confirmLabel}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={onCancel}
                  disabled={loading}
                >
                  {cancelLabel}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
