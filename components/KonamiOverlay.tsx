'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WalletAddressInput } from '@/components/ui/WalletAddressInput';
import { detectChain } from '@/lib/utils/detectChain';

interface KonamiOverlayProps {
  active: boolean;
  onDismiss: () => void;
  onSubmit: (address: string) => void;
}

// Tactical scan lines that appear in sequence
const SCAN_LINES = [
  { text: 'SIGNAL INTERCEPTED', delay: 0 },
  { text: 'DECRYPTING ███████ CLEARANCE LEVEL', delay: 400 },
  { text: 'OPERATOR IDENTIFIED', delay: 800 },
  { text: 'CODENAME: SCOPE_HUNTER', delay: 1100 },
  { text: '> ACCESS GRANTED', delay: 1500, accent: true },
];

const LAST_LINE_DELAY = SCAN_LINES[SCAN_LINES.length - 1].delay;

// Random hex blocks for the background matrix effect
function useMatrixRain(active: boolean) {
  const [columns, setColumns] = useState<string[][]>([]);

  useEffect(() => {
    if (!active) { setColumns([]); return; }

    const colCount = Math.floor(window.innerWidth / 18);
    const rowCount = Math.floor(window.innerHeight / 18);
    const chars = '0123456789ABCDEF';

    const generate = () => {
      const cols: string[][] = [];
      for (let c = 0; c < colCount; c++) {
        const col: string[] = [];
        for (let r = 0; r < rowCount; r++) {
          col.push(Math.random() < 0.3 ? chars[Math.floor(Math.random() * chars.length)] : ' ');
        }
        cols.push(col);
      }
      setColumns(cols);
    };

    generate();
    const interval = setInterval(generate, 120);
    return () => clearInterval(interval);
  }, [active]);

  return columns;
}

export default function KonamiOverlay({ active, onDismiss, onSubmit }: KonamiOverlayProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [showInput, setShowInput] = useState(false);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const columns = useMatrixRain(active);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const cleanup = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    setVisibleLines(0);
    setShowInput(false);
    setAddress('');
    setSubmitting(false);
  }, []);

  useEffect(() => {
    if (!active) { cleanup(); return; }

    // Reveal lines one by one
    SCAN_LINES.forEach((line, i) => {
      const t = setTimeout(() => setVisibleLines(i + 1), line.delay);
      timerRef.current.push(t);
    });

    // Show input after badge appears
    const inputTimer = setTimeout(() => setShowInput(true), LAST_LINE_DELAY + 1200);
    timerRef.current.push(inputTimer);

    return cleanup;
  }, [active, cleanup]);

  // Auto-focus input when it appears
  useEffect(() => {
    if (showInput) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showInput]);

  // ESC to dismiss
  useEffect(() => {
    if (!active) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, onDismiss]);

  const chain = detectChain(address);
  const isValid = chain === 'gunzchain' || chain === 'solana';

  const handleSubmit = () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    onSubmit(address);
  };

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.92)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
        >
          {/* Matrix rain background */}
          <div className="absolute inset-0 overflow-hidden opacity-15 pointer-events-none select-none"
               aria-hidden="true">
            <pre className="font-mono text-[12px] leading-[18px] text-[var(--gs-lime)]">
              {columns.map((col) => col.join('')).join('\n')}
            </pre>
          </div>

          {/* Horizontal scan line */}
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: 'var(--gs-lime)', boxShadow: '0 0 20px var(--gs-lime)' }}
            initial={{ top: 0, opacity: 0.6 }}
            animate={{ top: '100%', opacity: 0 }}
            transition={{ duration: 2.5, ease: 'linear' }}
          />

          {/* Corner brackets */}
          <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-[var(--gs-lime)] opacity-50" />
          <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-[var(--gs-lime)] opacity-50" />
          <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-[var(--gs-lime)] opacity-50" />
          <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-[var(--gs-lime)] opacity-50" />

          {/* Scan lines content */}
          <div className="relative z-10 flex flex-col gap-3 px-8 max-w-lg w-full">
            {SCAN_LINES.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
                className={`font-mono text-sm tracking-widest uppercase ${
                  line.accent
                    ? 'text-[var(--gs-lime)] text-lg font-bold'
                    : 'text-white/70'
                }`}
              >
                {line.accent && (
                  <motion.span
                    className="inline-block w-2 h-4 bg-[var(--gs-lime)] mr-2 align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                  />
                )}
                {line.text}
              </motion.div>
            ))}

            {/* GUNZscope badge after all lines revealed */}
            {visibleLines === SCAN_LINES.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-6 text-center"
              >
                <div className="inline-block border border-[var(--gs-lime)]/30 px-6 py-4"
                     style={{ clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)' }}>
                  <div className="font-[family-name:var(--font-chakra)] text-2xl font-bold text-[var(--gs-lime)] tracking-wider">
                    GUNZ<span className="text-white/90">SCOPE</span>
                  </div>
                  <div className="font-mono text-[9px] tracking-[0.3em] text-white/40 mt-1">
                    TACTICAL INTELLIGENCE SYSTEM
                  </div>
                </div>
              </motion.div>
            )}

            {/* Wallet input — appears after badge */}
            {showInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6"
              >
                <div className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-2">
                  Enter wallet address for clearance
                </div>
                <div className="flex gap-2">
                  <WalletAddressInput
                    value={address}
                    onChange={(val) => { setAddress(val); }}
                    placeholder="0x... or Solana address"
                    inputRef={inputRef}
                    className="flex-1 !bg-black/60 !border-[var(--gs-lime)]/30 focus-within:!border-[var(--gs-lime)]/60"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid || submitting}
                    className="shrink-0 px-4 py-2 font-mono text-xs uppercase tracking-widest
                      bg-[var(--gs-lime)] text-black font-bold
                      disabled:opacity-30 disabled:cursor-not-allowed
                      hover:brightness-110 transition-all"
                    style={{ clipPath: 'polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)' }}
                  >
                    {submitting ? '...' : 'Enter'}
                  </button>
                </div>
                <div className="font-mono text-[9px] text-white/20 mt-2 text-center">
                  press ESC to dismiss
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
