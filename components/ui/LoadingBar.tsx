'use client';

interface LoadingBarProps {
  progress?: number; // 0-100, undefined = indeterminate
  className?: string;
}

export default function LoadingBar({ progress, className = '' }: LoadingBarProps) {
  const isIndeterminate = progress === undefined;

  return (
    <div className={`h-[3px] bg-[var(--gs-dark-4)] rounded-full overflow-hidden ${className}`}>
      <div
        className={`
          h-full gradient-action rounded-full
          ${isIndeterminate ? 'animate-pulse w-1/2' : ''}
        `}
        style={!isIndeterminate ? { width: `${progress}%`, transition: 'width 0.3s ease' } : undefined}
      />
    </div>
  );
}
