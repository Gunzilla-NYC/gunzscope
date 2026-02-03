'use client';

interface LoadingDotsProps {
  className?: string;
}

export default function LoadingDots({ className = '' }: LoadingDotsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 0.2, 0.4].map((delay, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[var(--gs-lime)]"
          style={{
            animation: 'bounce 0.6s ease-in-out infinite',
            animationDelay: `${delay}s`,
          }}
        />
      ))}
    </div>
  );
}
