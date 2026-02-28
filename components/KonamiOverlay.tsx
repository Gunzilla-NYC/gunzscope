'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { detectChain } from '@/lib/utils/detectChain';

interface KonamiOverlayProps {
  active: boolean;
  onDismiss: () => void;
  onSubmit: (identifier: string, type: 'address' | 'email') => Promise<boolean>;
  onProceed: () => void;
  connectWithEmail?: (email: string) => Promise<void>;
  verifyOtp?: (otp: string) => Promise<unknown>;
  retryOtp?: () => Promise<void>;
}

type Phase = 'input' | 'confirmed' | 'otp' | 'authenticated';

// Tactical scan lines that appear in sequence
const SCAN_LINES = [
  { text: 'SIGNAL INTERCEPTED', delay: 0 },
  { text: 'DECRYPTING ███████ CLEARANCE LEVEL', delay: 400 },
  { text: 'OPERATOR IDENTIFIED', delay: 800 },
  { text: 'CODENAME: SCOPE_HUNTER', delay: 1100 },
  { text: '> ACCESS GRANTED', delay: 1500, accent: true },
];

const LAST_LINE_DELAY = SCAN_LINES[SCAN_LINES.length - 1].delay;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rotate subtitle each trigger
const SUBTITLES = [
  'You found the back door.',
  'Clearance unlocked.',
  'The code worked. Now tell us who you are.',
];
let subtitleIndex = 0;

function classifyInput(value: string): 'gunzchain' | 'solana' | 'email' | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (EMAIL_RE.test(trimmed)) return 'email';
  const chain = detectChain(trimmed);
  if (chain === 'gunzchain' || chain === 'solana') return chain;
  return null;
}

// --- Matrix rain: ASCII logos + code snippets ---

function trimArt(raw: string): string[] {
  const all = raw.split('\n');
  while (all.length && !all[0].trim()) all.shift();
  while (all.length && !all[all.length - 1].trim()) all.pop();
  const minIndent = Math.min(
    ...all.filter(l => l.trim()).map(l => (l.match(/^(\s*)/) ?? ['', ''])[1].length)
  );
  return all.map(l => l.slice(minIndent).trimEnd());
}

const AVAX_ART = trimArt(`
                                        ...
                                      .=+++-
                                     .-+++++=.
                                    .-+++++++-.
                                   .=+++++++++=.
                                  .=++++++++++++.
                                 .=+++++++++++++=.
                                .+++++++++++++++++.
                               .=++++++++++++++++++.
                              .=+++++++++++++++++++=.
                             .+++++++++++++++++++++++.
                            .++++++++++++++++++++++++.
                           .+++++++++++++++++++++++++.
                          .++++++++++++++++++++++++=.
                         .++++++++++++++++++++++++=.
                        .++++++++++++++++++++++++=.
                       .++++++++++++++++++++++++=
                      .++++++++++++++++++++++++=.
                     :++++++++++++++++++++++++-.
                    :++++++++++++++++++++++++-            .=++=.
                   :++++++++++++++++++++++++-            .++++++.
                  :++++++++++++++++++++++++-            .++++++++.
                .-++++++++++++++++++++++++:            .++++++++++.
                :++++++++++++++++++++++++:            :++++++++++++:
               -++++++++++++++++++++++++:            :++++++++++++++:
             .-++++++++++++++++++++++++:            :++++++++++++++++:
            .-++++++++++++++++++++++++:            :++++++++++++++++++:
            -++++++++++++++++++++++++:            -++++++++++++++++++++-.
          .=++++++++++++++++++++++++.            -++++++++++++++++++++++-.
          -++++++++++++++++++++++++.            -++++++++++++++++++++++++-
         .++++++++++++++++++++++++.             ++++++++++++++++++++++++++.
          .-===================:..              :++++++++++++++++++++++++:
`);

