'use client';

import { detectChain } from '@/lib/utils/detectChain';

interface WalletAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /**
   * Visual classes for the input: background, padding (left/vertical), text size,
   * placeholder color, border-radius, etc.
   *
   * Do NOT include border-color or right-padding — those are managed by the component.
   * If omitted, defaults to `'px-3 py-2 text-sm bg-[var(--gs-dark-3)] placeholder:text-[var(--gs-gray-2)]'`.
   */
  className?: string;
  id?: string;
  /** Show validation hint below input when address is entered but unrecognized. Default: true */
  showHint?: boolean;
  /** Inline styles for the input element (e.g. clip-path). */
  style?: React.CSSProperties;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
  /** Positioning class for the chain badge. Default: 'right-2' */
  badgeRight?: string;
  /** Right-padding class applied when badge is visible. Default: 'pr-24'. Set to '' to manage in className. */
  badgePadding?: string;
  /** When false, non-matching input won't show red border (useful when slugs/names are also valid). Default: true */
  validateChain?: boolean;
  /** Extra elements rendered inside the relative wrapper (e.g. search icon, inline button). */
  children?: React.ReactNode;
}

export function WalletAddressInput({
  value,
  onChange,
  placeholder = '0x... or Solana address',
  disabled,
  className,
  id,
  showHint = true,
  style,
  onKeyDown,
  autoFocus,
  inputRef,
  badgeRight = 'right-2',
  badgePadding = 'pr-24',
  validateChain = true,
  children,
}: WalletAddressInputProps) {
  const chain = detectChain(value);
  const hasInput = value.trim().length > 0;

  const visualClasses = className ?? 'px-3 py-2 text-sm bg-[var(--gs-dark-3)] placeholder:text-[var(--gs-gray-2)]';
  const borderClasses = validateChain && hasInput && !chain
    ? 'border-[var(--gs-loss)]/40 focus:border-[var(--gs-loss)]/60'
    : 'border-white/[0.08] focus:border-[var(--gs-lime)]/30';
  const paddingRight = chain && badgePadding ? badgePadding : '';

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          style={style}
          className={`w-full font-mono text-[var(--gs-white)] outline-none transition-colors border ${borderClasses} ${paddingRight} ${visualClasses}`}
        />
        {hasInput && chain && (
          <span className={`absolute ${badgeRight} top-1/2 -translate-y-1/2 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-sm pointer-events-none ${
            chain === 'gunzchain'
              ? 'bg-[var(--gs-profit)]/15 text-[var(--gs-profit)]'
              : 'bg-[var(--gs-purple)]/15 text-[var(--gs-purple-bright)]'
          }`}>
            {chain === 'gunzchain' ? 'GunzChain' : 'Solana'}
          </span>
        )}
        {children}
      </div>
      {showHint && validateChain && hasInput && !chain && (
        <p className="mt-1 font-mono text-[9px] text-[var(--gs-loss)]/70">
          Enter a valid GunzChain (0x...) or Solana address
        </p>
      )}
    </div>
  );
}
