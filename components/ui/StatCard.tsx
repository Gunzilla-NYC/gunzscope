'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  accentColor?: 'lime' | 'purple' | 'profit' | 'loss' | 'neutral';
  className?: string;
}

const accentColors = {
  lime: 'var(--gs-lime)',
  purple: 'var(--gs-purple)',
  profit: 'var(--gs-profit)',
  loss: 'var(--gs-loss)',
  neutral: 'var(--gs-gray-1)',
};

export default function StatCard({
  label,
  value,
  subValue,
  accentColor = 'lime',
  className = ''
}: StatCardProps) {
  return (
    <div
      className={`
        bg-[var(--gs-dark-3)]
        border border-white/[0.06]
        border-l-2
        p-4
        transition-all duration-300
        hover:border-l-[var(--gs-lime)]
        ${className}
      `}
      style={{ borderLeftColor: accentColors[accentColor] }}
    >
      <div className="font-mono text-label uppercase tracking-[1.5px] text-[var(--gs-gray-3)] mb-1">
        {label}
      </div>
      <div className="font-display text-2xl font-bold text-[var(--gs-white)]">
        {value}
      </div>
      {subValue && (
        <div className="font-mono text-data text-[var(--gs-gray-4)] mt-1">
          {subValue}
        </div>
      )}
    </div>
  );
}