const GUNZ_ART = trimArt(`
                 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@=
               @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%+-
             @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%+:
            @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@+:
          @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*-
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@*=
      @@@@@@@@@@@@@@@%#################################=
    @@@@@@@@@@@@@@@%*:
  @@@@@@@@@@@@@@@%*:                        @@@@@@@@@@@:
 @@@@@@@@@@@@@@@*-                          @@@@@@@@@@@:
#%@@@@@@@@@@@@@@#                           @@@@@@@@@@@:
  %%@@@@@@@@@@@@@@%                         @@@@@@@@@@@:
   #%@@@@@@@@@@@@@@@%                       @@@@@@@@@@@:
     #%@@@@@@@@@@@@@@%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:
       #%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:
         #%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:
           #%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:
             %%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:
               %@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@:
                *#**************************%@@@@@@@@@@:
                                             =%@@@@@@@@:
                                               =@@@@@@@:
                                                 *@@@@@:
                                                  +#@@@:
                                                    =#%:
                                                      =
`);

const CODE_SNIPPETS = [
  'const GUNZ_CHAIN_ID = 43419;',
  'await provider.getBlockNumber()',
  'function calcPortfolio(holdings) {',
  'emit Transfer(from, to, tokenId);',
  'mapping(uint256 => address) owners;',
  'require(msg.value >= price);',
  'keccak256(abi.encodePacked(addr))',
  'IERC721.safeTransferFrom(from, to)',
  'function createAtomicSale(id) {',
  'buildTokenKey(contract, tokenId)',
  'async function enrichNFT(token) {',
  'const GUN_ATH_USD = 0.12;',
  'chainId: 0xA99B // GunzChain',
  'pragma solidity ^0.8.24;',
  'contract GunzScope is ERC721 {',
  'function decode(bytes memory data)',
  'balanceOf(address) returns (uint)',
  'totalSupply() returns (uint256)',
  'useNFTEnrichmentOrchestrator()',
  'return calcMarketValue(nft);',
  'rpc.gunzchain.io/ext/bc/2M47',
  'import { ethers } from "ethers"',
  'block.timestamp > deadline',
];

// Matrix rain with embedded logos + code
function useMatrixRain(active: boolean) {
  const [matrixLines, setMatrixLines] = useState<string[]>([]);
  const logoRef = useRef<{ art: string[]; row: number; col: number; ttl: number } | null>(null);
  const snippetsRef = useRef<{ row: number; col: number; text: string; ttl: number }[]>([]);

  useEffect(() => {
    if (!active) {
      setMatrixLines([]);
      logoRef.current = null;
      snippetsRef.current = [];
      return;
    }

    const lineH = 18;
    const colCount = Math.floor(window.innerWidth / 18); // wide spacing → text fills left ~40%
    const rowCount = Math.floor(window.innerHeight / lineH);
    const hexChars = '0123456789ABCDEF';

    const generate = () => {
      // Base: sparse hex noise
      const grid: string[][] = Array.from({ length: rowCount }, () =>
        Array.from({ length: colCount }, () =>
          Math.random() < 0.25 ? hexChars[Math.floor(Math.random() * hexChars.length)] : ' '
        )
      );

      // Logo overlay — persists ~3s then repositions with alternating logo
      if (!logoRef.current || logoRef.current.ttl <= 0) {
        const art = Math.random() < 0.5 ? AVAX_ART : GUNZ_ART;
        const maxW = Math.max(...art.map(l => l.length));
        logoRef.current = {
          art,
          row: Math.max(0, Math.floor(Math.random() * Math.max(1, rowCount - art.length))),
          col: Math.max(0, Math.floor(Math.random() * Math.max(1, colCount - maxW))),
          ttl: 25, // ~3s at 120ms
        };
      }
      logoRef.current.ttl--;
      const { art, row: lr, col: lc } = logoRef.current;
      for (let r = 0; r < art.length; r++) {
        for (let c = 0; c < art[r].length; c++) {
          const ch = art[r][c];
          if (ch !== ' ' && lr + r < rowCount && lc + c < colCount) {
            grid[lr + r][lc + c] = ch;
          }
        }
      }

      // Code snippets — 3-4 persistent lines scattered across the grid
      snippetsRef.current = snippetsRef.current.filter(s => s.ttl > 0);
      while (snippetsRef.current.length < 4) {
        const text = CODE_SNIPPETS[Math.floor(Math.random() * CODE_SNIPPETS.length)];
        snippetsRef.current.push({
          row: Math.floor(Math.random() * rowCount),
          col: Math.max(0, Math.floor(Math.random() * Math.max(1, colCount - text.length))),
          text,
          ttl: 15 + Math.floor(Math.random() * 15), // 1.8-3.6s
        });
      }
      for (const s of snippetsRef.current) {
        s.ttl--;
        for (let c = 0; c < s.text.length; c++) {
          if (s.row < rowCount && s.col + c < colCount) {
            grid[s.row][s.col + c] = s.text[c];
          }
        }
      }

      setMatrixLines(grid.map(row => row.join('')));
    };

    generate();
    const interval = setInterval(generate, 120);
    return () => clearInterval(interval);
  }, [active]);

  return matrixLines;
}

