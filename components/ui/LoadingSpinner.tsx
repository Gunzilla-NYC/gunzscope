'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
};

export default function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        border-2 border-[var(--gs-gray-1)]
        border-t-[var(--gs-lime)]
        rounded-full
        animate-spin
        ${className}
      `}
    />
  );
}
