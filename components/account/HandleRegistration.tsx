'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGsHandle } from '@/lib/hooks/useGsHandle';

const HANDLE_REGEX = /^[a-zA-Z0-9_-]{3,32}$/;
const DEBOUNCE_MS = 500;

interface HandleRegistrationProps {
  walletAddress: string;
  walletProvider: unknown;
  displayNameSuggestion?: string;
  onHandleRegistered?: (handle: string) => void;
}

function sanitizeSuggestion(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  return sanitized.length >= 3 ? sanitized : '';
}

function formatAvax(wei: bigint): string {
  const str = wei.toString();
  if (str.length <= 18) {
    const padded = str.padStart(19, '0');
    const whole = '0';
    const frac = padded.slice(0, -18 + padded.length).replace(/0+$/, '') || '0';
    return `${whole}.${frac}`;
  }
  const whole = str.slice(0, str.length - 18);
  const frac = str.slice(str.length - 18).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

export default function HandleRegistration({
  walletAddress,
  walletProvider,
  displayNameSuggestion,
  onHandleRegistered,
}: HandleRegistrationProps) {
  const {
    currentHandle,
    hasRegistered,
    changeFee,
    loadingHandle,
    checkAvailability,
    registerHandle,
    status,
    txHash,
    error,
    reset,
  } = useGsHandle(walletAddress, walletProvider);

  const [input, setInput] = useState('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-fill from suggestion when no handle exists
  useEffect(() => {
    if (!loadingHandle && !currentHandle && displayNameSuggestion && !input) {
      const sanitized = sanitizeSuggestion(displayNameSuggestion);
      if (sanitized) setInput(sanitized);
    }
  }, [loadingHandle, currentHandle, displayNameSuggestion, input]);

  // Auto-dismiss success after 3 seconds
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        reset();
        setIsEditing(false);
        setInput('');
        setIsAvailable(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, reset]);

  // Notify parent on success
  useEffect(() => {
    if (status === 'success' && currentHandle && onHandleRegistered) {
      onHandleRegistered(currentHandle);
    }
  }, [status, currentHandle, onHandleRegistered]);

  const validateAndCheck = useCallback((value: string) => {
    setIsAvailable(null);

    if (value.length === 0) {
      setValidationError(null);
      return;
    }
    if (value.length < 3) {
      setValidationError('At least 3 characters');
      return;
    }
    if (value.length > 32) {
      setValidationError('Maximum 32 characters');
      return;
    }
    if (!HANDLE_REGEX.test(value)) {
      setValidationError('Letters, numbers, underscores, hyphens only');
      return;
    }
    setValidationError(null);

    // Debounced availability check
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const available = await checkAvailability(value);
      setIsAvailable(available);
    }, DEBOUNCE_MS);
  }, [checkAvailability]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    validateAndCheck(value);
    if (error) reset();
  }, [validateAndCheck, error, reset]);

  const handleSubmit = useCallback(async () => {
    if (!HANDLE_REGEX.test(input) || isAvailable === false) return;
    await registerHandle(input);
  }, [input, isAvailable, registerHandle]);

  const isFlowActive = status !== 'idle' && status !== 'error' && status !== 'success';
  const canSubmit = HANDLE_REGEX.test(input) && isAvailable === true && !isFlowActive;

  // Show the input form: either no handle exists, or user clicked "Change"
  const showForm = !currentHandle || isEditing;

  if (loadingHandle) {
    return (
      <div className="py-4">
        <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3">
          On-Chain Identity
        </p>
        <div className="h-5 w-40 bg-white/10 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="py-0">
      <p className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-3">
        On&#8209;Chain Identity
      </p>

      {/* Current handle display */}
      {currentHandle && !isEditing && (
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm text-[var(--gs-lime)]">{currentHandle}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--gs-lime)] border border-[var(--gs-lime)]/30 px-1.5 py-0.5">
            Registered
          </span>
          <button
            onClick={() => {
              setIsEditing(true);
              setInput('');
              setIsAvailable(null);
              setValidationError(null);
              reset();
              setTimeout(() => inputRef.current?.focus(), 50);
            }}
            className="font-mono text-caption uppercase tracking-wider text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer"
          >
            Change
          </button>
        </div>
      )}

      {/* Handle input form */}
      {showForm && (
        <div>
          {/* Fee notice for changes */}
          {hasRegistered && changeFee && changeFee > BigInt(0) && (
            <p className="font-mono text-caption text-[var(--gs-warning)] mb-2">
              Changing your handle costs {formatAvax(changeFee)} AVAX
            </p>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                disabled={isFlowActive}
                placeholder="Enter a handle"
                maxLength={32}
                className="w-full px-3 py-2 bg-black/50 border border-white/10 text-sm font-mono text-[var(--gs-white)] placeholder:text-[var(--gs-gray-2)] focus:outline-none focus:border-[var(--gs-lime)]/50 transition-colors disabled:opacity-50"
              />
              {/* Availability indicator */}
              {input.length >= 3 && !validationError && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {status === 'checking' && (
                    <svg className="w-4 h-4 text-[var(--gs-gray-3)] animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {isAvailable === true && status !== 'checking' && (
                    <svg className="w-4 h-4 text-[var(--gs-profit)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isAvailable === false && status !== 'checking' && (
                    <svg className="w-4 h-4 text-[var(--gs-loss)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </span>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="shrink-0 px-4 py-2 font-display font-semibold text-sm uppercase bg-[var(--gs-lime)] text-[var(--gs-black)] hover:bg-[var(--gs-lime-hover)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              {hasRegistered ? 'Change' : 'Claim'}
            </button>
            {isEditing && (
              <button
                onClick={() => { setIsEditing(false); setInput(''); setIsAvailable(null); setValidationError(null); reset(); }}
                disabled={isFlowActive}
                className="shrink-0 px-3 py-2 font-display font-semibold text-sm uppercase border border-white/10 text-[var(--gs-gray-3)] hover:text-[var(--gs-white)] transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Validation error */}
          {validationError && (
            <p className="font-mono text-caption text-[var(--gs-loss)] mt-1.5">{validationError}</p>
          )}

          {/* Taken message */}
          {isAvailable === false && !validationError && (
            <p className="font-mono text-caption text-[var(--gs-loss)] mt-1.5">Handle is taken</p>
          )}

          {/* Flow status */}
          {isFlowActive && (
            <p className="font-mono text-caption text-[var(--gs-gray-4)] mt-1.5">
              {status === 'switching-chain' && 'Switching to Avalanche\u2026'}
              {status === 'signing' && 'Confirm in your wallet\u2026'}
              {status === 'confirming' && (
                <>
                  Confirming transaction{txHash && (
                    <> &mdash; <a href={`https://snowtrace.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[var(--gs-lime)] hover:underline">{txHash.slice(0, 10)}\u2026</a></>
                  )}
                </>
              )}
            </p>
          )}

          {/* Success */}
          {status === 'success' && (
            <p className="font-mono text-caption text-[var(--gs-profit)] mt-1.5">
              Handle registered!
            </p>
          )}

          {/* Hook error */}
          {error && (
            <p className="font-mono text-caption text-[var(--gs-loss)] mt-1.5">{error}</p>
          )}

          {/* Helper text (only when idle and no errors) */}
          {!validationError && !error && status === 'idle' && isAvailable !== false && !hasRegistered && (
            <p className="font-mono text-caption text-[var(--gs-gray-2)] mt-1.5">
              Your on&#8209;chain identity. 3&#8209;32 characters: letters, numbers, underscores, hyphens.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