export default function KonamiOverlay({
  active, onDismiss, onSubmit, onProceed,
  connectWithEmail, verifyOtp, retryOtp,
}: KonamiOverlayProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [showInput, setShowInput] = useState(false);
  const [phase, setPhase] = useState<Phase>('input');
  const [value, setValue] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subtitle, setSubtitle] = useState(SUBTITLES[0]);
  const matrixLines = useMatrixRain(active);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const resendTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cleanup = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    if (resendTimerRef.current) clearTimeout(resendTimerRef.current);
    setVisibleLines(0);
    setShowInput(false);
    setPhase('input');
    setValue('');
    setSubmittedEmail('');
    setSubmitting(false);
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError(null);
    setVerifying(false);
    setCanResend(false);
  }, []);

  useEffect(() => {
    if (!active) { cleanup(); return; }

    // Pick subtitle and rotate for next time
    setSubtitle(SUBTITLES[subtitleIndex % SUBTITLES.length]);
    subtitleIndex++;

    SCAN_LINES.forEach((line, i) => {
      const t = setTimeout(() => setVisibleLines(i + 1), line.delay);
      timerRef.current.push(t);
    });

    const inputTimer = setTimeout(() => setShowInput(true), LAST_LINE_DELAY + 1200);
    timerRef.current.push(inputTimer);

    return cleanup;
  }, [active, cleanup]);

  // Auto-focus input when it appears
  useEffect(() => {
    if (showInput && phase === 'input') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showInput, phase]);

  // Auto-focus first OTP box when entering OTP phase
  useEffect(() => {
    if (phase === 'otp') {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [phase]);

  // ESC to dismiss (only during input phase)
  useEffect(() => {
    if (!active || phase !== 'input') return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [active, phase, onDismiss]);

  // Start resend cooldown when entering OTP phase
  useEffect(() => {
    if (phase !== 'otp') return;
    setCanResend(false);
    resendTimerRef.current = setTimeout(() => setCanResend(true), 30000);
    return () => { if (resendTimerRef.current) clearTimeout(resendTimerRef.current); };
  }, [phase]);

  const inputType = classifyInput(value);
  const isValid = inputType !== null;
  const isEmail = inputType === 'email';

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    const trimmed = value.trim();
    const ok = await onSubmit(trimmed, isEmail ? 'email' : 'address');
    if (!ok) { setSubmitting(false); return; }

    setPhase('confirmed');

    // Email path: send OTP after brief confirmation display
    if (isEmail && connectWithEmail) {
      setSubmittedEmail(trimmed);
      const t = setTimeout(async () => {
        try {
          await connectWithEmail(trimmed);
          setPhase('otp');
        } catch {
          // Fall back to standard Dynamic modal if OTP send fails
          onDismiss();
          onProceed();
        }
      }, 1500);
      timerRef.current.push(t);
    } else {
      // Wallet address path: proceed to Dynamic modal after 2.5s
      const t = setTimeout(() => {
        onDismiss();
        onProceed();
      }, 2500);
      timerRef.current.push(t);
    }
  };

  // OTP digit input handler
  const handleOtpChange = (index: number, digit: string) => {
    if (verifying) return;
    // Only accept single digits
    const clean = digit.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = clean;
    setOtpDigits(next);
    setOtpError(null);

    if (clean && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits filled
    if (clean && index === 5 && next.every(d => d)) {
      setTimeout(() => handleVerifyOtp(next.join('')), 200);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const code = otpDigits.join('');
      if (code.length === 6) handleVerifyOtp(code);
    }
  };

  // Handle paste into OTP input
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = [...otpDigits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || '';
    setOtpDigits(next);
    setOtpError(null);
    // Focus last filled or next empty
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs.current[focusIdx]?.focus();
    // Auto-submit if full code pasted
    if (pasted.length === 6) {
      setTimeout(() => handleVerifyOtp(pasted), 200);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (!verifyOtp || verifying) return;
    setVerifying(true);
    setOtpError(null);
    try {
      await verifyOtp(code);
      setPhase('authenticated');
      const t = setTimeout(() => onDismiss(), 2000);
      timerRef.current.push(t);
    } catch {
      setOtpError('Invalid code. Try again.');
      setVerifying(false);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  const handleResend = async () => {
    if (!retryOtp || !canResend) return;
    setCanResend(false);
    try {
      await retryOtp();
    } catch { /* ignore */ }
    resendTimerRef.current = setTimeout(() => setCanResend(true), 30000);
  };

  // Display-friendly version of what they entered
  const displayId = submittedEmail
    ? submittedEmail
    : isEmail
      ? value.trim()
      : value ? `${value.slice(0, 6)}...${value.slice(-4)}` : '';

  // Input border color based on validation
  const borderClass = !value.trim()
    ? 'border-white/[0.08]'
    : isValid
      ? 'border-[var(--gs-lime)]/40 focus-within:border-[var(--gs-lime)]/60'
      : 'border-red-500/40';

  // Allow backdrop dismiss only during input phase
  const canDismiss = phase === 'input';

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
          onClick={(e) => { if (e.target === e.currentTarget && canDismiss) onDismiss(); }}
        >
          {/* Matrix rain background — naturally left-biased via column count */}
          <div className="absolute inset-0 overflow-hidden opacity-15 pointer-events-none select-none"
               aria-hidden="true">
            <pre className="font-mono text-[12px] leading-[18px] text-[var(--gs-lime)]">
              {matrixLines.join('\n')}
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

          {/* Content */}
          <div className="relative z-10 flex flex-col gap-3 px-8 max-w-lg w-full">
            {/* Scan lines */}
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

            {/* Title + badge after scan completes */}
            {visibleLines === SCAN_LINES.length && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="mt-6 text-center"
              >
                <div className="font-display text-3xl sm:text-4xl font-bold text-[var(--gs-lime)] tracking-wider uppercase">
                  Ready Player Zero
                </div>
                <div className="font-mono text-[9px] tracking-[0.3em] text-white/40 mt-1">
                  {subtitle}
                </div>
              </motion.div>
            )}

            {/* Phase content */}
            <AnimatePresence mode="wait">
              {/* ── INPUT PHASE ── */}
              {showInput && phase === 'input' && (
                <motion.div
                  key="input"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6"
                >
                  <div className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-2">
                    Drop your address or email to claim access
                  </div>
                  <div className="flex gap-2">
                    <div className={`relative flex-1 border bg-black/60 transition-colors ${borderClass}`}>
                      <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                        placeholder="0x... / Solana address / email"
                        className="w-full bg-transparent px-3 py-2.5 font-mono text-sm text-white/90
                          placeholder:text-white/20 outline-none"
                        spellCheck={false}
                        autoComplete="off"
                      />
                      {/* Type badge */}
                      {value.trim() && inputType && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[9px]
                          uppercase tracking-widest px-1.5 py-0.5 border border-[var(--gs-lime)]/30 text-[var(--gs-lime)]/70">
                          {isEmail ? 'Email' : inputType === 'solana' ? 'Solana' : 'GunzChain'}
                        </span>
                      )}
                    </div>
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

              {/* ── CONFIRMED PHASE ── */}
              {phase === 'confirmed' && (
                <motion.div
                  key="confirmed"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="mt-6 text-center"
                >
                  <div className="border border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.04] px-6 py-5">
                    <div className="font-mono text-[var(--gs-lime)] text-lg font-bold tracking-widest uppercase mb-2">
                      Clearance confirmed
                    </div>
                    <div className="font-mono text-[11px] text-white/50 tracking-wider mb-3">
                      {displayId} added to whitelist
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">
                        {submittedEmail ? 'Sending secure transmission...' : 'Opening secure connection...'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── OTP PHASE ── */}
              {phase === 'otp' && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 text-center"
                >
                  <div className="border border-[var(--gs-lime)]/20 bg-[var(--gs-lime)]/[0.04] px-6 py-5">
                    <div className="font-mono text-[var(--gs-lime)] text-sm font-bold tracking-widest uppercase mb-1">
                      Transmission received
                    </div>
                    <div className="font-mono text-[10px] text-white/40 tracking-wider mb-5">
                      Enter the 6&#8209;digit code sent to {submittedEmail}
                    </div>

                    {/* 6-digit OTP boxes */}
                    <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                      {otpDigits.map((digit, i) => (
                        <input
                          key={i}
                          ref={(el) => { otpRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          disabled={verifying}
                          className={`w-10 h-12 bg-black/60 border text-center font-mono text-xl text-white/90
                            outline-none transition-colors
                            disabled:opacity-50
                            ${otpError
                              ? 'border-red-500/50'
                              : 'border-white/[0.08] focus:border-[var(--gs-lime)]/60'
                            }`}
                          autoComplete="one-time-code"
                        />
                      ))}
                    </div>

                    {/* Error message */}
                    {otpError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-mono text-[10px] text-red-400 mt-3"
                      >
                        {otpError}
                      </motion.div>
                    )}

                    {/* Verifying state */}
                    {verifying && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <motion.div
                          className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)]"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                        />
                        <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">
                          Verifying...
                        </span>
                      </div>
                    )}

                    {/* Resend link */}
                    {!verifying && (
                      <div className="mt-4">
                        <button
                          onClick={handleResend}
                          disabled={!canResend}
                          className="font-mono text-[9px] uppercase tracking-widest
                            disabled:text-white/15 disabled:cursor-not-allowed
                            text-[var(--gs-lime)]/60 hover:text-[var(--gs-lime)] transition-colors"
                        >
                          {canResend ? 'Resend code' : 'Resend available in 30s'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ── AUTHENTICATED PHASE ── */}
              {phase === 'authenticated' && (
                <motion.div
                  key="authenticated"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="mt-6 text-center"
                >
                  <div className="border border-[var(--gs-lime)]/30 bg-[var(--gs-lime)]/[0.06] px-6 py-5">
                    <div className="font-mono text-[var(--gs-lime)] text-lg font-bold tracking-widest uppercase mb-2">
                      Access secured
                    </div>
                    <div className="font-mono text-[11px] text-white/50 tracking-wider mb-3">
                      Identity verified &mdash; {submittedEmail}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      />
                      <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">
                        Establishing encrypted session...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
