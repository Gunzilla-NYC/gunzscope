'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  accentLine?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-10',
};

export default function Card({
  children,
  className = '',
  hover = true,
  padding = 'md',
  accentLine = true
}: CardProps) {
  return (
    <div
      className={`
        group relative
        bg-[var(--gs-dark-2)]
        border border-white/[0.06]
        overflow-hidden
        ${hover ? 'transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(166,247,0,0.3)]' : ''}
        ${paddingClasses[padding]}
        ${className}
      `}
    >
      {/* Top accent line */}
      {accentLine && (
        <div
          className="absolute top-0 left-0 right-0 h-[2px] gradient-accent-line opacity-40"
          aria-hidden="true"
        />
      )}

      {/* Hover bottom bar reveal */}
      {hover && (
        <div
          className="
            absolute bottom-0 left-0 right-0 h-[2px]
            gradient-action
            opacity-0 transition-opacity duration-300
            group-hover:opacity-100
          "
          aria-hidden="true"
        />
      )}

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
