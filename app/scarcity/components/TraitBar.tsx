import { formatNumber } from '../utils';

export function TraitBar({ label, count, maxCount, color }: { label: string; count: number; maxCount: number; color: string }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="font-mono text-data text-[var(--gs-gray-4)] w-28 shrink-0 truncate">{label}</span>
      <div className="flex-1 h-4 bg-white/[0.03] overflow-hidden" style={{ clipPath: 'polygon(0 0, calc(100% - 3px) 0, 100% 3px, 100% 100%, 3px 100%, 0 calc(100% - 3px))' }}>
        <div className="h-full transition-all duration-500" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color, opacity: 0.7 }} />
      </div>
      <span className="font-mono text-data tabular-nums text-[var(--gs-gray-3)] w-16 text-right shrink-0">{formatNumber(count)}</span>
    </div>
  );
}
