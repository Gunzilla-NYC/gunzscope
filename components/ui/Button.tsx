'use client';

import { forwardRef, ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--gs-lime)] text-black font-semibold
    hover:bg-[var(--gs-lime-hover)] hover:-translate-y-px
    hover:shadow-[0_4px_20px_rgba(166,247,0,0.3)]
    clip-corner
  `,
  secondary: `
    bg-transparent border border-[var(--gs-gray-1)] text-[var(--gs-white-dim)]
    hover:border-[var(--gs-lime)] hover:text-[var(--gs-lime)]
    clip-corner
  `,
  ghost: `
    bg-transparent border border-[var(--gs-gray-1)] text-[var(--gs-gray-3)]
    hover:border-[var(--gs-gray-3)] hover:text-[var(--gs-white)]
  `,
  danger: `
    bg-[rgba(255,68,68,0.1)] border border-[rgba(255,68,68,0.3)] text-[var(--gs-loss)]
    hover:bg-[rgba(255,68,68,0.2)]
    clip-corner
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          font-display font-semibold uppercase tracking-wider
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
